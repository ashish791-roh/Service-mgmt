const fs = require('fs');
const path = require('path');

function listAll(dir) {
  try {
    const files = fs.readdirSync(dir);
    console.log('Listing:', dir);
    console.log(files);
    for (const f of files) {
      const p = path.join(dir, f);
      const s = fs.statSync(p);
      if (s.isDirectory()) {
        listAll(p);
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

listAll('C:\\Users\\pkad0\\.gemini\\antigravity-ide\\brain\\07936f1d-e6f2-4a1a-93e0-f7740471fa66\\.system_generated');
