const fs = require('fs');
const path = require('path');

try {
  console.log('Listing D:\\:');
  const files = fs.readdirSync('D:\\');
  console.log(files);
  for (const file of files) {
    try {
      const fullPath = path.join('D:\\', file);
      const stat = fs.statSync(fullPath);
      console.log(file, stat.isDirectory() ? 'DIR' : 'FILE');
    } catch (e) {
      console.error('Error stating ' + file + ':', e.message);
    }
  }
} catch (e) {
  console.error('Error listing D:\\:', e.message);
}
