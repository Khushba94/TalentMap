const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');
const dotenv = require('dotenv');
const db = require('./config/db');


dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;


// Views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));


app.use(session({
secret: process.env.SESSION_SECRET || 'keyboard cat',
resave: false,
saveUninitialized: true,
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const resumeRouter = require('./routes/resume');
const jobRouter = require('./routes/job');

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/resume', resumeRouter);
app.use('/jobs', jobRouter);

// Start server
app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});