const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\pkad0\\.gemini\\antigravity-ide\\brain\\07936f1d-e6f2-4a1a-93e0-f7740471fa66\\.system_generated\\logs\\transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(logFile),
  crlfDelay: Infinity
});

let lineNum = 0;
rl.on('line', (line) => {
  lineNum++;
  try {
    const obj = JSON.parse(line);
    console.log('Step:', lineNum, 'Source:', obj.source, 'Type:', obj.type);
    if (obj.content && obj.content.includes('MULTI_BRANCH_ARCHITECTURE.md')) {
      console.log('--- Found keyword in content ---');
      console.log(obj.content.substring(0, 500) + '...');
    }
  } catch (e) {
    console.error('Error parsing line', lineNum, e.message);
  }
});

rl.on('close', () => {
  console.log('Done reading transcript.');
});
