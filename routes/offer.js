const express = require('express');
const router = express.Router();
const db = require('../config/db');
const upload = require('../config/multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');

// GET upload page
router.get('/upload', (req, res) => {
  if (!req.session.user || req.session.user.role !== 'student') {
    return res.redirect('/auth/login');
  }
  res.render('offer/upload');
});

// POST upload
router.post('/upload', upload.single('offer_letter'), async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'student') {
    return res.status(403).send('Access denied');
  }

  const file = req.file;
  if (!file) return res.status(400).send('No file uploaded');

  let extractedText = '';

  // PDF
  if (file.mimetype === 'application/pdf') {
    const data = await pdfParse(fs.readFileSync(file.path));
    extractedText = data.text;

  // DOCX
  } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ path: file.path });
    extractedText = result.value;

  } else {
    return res.status(400).send('Unsupported file type');
  }

  // Save to DB
  await db.query(
    'INSERT INTO offer_letters (user_id, filename, text) VALUES (?, ?, ?)',
    [user.id, file.filename, extractedText]
  );

  res.redirect('/agreement/generate');
});

module.exports = router;