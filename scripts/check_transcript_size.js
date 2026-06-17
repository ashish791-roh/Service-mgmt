const fs = require('fs');

const logFile = 'C:\\Users\\pkad0\\.gemini\\antigravity-ide\\brain\\07936f1d-e6f2-4a1a-93e0-f7740471fa66\\.system_generated\\logs\\transcript.jsonl';

try {
  const stats = fs.statSync(logFile);
  console.log('Size:', stats.size);
  if (stats.size > 0) {
    const fd = fs.openSync(logFile, 'r');
    const buffer = Buffer.alloc(1000);
    fs.readSync(fd, buffer, 0, 1000, 0);
    console.log('Start of file:', buffer.toString('utf8'));
    fs.closeSync(fd);
  }
} catch (e) {
  console.error('Error:', e.message);
}
