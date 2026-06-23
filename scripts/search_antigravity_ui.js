const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\pkad0\\.gemini\\antigravity-ide\\brain';

function searchFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lower = content.toLowerCase();
    if (lower.includes('section 7') && (lower.includes('framer') || lower.includes('suspense'))) {
      // Avoid printing task.md or files we already printed
      if (filePath.endsWith('task.md') || filePath.endsWith('walkthrough.md')) {
        return;
      }
      console.log('Match found in file:', filePath);
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

console.log('Searching all files in brain directory...');
traverse(brainDir);
console.log('Search completed.');
