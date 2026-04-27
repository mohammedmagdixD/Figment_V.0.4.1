const https = require('https');
https.get('https://figmentv041.vercel.app/manifest.webmanifest', (res) => {
  console.log('manifest status:', res.statusCode);
});
https.get('https://figmentv041.vercel.app/icon-192x192.png', (res) => {
  console.log('icon status:', res.statusCode);
});
