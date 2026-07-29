const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    const code = match[1];
    try {
        new Function(code);
        console.log(`Script ${count}: OK`);
    } catch (e) {
        console.error(`Script ${count}: ERROR ->`, e.message);
    }
}
