const fs = require('fs');
const path = require('path');

async function main() {
    const pdfImg = require('pdf-img-convert');
    const pdfPath = path.join(__dirname, '..', 'assets', 'CardapioMenu', 'CARDAPIO_THE_WINE.pdf');
    const outputDir = path.join(__dirname, '..', 'assets', 'CardapioMenu', 'pages');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Converting PDF pages to high-res images...');
    const pages = await pdfImg.convert(pdfPath, { width: 1400 });
    console.log(`Total pages converted: ${pages.length}`);

    pages.forEach((img, i) => {
        const pagePath = path.join(outputDir, `page-${i + 1}.png`);
        fs.writeFileSync(pagePath, img);
        console.log(`Saved page ${i + 1} -> ${pagePath}`);
    });

    console.log('Conversion complete!');
}

main().catch(err => {
    console.error('Error converting PDF:', err);
});
