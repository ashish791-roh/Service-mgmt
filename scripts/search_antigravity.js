const fs = require('fs');
const path = require('path');

function search(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      const lowerFile = file.toLowerCase();
      if (lowerFile.includes('branch') || lowerFile.includes('multi') || lowerFile.includes('architecture') || lowerFile.includes('code')) {
        console.log('Match found:', fullPath, stat.isDirectory() ? '(DIR)' : '(FILE)');
      }
      if (stat.isDirectory()) {
        search(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

console.log('Searching C:\\Users\\pkad0\\.gemini\\antigravity-ide...');
search('C:\\Users\\pkad0\\.gemini\\antigravity-ide');
console.log('Search finished.');
