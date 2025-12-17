const express = require('express');
const router = express.Router();
const db = require('../config/db');


router.get('/create', (req,res) => {
console.log("Session user:", req.session.user);
if (!req.session.user || req.session.user.role !== 'recruiter') return res.redirect('/auth/login');
res.render('jobs/create');
});

router.post('/create', async (req,res) => {
if (!req.session.user || req.session.user.role !== 'recruiter') return res.redirect('/auth/login');
const { title, description, requirements, location } = req.body;
try {
await db.query('INSERT INTO jobs (recruiter_id, title, description, requirements, location) VALUES (?, ?, ?, ?, ?)', [req.session.user.id, title, description, requirements, location]);
res.redirect('/jobs/list');
} catch (err) {
console.error(err);
res.render('jobs/create', { error: 'Failed to create job' });
}
});


router.get('/list', async (req,res) => {
try {
const [jobs] = await db.query('SELECT j.*, u.name as recruiter_name FROM jobs j LEFT JOIN users u ON u.id=j.recruiter_id ORDER BY j.created_at DESC');
res.render('jobs/list', { jobs, user: req.session.user });
} catch (err) { console.error(err); res.sendStatus(500); }
});


module.exports = router;