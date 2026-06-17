const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\pkad0\\.gemini\\antigravity-ide\\brain';

try {
  const dirs = fs.readdirSync(brainDir);
  for (const d of dirs) {
    const logFile = path.join(brainDir, d, '.system_generated', 'logs', 'transcript.jsonl');
    try {
      const stat = fs.statSync(logFile);
      if (stat.size > 0) {
        console.log('Found non-empty transcript:', logFile, 'Size:', stat.size);
      }
    } catch (e) {
      // Ignored if file doesn't exist
    }
  }
} catch (e) {
  console.error('Error:', e.message);
}
