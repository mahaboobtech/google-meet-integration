require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing and security middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Express Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'google-meet-default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, '../public')));

// Mount API Routes
app.use('/api', apiRoutes);

// Catch-all route to serve SPA frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred on the server.'
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Website Google Meet Integration Server Running`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔑 OAuth Redirect: ${process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/api/google/callback`}`);
  console.log(`====================================================`);
});
