import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

CONFIG_PATH = 'cred/google_sheets_config.json'

# Lê o JSON unificado
with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    config = json.load(f)

# Extrai credenciais
cred_data = config["googlesheets_cred"]
sheet_data = config["googlesheets"]

# Autentica com Google
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
credentials = service_account.Credentials.from_service_account_info(cred_data, scopes=SCOPES)

# Conecta à API
service = build('sheets', 'v4', credentials=credentials)
sheet = service.spreadsheets()

# Lê os dados da planilha
result = sheet.values().get(
    spreadsheetId=sheet_data["from_spreadsheet_id"],
    range=sheet_data["range"]
).execute()

values = result.get('values', [])

# Filtra e remove duplicatas (ignora vazios)
if not values:
    print("[]")
else:
    lista = list({row[0] for row in values if row and row[0].strip()})
    print(json.dumps(lista))
