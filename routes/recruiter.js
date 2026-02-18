const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Ensure only recruiters can access
function isRecruiter(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'recruiter') {
    return res.status(403).send('Access denied');
  }
  next();
}

router.get('/resumes', isRecruiter, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT resumes.id, resumes.filename, resumes.filepath, resumes.text,
             users.name AS student_name, users.email AS student_email
      FROM resumes
      JOIN users ON resumes.user_id = users.id
      ORDER BY resumes.id DESC
    `);

    res.render('recruiter/resume_list', { resumes: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching resumes');
  }
});

module.exports = router;
