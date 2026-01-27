const multer = require('multer');
const path = require('path');

// Dynamic storage based on field name
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/other';

    if (file.fieldname === 'resume') {
      folder = 'uploads/resumes';
    } else if (file.fieldname === 'offer_letter') {
      folder = 'uploads/offerletters';
    }

    cb(null, folder);
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// File filter for both resume + offer letter
const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
};

module.exports = multer({ storage, fileFilter });