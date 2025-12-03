const express = require('express');
const routerAuth = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');


routerAuth.get('/login', (req, res) => {
  res.render('auth/login', { user: req.session.user || null });
});

routerAuth.get('/register', (req, res) => {
  res.render('auth/register', { user: req.session.user || null });
});

routerAuth.post('/register', async (req,res) => {
const { name, email, password, role } = req.body;
if (!name || !email || !password) {
  return res.render('auth/register', { error: 'All fields are required', user: null });
}
const hashed = await bcrypt.hash(password, 10);
try {
const [result] = await db.query('INSERT INTO users (NAME,email,PASSWORD,role) VALUES (?, ?, ?, ?)', [name, email, hashed, role || 'student']);
req.session.user = { id: result.insertId, name, email, role: role || 'student' };
res.redirect('/');
} catch (err) {
console.error(err);
res.render('auth/register', { error: 'Registration failed', user: null });
}
});


routerAuth.post('/login', async (req,res) => {
const { email, password } = req.body;
try {
const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
if (rows.length === 0) return res.render('auth/login', { error: 'Invalid credentials', user: req.session.user || null });
const user = rows[0];
if (!password || !user.PASSWORD) {
  console.error('Missing password or hash:', { password, hash: user.PASSWORD });
  return res.render('auth/login', { error: 'Login failed', user: null });
}
const ok = await bcrypt.compare(password, user.PASSWORD);
if (!ok) return res.render('auth/login', { error: 'Invalid credentials', user: req.session.user || null });
req.session.user = { id: user.id, name: user.NAME, email: user.email, role: user.role };
res.redirect('/');
} catch (err) {
    console.error(err);
    res.render('auth/login', { error: 'Login failed' });
    }
});


routerAuth.get('/logout', (req,res) => {
req.session.destroy(() => res.redirect('/'));
});


module.exports = routerAuth;