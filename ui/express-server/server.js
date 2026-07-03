const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// Enable gzip compression
app.use(compression());

// Add basic security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // disables CSP entirely
  })
);

// Serve static files with caching
app.use(express.static(path.join(__dirname, 'dist/notepad-app/browser'), {
  maxAge: '30d',          // cache static assets for 1 month
  etag: true,            // enable ETag headers
  lastModified: true     // enable Last-Modified headers
}));

// Serve robots.txt
app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

// Serve sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// Catch-all route for Angular (use regex in Express 5)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/notepad-app/browser/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Notepad app running on http://localhost:${PORT}`);
});
