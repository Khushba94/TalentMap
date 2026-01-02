const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fetch = require('node-fetch'); // npm install node-fetch@2

// -------------------------------
// KEYWORD WEIGHTS (INTERNAL API)
// -------------------------------

const KEYWORD_WEIGHTS = {
  javascript: 3,
  js: 3,
  node: 3,
  'node.js': 3,
  nodejs: 3,
  sql: 3,
  mysql: 3,
  react: 3,
  api: 2,
  backend: 2,
  'back-end': 2,
  frontend: 2,
  'front-end': 2,
  fullstack: 2,
  internship: 2,
  recruiter: 2,
  student: 1,
  communication: 1,
  teamwork: 1,
  leadership: 1,
  'problem-solving': 1
};

// Internal endpoint to view a weight (optional, for debugging / UI use)
router.get('/weights/:word', (req, res) => {
  const word = req.params.word.toLowerCase();
  const weight = KEYWORD_WEIGHTS[word] || 1;
  res.json({ word, weight });
});

// -------------------------------
// SYNONYM API (Datamuse) + CACHE
// -------------------------------

const synonymCache = new Map();

async function getSynonymsFromApi(word) {
  const key = word.toLowerCase();
  if (synonymCache.has(key)) return synonymCache.get(key);

  try {
    const resp = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(key)}`);
    const data = await resp.json();
    const syns = data.slice(0, 5).map(item => item.word.toLowerCase());
    synonymCache.set(key, syns);
    return syns;
  } catch (err) {
    console.error('Synonym API error for word:', word, err);
    synonymCache.set(key, []);
    return [];
  }
}

// -------------------------------
// TEXT UTILITIES
// -------------------------------

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function buildTermFrequency(words) {
  const tf = {};
  for (const w of words) {
    tf[w] = (tf[w] || 0) + 1;
  }
  return tf;
}

// -------------------------------
// ADVANCED MATCHING ENGINE
// -------------------------------

async function expandWithSynonyms(words) {
  const result = new Set(words);

  for (const w of words) {
    const syns = await getSynonymsFromApi(w);
    syns.forEach(s => result.add(s));
  }

  return Array.from(result);
}

async function scoreTextMatchAdvanced(resumeText, jobText) {
  if (!resumeText || !jobText) return 0;

  // Tokenize
  let resumeWords = tokenize(resumeText);
  let jobWords = tokenize(jobText);

  // Expand with synonyms (async)
  resumeWords = await expandWithSynonyms(resumeWords);
  jobWords = await expandWithSynonyms(jobWords);

  const resumeTF = buildTermFrequency(resumeWords);
  const jobTF = buildTermFrequency(jobWords);

  // Cosine-like similarity with keyword weights
  let numerator = 0;
  let resumeMagnitude = 0;
  let jobMagnitude = 0;

  const allWords = new Set([...Object.keys(resumeTF), ...Object.keys(jobTF)]);

  for (const w of allWords) {
    const r = resumeTF[w] || 0;
    const j = jobTF[w] || 0;

    const weight = KEYWORD_WEIGHTS[w] || 1;

    const rWeighted = r * weight;
    const jWeighted = j * weight;

    numerator += rWeighted * jWeighted;
    resumeMagnitude += rWeighted * rWeighted;
    jobMagnitude += jWeighted * jWeighted;
  }

  const denom = Math.sqrt(resumeMagnitude) * Math.sqrt(jobMagnitude) || 1;
  return numerator / denom; // roughly 0–1
}

// -------------------------------
// RUN MATCHING ENGINE
// -------------------------------

router.get('/run/:resumeId', async (req, res) => {
  const resumeId = req.params.resumeId;

  try {
    // Fetch resume
    const [[resume]] = await db.query(
      'SELECT * FROM resumes WHERE id = ?',
      [resumeId]
    );
    if (!resume) return res.status(404).send('Resume not found');

    // Delete old matches to avoid duplicates
    await db.query('DELETE FROM matches WHERE resume_id = ?', [resumeId]);

    // Fetch jobs
    const [jobs] = await db.query('SELECT * FROM jobs');

    const results = [];

    for (const job of jobs) {
      const rawScore = await scoreTextMatchAdvanced(
        resume.text || '',
        `${job.requirements || ''} ${job.description || ''}`
      );

      const score = Math.round(rawScore * 100); // 0–100%

      if (score > 0) {
        await db.query(
          'INSERT INTO matches (resume_id, job_id, score) VALUES (?, ?, ?)',
          [resumeId, job.id, score]
        );
        results.push({ job, score });
      }
    }

    // If no matches → add to waitlist (avoid duplicates)
    if (results.length === 0) {
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

    // Sort by best match
    results.sort((a, b) => b.score - a.score);

    res.render('match/result', {
      resume,
      results,
      user: req.session.user || null
    });

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// -------------------------------
// MATCH HISTORY FOR RECRUITER
// -------------------------------

router.get('/history', async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== 'recruiter') {
      return res.redirect('/auth/login');
    }

    const recruiterId = req.session.user.id;

    const [rows] = await db.query(
      `SELECT 
         m.id as match_id,
         m.score,
         r.id as resume_id,
         r.candidate_name,
         j.id as job_id,
         j.title,
         j.location,
         m.created_at
       FROM matches m
       JOIN resumes r ON m.resume_id = r.id
       JOIN jobs j ON m.job_id = j.id
       WHERE j.recruiter_id = ?
       ORDER BY m.created_at DESC`,
      [recruiterId]
    );

    res.render('match/history', {
      user: req.session.user,
      matches: rows
    });

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// -------------------------------
// AGREEMENT GENERATOR
// -------------------------------

router.post('/agreement/generate', async (req, res) => {
  try {
    const { resume_id, job_id, offer_text } = req.body;

    // Improved regex patterns
    const nameMatch = offer_text.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)+/);
    const titleMatch = offer_text.match(
      /for the role of\s+([A-Za-z\s]+?)(?=[.,\n]|$)/i
    );
    const salaryMatch = offer_text.match(
      /\$[\s]?([0-9,]+(?:\.\d+)?)/ // supports decimals
    );

    const filled = `
Employee: ${nameMatch ? nameMatch[0] : 'N/A'}
Role: ${titleMatch ? titleMatch[1].trim() : 'N/A'}
Salary: ${salaryMatch ? salaryMatch[0] : 'N/A'}
---
Original Offer:
${offer_text}
`;

    await db.query(
      'INSERT INTO agreements (resume_id, job_id, agreement_text) VALUES (?, ?, ?)',
      [resume_id, job_id, filled]
    );

    res.json({ ok: true, filled });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;