const fs = require('fs');
const path = require('path');

try {
  console.log('Listing C:\\Users\\pkad0\\.gemini\\antigravity-ide:');
  const files = fs.readdirSync('C:\\Users\\pkad0\\.gemini\\antigravity-ide');
  console.log(files);
} catch (e) {
  console.error('Error:', e.message);
}
