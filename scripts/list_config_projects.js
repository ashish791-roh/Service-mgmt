const fs = require('fs');
const path = require('path');

try {
  console.log('Listing config\\projects:');
  const files = fs.readdirSync('C:\\Users\\pkad0\\.gemini\\config\\projects');
  console.log(files);
} catch (e) {
  console.error('Error:', e.message);
}
