const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'cred/google_sheets_config.json');

async function lerPlanilha() {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();

    const sheets = google.sheets({ version: 'v4', auth: client });

    const spreadsheetId = 'SUA_PLANILHA_ID';
    const range = 'Página1!A1:E10';

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });

    const linhas = res.data.values;
    console.log(linhas);
}

lerPlanilha().catch(console.error);