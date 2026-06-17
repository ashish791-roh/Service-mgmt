const fs = require('fs');
try {
  const content = fs.readFileSync('C:\\Users\\pkad0\\.gemini\\antigravity-ide\\mcp_config.json', 'utf8');
  console.log(content);
} catch (e) {
  console.error('Error:', e.message);
}
