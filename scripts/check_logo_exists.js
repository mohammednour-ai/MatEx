const fs = require('fs');
const path = require('path');

const files = ['public/matex_logo.png', 'docs/LOGO.md'];
let missing = [];
for (const f of files) {
  if (!fs.existsSync(path.join(__dirname, '..', f))) missing.push(f);
}
if (missing.length > 0) {
  console.error('Missing required branding files:', missing.join(', '));
  process.exit(2);
}
console.log('Branding files present');
process.exit(0);
