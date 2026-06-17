const fs = require('fs');
const path = require('path');

function search(dir) {
  try {
    const files = fs.readdirSync(dir);
    console.log('Dir:', dir, 'Files count:', files.length);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (file.toLowerCase().includes('multi_branch') || file.toLowerCase() === 'code') {
        console.log('MATCH:', fullPath);
      }
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git' || file === '.next') continue;
        search(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

search('C:\\Users\\pkad0\\.gemini');
