const fs = require('fs');
const path = require('path');

try {
  console.log('Listing D:\\MyDocuments:');
  const files = fs.readdirSync('D:\\MyDocuments');
  console.log(files);
} catch (e) {
  console.error('Error listing D:\\MyDocuments:', e.message);
}
