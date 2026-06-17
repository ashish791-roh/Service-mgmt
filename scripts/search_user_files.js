const fs = require('fs');
const path = require('path');

const targets = [
  'C:\\Users\\pkad0\\Downloads',
  'C:\\Users\\pkad0\\Documents',
  'C:\\Users\\pkad0\\Desktop',
  'D:\\MyDocuments',
  'E:\\Documents',
  'E:\\Desktop',
  'F:\\Downloads',
  'F:\\Desktop'
];

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
      const lower = file.toLowerCase();
      if (lower.includes('multi_branch') || lower.includes('architecture') || lower === 'code') {
        console.log('Match found in user files:', fullPath);
      }
      if (stat.isDirectory()) {
        search(fullPath);
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

for (const target of targets) {
  console.log('Searching target:', target);
  search(target);
}
console.log('Search finished.');
