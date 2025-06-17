# Validador de Frete Mercado Livre

Este repositório contém um script Python projetado para automatizar a validação de custos de frete no Mercado Livre. Ele compara o frete cobrado pelo Mercado Livre com um frete calculado externamente, utilizando a API do Mercado Livre e integração com o Google Sheets para gerenciamento de dados. Ideal para vendedores que desejam garantir a precisão dos valores de frete em seus anúncios.

## ⚠️ Aviso Legal

Este projeto é de uso **exclusivo do autor** e está em fase de testes. 
Você **NÃO TEM permissão para copiar, clonar, distribuir ou utilizar este código ou suas ideias** em qualquer aplicação sem autorização **explícita e formal do autor**.

Apenas visualização como **portfólio pessoal** é permitida para fins de **avaliação profissional**.

Entre em contato para qualquer outro tipo de uso.

---

Desenvolvido por: Kelvin Kauan Melo Mattos
Email: kelvin03mattos@gmail.com

## Sumário

- [Funcionalidades](#funcionalidades)
- [Pré-requisitos](#pré-requisitos)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Configuração das Credenciais do Google Cloud](#configuração-das-credenciais-do-google-cloud)
- [Configuração do Arquivo `google_sheets_config.json`](#configuração-do-arquivo-google_sheets_configjson)
- [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
- [Captura de Cookies do Mercado Livre](#captura-de-cookies-do-mercado-livre)
- [Execução do Script](#execução-do-script)
- [Observações Importantes](#observações-importantes)
- [Créditos](#créditos)

## Funcionalidades

- **Validação de Frete:** Compara o frete cobrado pelo Mercado Livre com um valor de frete calculado externamente.
- **Integração com Google Sheets:** Lê IDs de anúncios (MLBs) de uma planilha e escreve os resultados da validação em outra.
- **Automação de Credenciais:** Gerencia tokens de acesso do Mercado Livre via banco de dados.
- **Captura de Cookies:** Automatiza a obtenção de cookies de autenticação do Mercado Livre para acesso seguro.

## Pré-requisitos

Antes de iniciar, certifique-se de ter os seguintes softwares instalados em seu sistema:

- [Node.js](https://nodejs.org/en/download/) (com npm)
- [Python 3.x](https://www.python.org/downloads/)
- [PostgreSQL](https://www.postgresql.org/download/) (ou outro banco de dados compatível, se adaptado o script)
- Uma conta no [Google Cloud Platform](https://cloud.google.com/) com um projeto configurado.
- Acesso a uma conta de vendedor no [Mercado Livre](https://www.mercadolivre.com.br/).

## Configuração do Ambiente

Siga os passos abaixo para configurar o ambiente de desenvolvimento:

1.  **Navegue até o diretório do script:**

    ```bash
    cd .\script\
    ```

2.  **Instale as dependências do Node.js:**

    ```bash
    npm install
    ```

3.  **Crie um ambiente virtual Python:**

    ```bash
    python -m venv venv
    ```

4.  **Ative o ambiente virtual:**

    -   **No Windows (PowerShell):**

        ```bash
        .\venv\Scripts\Activate.ps1
        ```

    -   **No Linux/macOS:**

        ```bash
        source venv/bin/activate
        ```

    Você deverá ver `(venv)` no início da sua linha de comando, indicando que o ambiente virtual está ativo.

5.  **Instale as dependências Python:**

    ```bash
    pip install -r requirements.txt
    ```

## Configuração das Credenciais do Google Cloud

Para que o script possa interagir com o Google Sheets, você precisará configurar uma conta de serviço no Google Cloud Platform e baixar as credenciais. Siga os passos:

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  No menu de navegação, vá para **IAM e administrador** > **Contas de serviço**.
3.  Clique em **Criar conta de serviço**.
4.  **Detalhes da conta de serviço:**
    -   **Nome da conta de serviço:** Insira um nome descritivo (ex: `validador-frete-ml`). Um ID e um endereço de e-mail serão gerados automaticamente.
    -   **Descrição da conta de serviço:** (Opcional) Adicione uma breve descrição.
    -   Clique em **Criar e continuar**.
5.  **Conceder a esta conta de serviço acesso ao projeto (Opcional):**
    -   Em **Selecionar um papel**, adicione o papel de **Proprietário**.
    -   Clique em **Continuar**.
6.  **Conceder aos usuários acesso a esta conta de serviço (Opcional):**
    -   Adicione seu e-mail pessoal em **Papel de usuários da conta de serviço** e **Papel de administradores da conta de serviço**.
    -   Clique em **Concluir**.
7.  De volta à página **Contas de serviço**, clique no e-mail da conta de serviço que você acabou de criar.
8.  Vá para a aba **Chaves**.
9.  Clique em **Adicionar chave** > **Criar nova chave**.
10. Selecione o tipo de chave **JSON** (Recomendado) e clique em **Criar**.

Um arquivo JSON contendo suas credenciais será baixado automaticamente. Guarde-o em um local seguro, pois ele será usado na próxima etapa.

## Configuração do Arquivo `google_sheets_config.json`

Este arquivo é crucial para a comunicação do script com suas planilhas do Google Sheets. Siga os passos para configurá-lo:

1.  **Localize o arquivo de exemplo:**

    Navegue até o diretório `script\cred\` e encontre o arquivo `google_sheets_config-EXEMPLO.json`.

2.  **Crie uma cópia:**

    Copie este arquivo e renomeie a cópia para `google_sheets_config.json` (removendo o `-EXEMPLO`).

3.  **Insira as credenciais do Google Sheets:**

    Abra o arquivo `google_sheets_config.json` e localize a chave `googlesheets_cred`. Cole todo o conteúdo do arquivo JSON de credenciais que você baixou do Google Cloud Console dentro desta chave. Certifique-se de que o conteúdo esteja entre chaves `{}`.

    *Dica: Após colar o JSON, utilize um formatador de código (como `Shift + Alt + F` em muitos editores) para organizar a hierarquia do JSON e evitar erros de sintaxe.*



4.  **Configure as informações das planilhas do Google Sheets:**

    Dentro do `google_sheets_config.json`, localize a chave `googlesheets` e preencha os seguintes campos:

    -   `from_spreadsheet_id`: Insira o ID da planilha de onde o script irá capturar os IDs dos anúncios (MLBs). O ID da planilha pode ser encontrado na URL da planilha, geralmente após `/d/` e antes de `/edit` (ex: `https://docs.google.com/spreadsheets/d/{ID_DA_PLANILHA}/edit`).

    -   `from_range`: Defina o intervalo de células da planilha `from_spreadsheet_id` que contém os MLBs. Exemplo: `Página1!A2:A`. Se o nome da página contiver espaços, use aspas simples (ex: `'Minha Página'!A2:A`). A especificação `A2:A` indica que o script deve começar a ler da linha 2 da coluna A e continuar até o final da coluna A, ignorando o cabeçalho.

    -   `to_spreadsheet_id`: Insira o ID da planilha onde os resultados (MLB, Frete Mercado Livre, Frete Calculado) serão adicionados. O ID é obtido da mesma forma que o `from_spreadsheet_id`.

    -   `to_range`: Defina o intervalo de células na planilha `to_spreadsheet_id` onde os dados serão inseridos. Exemplo: `Página1!:A:C`. Este formato permite que o script verifique se as células da linha estão ocupadas e pule para a próxima linha disponível, garantindo que os dados sejam adicionados corretamente.

5.  **Compartilhe suas planilhas com a conta de serviço:**

    É fundamental que a conta de serviço que você criou no Google Cloud tenha permissão para acessar suas planilhas. Para cada planilha (tanto a `from` quanto a `to`):

    -   Abra a planilha no Google Sheets.
    -   Clique em **Compartilhar**.
    -   Adicione o endereço de e-mail da conta de serviço (o mesmo gerado no Google Cloud Console, ex: `teste-para-documentacao@n8n-aprendendo.iam.gserviceaccount.com`).
    -   Conceda permissões de **Editor**.
    -   Clique em **Enviar**.

## Configuração do Banco de Dados

O script utiliza um banco de dados (PostgreSQL é o testado e recomendado) para armazenar o Access Token do Mercado Livre. Configure as informações de conexão no arquivo `google_sheets_config.json` (na chave `db`):

-   `ip`: Endereço IP do seu servidor de banco de dados.
-   `port`: Porta em que o PostgreSQL está rodando (geralmente `5432`).
-   `user`: Nome de usuário para acessar o banco de dados.
-   `password`: Senha do usuário do banco de dados.
-   `database`: Nome do banco de dados onde a chave de API está armazenada.
-   `table`: Caminho para a tabela que contém a chave de API do Mercado Livre (ex: `chaves_api.mercado_livre`).
-   `id_row`: O ID da linha na tabela que corresponde à chave de API específica que você deseja utilizar.

**Importante:** Certifique-se de que a autenticação do vendedor (chave de API e conta do Mercado Livre) corresponda ao anúncio que você está verificando. Caso contrário, o script pode retornar "ANÚNCIO NÃO ENCONTRADO". As chaves `tokens` e `access_token_ml` serão preenchidas automaticamente após a configuração correta do banco de dados.

## Captura de Cookies do Mercado Livre

Para que o script possa acessar os detalhes dos anúncios no Mercado Livre, ele precisa de cookies de autenticação. Siga os passos para capturá-los:

1.  **Navegue até o diretório do script (se ainda não estiver lá):**

    ```bash
    cd .\script\
    ```

2.  **Execute o comando para iniciar a captura de cookies:**

    ```bash
    npm run cookie
    ```

    Um navegador Chrome será automaticamente aberto com a página do Mercado Livre. Faça login com uma conta que tenha acesso aos anúncios que você deseja verificar. É crucial que esta conta possa visualizar os anúncios pelo MLB na aba "Anúncios".

    *Pode ser que seja solicitado um reCAPTCHA. Complete-o para prosseguir.*

3.  **Finalize a captura:**

    Após fazer login e garantir que a conta tem acesso aos anúncios, retorne ao terminal e pressione a tecla `Enter`.

    O navegador Chrome será fechado, e os cookies de autenticação necessários serão capturados e salvos.

## Execução do Script

Com todas as configurações concluídas, você está pronto para executar o script:

1.  **Navegue até o diretório do script (se ainda não estiver lá):**

    ```bash
    cd .\script\
    ```

2.  **Inicie o script:**

    ```bash
    npm start
    ```

    O script começará a processar os MLBs e a validar os fretes.

## Observações Importantes

-   Este script foi desenvolvido para funcionar em conjunto com outro script que calcula o frete, disponível em [https://github.com/RefigureYT/Calcular-Frete-Mercado-Livre.git](https://github.com/RefigureYT/Calcular-Frete-Mercado-Livre.git). Certifique-se de que este script esteja rodando no IP local `http://192.168.15.177:12345/calcular-frete` para que a funcionalidade de cálculo de frete externo seja utilizada corretamente.

## Créditos

Desenvolvido por: Kelvin Kauan Melo Mattos
Email: kelvin03mattos@gmail.com