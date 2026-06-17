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
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git' || file === '.next' || file === '.history' || file === 'AppData' || file === 'Local' || file === 'Roaming' || file === '$RECYCLE.BIN' || file === 'System Volume Information' || file === 'Windows' || file === 'Program Files' || file === 'Program Files (x86)') {
          continue;
        }
        search(fullPath);
      } else {
        const lowerFile = file.toLowerCase();
        if (lowerFile.endsWith('.ts') || lowerFile.endsWith('.tsx') || lowerFile.endsWith('.md') || lowerFile.endsWith('.prisma') || lowerFile.endsWith('.js')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('applyDirectivesLocally') || content.includes('SyncOutbox') || content.includes('SyncOutboxLedger') || content.includes('ConfigDirective')) {
              console.log('Found file containing sync content:', fullPath);
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    // Ignore permission errors
  }
}

const drives = ['D:\\', 'E:\\', 'F:\\'];
for (const drive of drives) {
  console.log('Searching drive for sync keywords:', drive);
  search(drive);
}
console.log('Search finished.');
