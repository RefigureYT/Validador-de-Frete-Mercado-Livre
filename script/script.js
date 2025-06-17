const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { spawnSync } = require('child_process');
const { google } = require('googleapis');
const puppeteer = require('puppeteer');
const { Console } = require('console');

let browser, page;

const iniciarScraperFrete = async () => {
    const cookiesPath = path.join(__dirname, 'cookies', 'state_mercadolivre.json');

    browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    page = await browser.newPage();

    // Restaura sessão
    await restaurarSessao(page, cookiesPath);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const restaurarSessao = async (page, caminhoJson) => {
    const session = JSON.parse(fs.readFileSync(caminhoJson, 'utf-8'));

    await page.setCookie(...session.cookies);

    await page.goto('https://www.mercadolivre.com.br', { waitUntil: 'domcontentloaded' });

    await page.evaluate((local, session) => {
        for (const key in local) {
            localStorage.setItem(key, local[key]);
        }
        for (const key in session) {
            sessionStorage.setItem(key, session[key]);
        }
    }, session.localStorage, session.sessionStorage);

    console.log("🔄 Sessão restaurada com sucesso!");
};

const capturarFreteViaPuppeteer = async (mlb) => {
    try {
        const url = `https://www.mercadolivre.com.br/anuncios/lista?search=${mlb}`;
        const seletorBase = `#shipping-${mlb}`;
        const seletor404 = "#app-root-wrapper > div.listing-page > div.sc-listing-page > div.sc-list-main-view > div.sc-empty-view > div > h2";

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await delay(1000);

        // Verifica se o shipping existe
        const shippingExiste = await page.$(seletorBase);

        if (shippingExiste) {
            await page.waitForFunction(
                (sel) => {
                    const el = document.querySelector(sel);
                    return el && el.innerText && el.innerText.trim().length > 0;
                },
                { timeout: 5000 },
                seletorBase
            );

            const textoCompleto = await page.$eval(seletorBase, el => el.textContent.replace(/\s+/g, ''));

            console.log(`📦 Texto bruto capturado: ${textoCompleto}`);

            if (textoCompleto.toLowerCase().includes("envioporcontadocomprador")) {
                console.log("🚚 Valor de frete extraído: Envio por conta do comprador");
                return "Envio por conta do comprador";
            }

            const match = textoCompleto.match(/(\d+,\d{2})/);
            const valor = match ? match[1] : null;

            console.log(`🚚 Valor de frete extraído: ${valor}`);

            // Salvar cookies atualizados
            const cookiesAtualizados = await page.cookies();
            const cookiesPath = path.join(__dirname, 'cookies', 'cookies_mercadolivre.json');
            fs.writeFileSync(cookiesPath, JSON.stringify(cookiesAtualizados, null, 2));
            console.log(`💾 Cookies atualizados salvos após acessar ${mlb}`);

            // Salvar localStorage e sessionStorage atualizados
            const estadoAtual = await page.evaluate(() => ({
                localStorage: Object.fromEntries(Object.entries(localStorage)),
                sessionStorage: Object.fromEntries(Object.entries(sessionStorage))
            }));
            const fullStatePath = path.join(__dirname, 'cookies', 'state_mercadolivre.json');
            fs.writeFileSync(fullStatePath, JSON.stringify({
                cookies: cookiesAtualizados,
                localStorage: estadoAtual.localStorage,
                sessionStorage: estadoAtual.sessionStorage
            }, null, 2));
            console.log(`💾 Sessão completa atualizada em: ${fullStatePath}`);

            return valor;
        } else {
            const texto404 = await page.$eval(seletor404, el => el.innerText).catch(() => null);
            if (texto404 && texto404.includes("Não há nada aqui")) {
                return "ANÚNCIO NÃO ENCONTRADO";
            } else {
                throw new Error("Seletor de frete não encontrado e não é 404");
            }
        }
    } catch (err) {
        console.error(`❌ Erro ao capturar frete para ${mlb}:`, err.message);
        return null;
    }
};


const encerrarScraperFrete = async () => {
    if (browser) {
        await browser.close();
        console.log("🔴 Puppeteer encerrado.");
    }
    console.log("FINALIZANDO SCRIPT 🔒");
    process.exit(0); // Encerra o nodejs
};

// Função para capturar a chave do Mercado Livre no Postgres
// Automaticamente ele já atualiza a chave dentro do JSON
async function atualizarChaveToken() {
    const CONFIG_PATH = path.join(__dirname, 'cred/google_sheets_config.json');

    // 1. Carrega o JSON
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const db = config.db;

    const client = new Client({
        host: db.ip,
        port: db.port,
        user: db.user,
        password: db.password,
        database: db.database
    });

    try {
        await client.connect();

        const query = `SELECT access_token FROM ${db.table} WHERE id = $1 LIMIT 1`;
        const res = await client.query(query, [db.id_row]);

        if (res.rows.length > 0) {
            const token = res.rows[0].access_token;

            // 2. Atualiza o valor no JSON carregado
            config.tokens.access_token_ml = token;

            // 3. Salva de volta no arquivo
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');

            console.log('✅ Token atualizado com sucesso no JSON!');
            return token;
        } else {
            console.warn('⚠️ Nenhum token encontrado no banco para id =', db.id_row);
            return null;
        }
    } catch (err) {
        console.error('❌ Erro ao buscar token:', err.message);
        return null;
    } finally {
        await client.end();
    }
}

// Essa função chama o Python que captura os MLBs através da API do Google Sheets
function chamarPython() {
    const result = spawnSync('python', ['ler_planilha.py'], { encoding: 'utf-8' });

    if (result.error) {
        console.error('Erro ao executar o script Python:', result.error);
        return [];
    }

    try {
        const lista = JSON.parse(result.stdout.trim());
        return lista;
    } catch (err) {
        console.error('Erro ao interpretar JSON retornado pelo Python:', err.message);
        console.error('Saída recebida:', result.stdout);
        return [];
    }
}

// Faz a requisição para a API do Mercado Livre para saber as dimensões e peso do produto
async function req(id, token) {
    const url = `https://api.mercadolibre.com/items/${id}/` // Endpoint da API do Mercado Livre (GET)

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status == 401) {
            console.warn('⚠️ Token expirado ou inválido (401)');
            // DAqui a aspodjapsdjaoalkaml eu faço aa alsdkmaldna d ´lógica de pegar outro tokne
            return null;
        }

        if (!res.ok) {
            throw new Error(`Erro na requisição: ${res.status} ${res.statusText}`)
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error('❌ Erro ao fazer requisição:', err.message);
        return null;
    }
}

// Faz requisição para Calcular o Frete do Mercado Livre
// Faz requisição para Calcular o Frete do Mercado Livre
async function calcularFrete(dimensoes, price) {
    const url = 'http://192.168.15.177:12345/calcular-frete';
    const body = {
        dimension: dimensoes,
        price: price,
        full: true
    };

    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error('❌ Erro na requisição:', err.message);
        return null; // Para o try externo saber que falhou
    }
}

// Essa função ela verifica se dentro de attributes (json) contém as informações do peso e dimensões
function verificarDimensoes(attributes) {
    const chavesNecessarias = [
        "PACKAGE_HEIGHT",
        "PACKAGE_WIDTH",
        "PACKAGE_LENGTH",
        "PACKAGE_WEIGHT"
    ];

    // Extrai todos os ids presentes
    const idsPresentes = attributes.map(attr => attr.id);

    // Verifica se TODAS as chaves estão presentes
    return chavesNecessarias.every(chave => idsPresentes.includes(chave));
}

async function addSheetsSemFrete(valores) {
    const dirJson = path.join(__dirname, 'cred/google_sheets_config.json');
    const config = JSON.parse(fs.readFileSync(dirJson, 'utf-8'));

    const credentials = config.googlesheets_cred;
    const sheetId = config.googlesheets.to_spreadsheet_id;
    const rangeDestino = config.googlesheets.to_range;

    const auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const leitura = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: rangeDestino,
        });

        const linhas = leitura.data.values || [];
        let linhaAlvo = -1;

        // 1. Verifica se o ID já existe na coluna A
        for (let i = 0; i < linhas.length; i++) {
            const idExistente = linhas[i]?.[0]?.trim();
            if (idExistente === valores[0]) {
                linhaAlvo = i;
                break;
            }
        }

        // 2. Se não encontrou, procura a primeira linha completamente vazia
        if (linhaAlvo === -1) {
            for (let i = 0; i < linhas.length; i++) {
                const a = linhas[i]?.[0]?.trim() || "";
                const b = linhas[i]?.[1]?.trim() || "";
                const c = linhas[i]?.[2]?.trim() || "";
                if (a === "" && b === "" && c === "") {
                    linhaAlvo = i;
                    break;
                }
            }

            // 3. Se nenhuma vazia foi encontrada, adiciona no final
            if (linhaAlvo === -1) {
                linhaAlvo = linhas.length;
            }
        }

        const abaDestino = config.googlesheets.to_range.split('!')[0];
        const destino = `${abaDestino}!A${linhaAlvo + 1}:C${linhaAlvo + 1}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: destino,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [valores],
            },
        });

        // console.log(`✅ Valores adicionados/sobrescritos na linha ${linhaAlvo + 1}:`, valores);
    } catch (err) {
        console.error("❌ Erro ao adicionar dados na planilha:", err.message);
    }
}

// Essa função faz retorna o valor pronto para enviar para API e saber o frete real.
function formatarDimensoes(attributes) {
    const buscarValor = (id) => {
        const attr = attributes.find(a => a.id === id);
        if (!attr?.value_name) return null;

        // Remove "cm" e "g", vírgulas etc.
        return attr.value_name
            .replace(/cm|g/g, '')   // remove unidades
            .replace(',', '.')     // troca vírgula por ponto, se houver
            .trim();
    };

    const altura = buscarValor("PACKAGE_HEIGHT");
    const largura = buscarValor("PACKAGE_WIDTH");
    const comprimento = buscarValor("PACKAGE_LENGTH");
    const peso = buscarValor("PACKAGE_WEIGHT");

    if (!altura || !largura || !comprimento || !peso) {
        return null;
    }

    return `${altura}x${largura}x${comprimento},${peso}`;
}

(async () => {
    const inicio = Date.now();
    await iniciarScraperFrete();
    await atualizarChaveToken();
    const dirJson = path.join(__dirname, 'cred/google_sheets_config.json');
    const config = JSON.parse(fs.readFileSync(dirJson, 'utf-8'));

    // Exemplo de uso
    const mlbIDs = chamarPython();

    console.log(`📰 Total de anúncios: ${mlbIDs.length}`);
    for (const anuncio of mlbIDs) {
        console.log('⏳ Verificando: ', anuncio);

        try {
            const response = await req(anuncio, config.tokens.access_token_ml);

            if (verificarDimensoes(response.attributes)) {
                console.log("✅ Todas as dimensões estão presentes.");
                const dimensoesFormatadas = formatarDimensoes(response.attributes);
                let freteResponse;
                console.log("📦 Dimensões e peso:", dimensoesFormatadas, "Preço: ", response.price);

                // Captura o valor do frete diretamente da página
                const valorFreteCapturado = await capturarFreteViaPuppeteer(anuncio);

                if ((valorFreteCapturado || "").toLowerCase().includes("envio por conta do comprador")) {
                    console.log(`Frete capturado para ${anuncio}: ${valorFreteCapturado}`);
                    await addSheetsSemFrete([anuncio, "Envio por conta do comprador", "Envio por conta do comprador"]);
                    continue;
                }


                try {
                    console.log("Dimensões: ", dimensoesFormatadas, "Preço: ", response.price);
                    freteResponse = await calcularFrete(dimensoesFormatadas, response.price);
                    if (!freteResponse || freteResponse.freteCalculado === undefined) {
                        throw new Error("Falha na requisição do frete");
                    }

                    const data = freteResponse;
                    const freteCalculado = data.freteCalculado;

                    console.log(`Frete capturado para ${anuncio}: ${valorFreteCapturado}`);
                    console.log("✅ Resposta da API:", data);

                    await addSheetsSemFrete([anuncio, valorFreteCapturado, freteCalculado]);
                } catch (err) {
                    console.log("Resposta da requisição: ", freteResponse);
                    console.error("❌ Erro ao calcular o frete:", err.message);
                    await addSheetsSemFrete([anuncio, dimensoesFormatadas, "❌ Erro ao calcular o frete"]);
                }

            } else {
                console.warn("⚠️ Faltam uma ou mais dimensões no anúncio.");
                await addSheetsSemFrete([anuncio, "⚠️ Faltam uma ou mais dimensões no anúncio.", "⚠️ Faltam uma ou mais dimensões no anúncio."]);
            }
        } catch (err) {
            console.error(`❌ Erro ao verificar o anúncio ${anuncio}:`, err.message);
        }
    }
    const duracao = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`✅ Script finalizado em ${duracao} segundos.`);
    console.log(`📰 Total de anúncios processados: ${mlbIDs.length}`);
    await encerrarScraperFrete();
})();