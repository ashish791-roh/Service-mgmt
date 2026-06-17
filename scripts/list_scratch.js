const fs = require('fs');
const path = require('path');

try {
  console.log('Listing C:\\Users\\pkad0\\.gemini\\antigravity-ide\\scratch:');
  const files = fs.readdirSync('C:\\Users\\pkad0\\.gemini\\antigravity-ide\\scratch');
  console.log(files);
} catch (e) {
  console.error('Error:', e.message);
}
