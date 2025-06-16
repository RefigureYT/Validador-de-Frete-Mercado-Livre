const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Função auxiliar para aguardar ENTER
function aguardarEnter(mensagem) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(mensagem, () => {
            rl.close();
            resolve();
        });
    });
}

(async () => {
    // Cria pasta "cookies" se não existir
    const cookiesDir = path.join(__dirname, 'cookies');
    if (!fs.existsSync(cookiesDir)) {
        fs.mkdirSync(cookiesDir);
    }

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage();
    await page.goto('https://www.mercadolivre.com.br/');

    console.log("🔐 Acesse sua conta do Mercado Livre no navegador que foi aberto.");
    await aguardarEnter("📌 Após o login, pressione [ENTER] aqui no terminal para capturar os cookies...");

    const cookies = await page.cookies();

    const cookiesPath = path.join(cookiesDir, 'cookies_mercadolivre.json');
    fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));

    console.log(`✅ Cookies salvos com sucesso em: ${cookiesPath}`);

    await browser.close();
})();
