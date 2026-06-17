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
      if (lowerFile.includes('multi_branch') || lowerFile.includes('architecture') || lowerFile === 'code') {
        console.log('Found in plugins:', fullPath);
      }
      if (stat.isDirectory()) {
        search(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

console.log('Searching plugins...');
search('C:\\Users\\pkad0\\.gemini\\antigravity-ide\\plugins');
console.log('Search finished.');
