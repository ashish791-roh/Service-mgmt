const fs = require('fs');
const path = require('path');

const convDir = 'C:\\Users\\pkad0\\.gemini\\antigravity-ide\\conversations';

function searchFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lower = content.toLowerCase();
    if (lower.includes('section 7') && (lower.includes('framer') || lower.includes('suspense'))) {
      console.log('Match found in conversation file:', filePath);
      const index = lower.indexOf('section 7');
      console.log('--- CONTENT START ---');
      console.log(content.substring(Math.max(0, index - 200), index + 6000));
      console.log('--- CONTENT END ---');
    }
  } catch (e) {
    // ignore
  }
}

function traverse(dir) {
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
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else {
        searchFile(fullPath);
      }
    }
  } catch (e) {
    // ignore
  }
}

console.log('Searching all files in conversations directory...');
traverse(convDir);
console.log('Search completed.');
