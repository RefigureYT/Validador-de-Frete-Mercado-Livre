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
    await aguardarEnter("📌 Após o login, pressione [ENTER] aqui no terminal para capturar os dados da sessão...");

    // Captura cookies
    const cookies = await page.cookies();

    // Captura localStorage e sessionStorage
    const localStorageData = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        return data;
    });

    const sessionStorageData = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data[key] = sessionStorage.getItem(key);
        }
        return data;
    });

    // Salva tudo em um único JSON
    const fullSession = {
        cookies,
        localStorage: localStorageData,
        sessionStorage: sessionStorageData
    };

    const sessionPath = path.join(cookiesDir, 'state_mercadolivre.json');
    fs.writeFileSync(sessionPath, JSON.stringify(fullSession, null, 2));

    console.log(`✅ Sessão salva com sucesso em: ${sessionPath}`);

    await browser.close();
})();
