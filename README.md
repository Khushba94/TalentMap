# TalentMap

**TalentMap** is a full-stack web application designed to streamline the internship and early-career recruitment process. It enables students to upload resumes and offer letters, while recruiters can post jobs and access candidate documents. A key feature is the **Automated Internship Agreement Generator**, which extracts structured data from offer letters to generate pre-filled agreements—saving time and reducing manual errors.

## ✨ Features

- 📄 **Resume Upload & Parsing** – Students upload resumes (PDF/DOCX); PDFs are parsed for recruiter preview.
- 📬 **Offer Letter Upload** – Recruiters upload offer letters linked to student profiles.
- 📝 **Automated Agreement Generator** – Generates internship agreements using extracted offer letter data.
- 💼 **Job Posting & Management** – Recruiters can create, edit, and manage job listings.
- 🔐 **Role-Based Access** – Secure login with separate dashboards for students and recruiters.
- 📱 **Responsive UI** – Built with Bootstrap and EJS for a clean, mobile-friendly interface.

## 🛠 Tech Stack

| Layer              | Tools & Technologies                          |
|--------------------|-----------------------------------------------|
| Frontend           | HTML, CSS, Bootstrap, JavaScript, EJS         |
| Backend            | Node.js, Express.js                           |
| Database           | MySQL, phpMyAdmin                             |
| File Handling      | Multer, pdf-parse, pdf-lib                    |
| Dev Environment    | XAMPP, Visual Studio Code                     |

## 📁 Project Structure
TalentMap/
├── app.js
├── /routes/           # Express route handlers
├── /views/            # EJS templates
├── /uploads/          # Uploaded resumes and offer letters
├── /generated/        # Auto-generated agreements
├── /templates/        # Agreement template PDF
├── /config/           # DB and session config
├── /public/           # Static assets (CSS, images)
├── /database/
│   └── talentmap_schema.sql  # MySQL schema
└── package.json

## ⚙️ Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/Khushba94/TalentMap.git
   cd TalentMap
   
2. **Install dependencies**
   npm install

3. **Configure environment variables**
  Create a .env file in the root directory:
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=yourpassword
    DB_NAME=talentmap
    SESSION_SECRET=your-secret-key
    UPLOAD_DIR=uploads
    PORT=3000

4. **Set up the database**
   Start MySQL using XAMPP or your preferred method.
   Import the schema: mysql -u root -p talentmap < database/talentmap_schema.sql

5. **Run the application**
   node app.js
   Visit http://localhost:3000 in your browser.

📌 Notes
  DOCX files are stored but not parsed for preview.
  Agreement generation depends on consistent offer letter formatting.
  Admin features and AI-based job matching are planned for future versions.

📄 License
  This project is for educational purposes as part of the Certificate in Software Development (MCSD51) at Future Skills Academy.
