const mysql = require('mysql2');
const dotenv = require('dotenv');
dotenv.config();

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "talentmap"
});

const db = conn.promise(); 

conn.connect((err) => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Database connected');
});

module.exports = db;