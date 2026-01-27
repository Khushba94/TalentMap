const express = require('express');
const router = express.Router();   // ✅ define router
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const db = require('../config/db');
const { htmlToText } = require('html-to-text');
const upload = require('../config/multer');

// Ensure upload directory exists
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// GET route to show upload form
router.get('/upload', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  res.render('resume/upload');
});

// POST route to handle resume upload
router.post('/upload', upload.single('resume'), async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const file = req.file;
  let text = '';
  try {
    if (file.mimetype === 'application/pdf') {
      const data = fs.readFileSync(file.path);
      const pdf = await pdfParse(data);
      text = pdf.text;
    } else {
      // For .docx and others, store raw file name and attempt basic extraction
      // Future improvement: use mammoth or docx parser
      text = `Uploaded file: ${file.originalname}`;
    }

    await db.query(
      'INSERT INTO resumes (user_id, filename, filepath, text) VALUES (?, ?, ?, ?)',
      [req.session.user.id, file.filename, file.path, text]
    );

    res.render('resume/success', { message: 'Resume uploaded and parsed' });
  } catch (err) {
    console.error(err);
    res.render('resume/upload', { error: 'Failed to process resume' });
  }
});

module.exports = router;