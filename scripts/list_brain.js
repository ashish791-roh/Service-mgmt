const fs = require('fs');
const path = require('path');

try {
  console.log('Listing brain:');
  const files = fs.readdirSync('C:\\Users\\pkad0\\.gemini\\antigravity-ide\\brain');
  console.log(files);
} catch (e) {
  console.error('Error:', e.message);
}
