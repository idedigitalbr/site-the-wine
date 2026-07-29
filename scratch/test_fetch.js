const http = require('http');

http.get('http://localhost:8085/index.html', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Fetched index.html length:', data.length);
        const hasButton = data.includes('trigger-menu-modal');
        const hasModal = data.includes('id="menuModal"');
        const hasOpenFunc = data.includes('function openMenuModal');
        console.log('Has button:', hasButton);
        console.log('Has modal:', hasModal);
        console.log('Has openMenuModal:', hasOpenFunc);
    });
}).on('error', err => console.error('Error:', err.message));
