const express = require('express');
const router = express.Router();
const db = require('../config/db');

// simple keyword weights
const KEYWORD_WEIGHTS = {
  javascript: 3,
  node: 3,
  sql: 3,
  react: 3,
  api: 2,
  backend: 2,
  frontend: 2,
  internship: 2
};

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildTF(words) {
  const tf = {};
  for (const w of words) tf[w] = (tf[w] || 0) + 1;
  return tf;
}

function scoreText(resumeText, jobText) {
  if (!resumeText || !jobText) return 0;

  const rWords = tokenize(resumeText);
  const jWords = tokenize(jobText);

  const rTF = buildTF(rWords);
  const jTF = buildTF(jWords);

  let numerator = 0;
  let rMag = 0;
  let jMag = 0;

  const allWords = new Set([...Object.keys(rTF), ...Object.keys(jTF)]);
  for (const w of allWords) {
    const r = rTF[w] || 0;
    const j = jTF[w] || 0;
    const weight = KEYWORD_WEIGHTS[w] || 1;

    const rw = r * weight;
    const jw = j * weight;

    numerator += rw * jw;
    rMag += rw * rw;
    jMag += jw * jw;
  }

  const denom = Math.sqrt(rMag) * Math.sqrt(jMag) || 1;
  return numerator / denom;
}

// Run matching for a resume
router.get('/run/:resumeId', async (req, res) => {
  const resumeId = req.params.resumeId;

  const [[resume]] = await db.query(
    'SELECT * FROM resumes WHERE id = ?',
    [resumeId]
  );
  if (!resume) return res.status(404).send('Resume not found');

  await db.query('DELETE FROM matches WHERE resume_id = ?', [resumeId]);

  const [jobs] = await db.query('SELECT * FROM jobs');
  const results = [];

  for (const job of jobs) {
    const rawScore = scoreText(
      resume.text || '',
      `${job.requirements || ''} ${job.description || ''}`
    );
    const score = Math.round(rawScore * 100);

    if (score > 0) {
      await db.query(
        'INSERT INTO matches (resume_id, job_id, score) VALUES (?, ?, ?)',
        [resumeId, job.id, score]
      );
      results.push({ job, score });
    }
  }

  if (!results.length) {
    const [[existing]] = await db.query(
      'SELECT * FROM waitlist WHERE resume_id = ?',
      [resumeId]
    );
    if (!existing) {
      await db.query(
        'INSERT INTO waitlist (resume_id, reason) VALUES (?, ?)',
        [resumeId, 'No match found']
      );
    }
    return res.render('match/nomatch', { resume });
  }

  results.sort((a, b) => b.score - a.score);
  res.render('match/result', { resume, results });
});

// Recruiter: view matched candidates
router.get('/history', async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'recruiter') {
    return res.status(403).send('Access denied');
  }

  const [rows] = await db.query(
    `SELECT 
       m.score,
       r.id AS resume_id,
       j.id AS job_id,
       j.title,
       j.location,
       m.matched_at
     FROM matches m
     JOIN resumes r ON m.resume_id = r.id
     JOIN jobs j ON m.job_id = j.id
     WHERE j.recruiter_id = ?
     ORDER BY m.matched_at DESC`,
    [user.id]
  );

  res.render('match/history', { matches: rows });
});

module.exports = router;