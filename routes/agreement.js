const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// Helper function to extract fields
function extract(pattern, text) {
  const match = text.match(pattern);
  return match ? match[1].trim() : "N/A";
}

router.get('/generate', async (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'student') {
    return res.status(403).send("Access denied");
  }

  // Get latest offer letter
  const [[offer]] = await db.query(
    "SELECT * FROM offer_letters WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [user.id]
  );

  if (!offer) return res.send("No offer letter found.");

  const text = offer.text;

  // Extract fields from offer letter
  // Student Name & Job Title
  const studentMatch = text.match(/Student Name & Job Title:\s*(.*)/i);
  let studentName = "N/A";
  let internPosition = "N/A";
  if (studentMatch) {
    const parts = studentMatch[1].split(',');
    studentName = parts[0]?.trim() || "N/A";
    internPosition = parts[1]?.trim() || "N/A";
  }

  // Company Name & Address
  const companyMatch = text.match(/Company Name and Address:\s*([\s\S]*?)\n\s*Supervisor Detail:/i);
  let companyName = "N/A";
  let companyAddress = "N/A";
  if (companyMatch) {
    const lines = companyMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
    companyName = lines[0] || "N/A";
    companyAddress = lines[1] || "N/A";
  }

  // Supervisor Details
  const supervisorMatch = text.match(/Supervisor Detail:\s*([\s\S]*?)\n\s*Internship Period:/i);
  let supervisorName = "N/A";
  let supervisorEmail = "N/A";
  let supervisorPhone = "N/A";
  if (supervisorMatch) {
    const lines = supervisorMatch[1].split('\n').map(l => l.trim()).filter(Boolean);
    supervisorName = lines[0] || "N/A";
    supervisorPhone = lines[2] || "N/A";
    supervisorEmail = lines[3] || "N/A";
  }

  // Internship Dates & Hours
  const startDate = extract(/Start Date:\s*(.*)/i, text);
  const endDate = extract(/End Date:\s*(.*)/i, text);
  const workingHours = extract(/Working Hours:\s*(.*)/i, text);


  // Load PDF template
  const templatePath = path.join(__dirname, "../templates/agreement_template.pdf");
  const existingPdfBytes = fs.readFileSync(templatePath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  form.getTextField("studentName").setText(studentName);
  form.getTextField("companyName").setText(companyName);
  form.getTextField("internPosition").setText(internPosition);
  form.getTextField("startDate").setText(startDate);
  form.getTextField("endDate").setText(endDate);
  form.getTextField("supervisorName").setText(supervisorName);
  form.getTextField("supervisorEmail").setText(supervisorEmail);
  form.getTextField("supervisorPhone").setText(supervisorPhone);
  form.getTextField("companyAddress").setText(companyAddress);
  form.getTextField("workHours").setText(workingHours);

  // Save filled PDF
  const pdfBytes = await pdfDoc.save();

  const outputPath = path.join(
    __dirname,
    "../generated/agreement_" + user.id + ".pdf"
  );

  fs.writeFileSync(outputPath, pdfBytes);

  // Show download button
  res.render("agreement/download", {
    filePath: "/generated/agreement_" + user.id + ".pdf"
  });
});

module.exports = router;