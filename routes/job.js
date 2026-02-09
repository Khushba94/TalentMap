const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET create job form
router.get('/create', (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'recruiter') {
    return res.redirect('/auth/login');
  }
  res.render('jobs/create');
});

// POST create job
router.post('/create', async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'recruiter') {
    return res.status(403).send('Access denied');
  }

  const { title, description, requirements, location } = req.body;

  await db.query(
    'INSERT INTO jobs (recruiter_id, title, description, requirements, location) VALUES (?, ?, ?, ?, ?)',
    [user.id, title, description, requirements, location]
  );

  res.redirect('/jobs/list');
});

// GET edit job form
router.get('/edit/:id', async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'recruiter') {
    return res.redirect('/auth/login');
  }

  const jobId = req.params.id;
  const [[job]] = await db.query(
    'SELECT * FROM jobs WHERE id = ? AND recruiter_id = ?',
    [jobId, user.id]
  );

  if (!job) return res.status(404).send('Job not found or unauthorized');

  res.render('jobs/edit', { job });
});

// POST update job
router.post('/edit/:id', async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'recruiter') {
    return res.status(403).send('Access denied');
  }

  const jobId = req.params.id;
  const { title, description, requirements, location } = req.body;

  await db.query(
    'UPDATE jobs SET title = ?, description = ?, requirements = ?, location = ? WHERE id = ? AND recruiter_id = ?',
    [title, description, requirements, location, jobId, user.id]
  );

  res.redirect('/jobs/list');
});

// DELETE job
router.post('/delete/:id', async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'recruiter') {
    return res.status(403).send('Access denied');
  }

  const jobId = req.params.id;

  await db.query(
    'DELETE FROM jobs WHERE id = ? AND recruiter_id = ?',
    [jobId, user.id]
  );

  res.redirect('/jobs/list');
});

// List all jobs
router.get('/list', async (req, res) => {
  const [jobs] = await db.query('SELECT * FROM jobs ORDER BY created_at DESC');
  res.render('jobs/list', { jobs });
});

// Job details
router.get('/details/:id', async (req, res) => {
  const jobId = req.params.id;

  const [[job]] = await db.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
  if (!job) return res.status(404).send('Job not found');

  const [[recruiter]] = await db.query(
    'SELECT name FROM users WHERE id = ?',
    [job.recruiter_id]
  );

  res.render('jobs/details', {
    job,
    recruiter: recruiter || { name: 'Unknown' }
  });
});

module.exports = router;