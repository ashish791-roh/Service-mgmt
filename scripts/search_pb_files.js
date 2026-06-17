const fs = require('fs');
const path = require('path');

const convDir = 'C:\\Users\\pkad0\\.gemini\\antigravity-ide\\conversations';

try {
  const files = fs.readdirSync(convDir);
  for (const file of files) {
    if (!file.endsWith('.pb')) continue;
    const fullPath = path.join(convDir, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('applyDirectivesLocally') || content.includes('MULTI_BRANCH_ARCHITECTURE.md') || content.includes('branch-sync-schema.prisma')) {
        console.log('Found matching conversation PB:', file);
      }
    } catch (e) {
      console.error('Error reading ' + file + ':', e.message);
    }
  }
} catch (e) {
  console.error('Error listing conversations:', e.message);
}
