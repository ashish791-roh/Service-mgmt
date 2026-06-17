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
      console.log('Knowledge file/dir:', fullPath);
      if (stat.isDirectory()) {
        search(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

console.log('Searching knowledge directory...');
search('C:\\Users\\pkad0\\.gemini\\antigravity-ide\\knowledge');
console.log('Search finished.');
