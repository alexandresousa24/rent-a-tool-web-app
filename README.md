# Rent-a-Tool · Incremento 1 (MAS)

Aplicação web do projeto **Rent-a-Tool**, plataforma P2P de aluguer de
ferramentas de bricolage e jardim. Este repositório corresponde ao
**Incremento 1** do desenvolvimento incremental, alinhado com o 1º Épico
definido no SRS (iter 3):

> "Um arrendatário cria conta no site e arrenda uma ferramenta."

## Casos de utilização cobertos

| UC    | Descrição                                  | Implementado |
|-------|--------------------------------------------|--------------|
| UC-01 | Criar conta no site (com KYC simulado)     | ✅            |
| UC-03 | Procurar ferramentas (filtros, ordenação)  | ✅            |
| UC-04 | Contactar o proprietário (com BR-08)       | ✅            |
| UC-05 | Solicitar reserva (com cativação BR-02)    | ✅            |
| UC-06 | Registar levantamento (Check-in)           | ✅            |
| UC-07 | Rastrear estado do aluguer                 | ✅            |
| UC-08 | Confirmar devolução (Check-out)            | ✅            |
| UC-09 | Avaliar experiência (BR-06)                | ✅            |
| UC-10 | Reportar problema                          | ✅            |

## Stack

- **HTML + CSS + JavaScript** puro (sem frameworks)
- **Sem backend** — persistência exclusivamente em `LocalStorage`
- Fontes via Google Fonts (Fraunces + Inter Tight)
- Ilustrações SVG inline (sem dependências de imagens externas)

## Estrutura

```
rentatool/
├── index.html         entrada da SPA
├── css/styles.css     estilos
├── assets/            favicon, etc.
└── js/
    ├── storage.js     wrapper sobre LocalStorage
    ├── seed.js        catálogo de demonstração
    ├── ui.js          utilitários partilhados (modal, toasts, helpers)
    ├── auth.js        UC-01 + sessão
    ├── catalog.js     UC-03 + UC-05
    ├── rentals.js     UC-06, UC-07, UC-08, UC-09, UC-10
    ├── messages.js    UC-04 (com BR-08)
    ├── router.js      router por hash
    └── app.js         bootstrap + renderers
```

## Como correr localmente

A aplicação é estática — basta servir os ficheiros por HTTP. Não corre
correctamente abrindo o `index.html` por `file://` (alguns browsers
bloqueiam o LocalStorage nesses contextos).

```bash
# qualquer um destes serve
python3 -m http.server 8000
# ou
npx serve .
```

Depois abra `http://localhost:8000`.

## Deployment (alojamento gratuito)

Opções recomendadas para alojar este projeto gratuitamente:

1. **GitHub Pages** — empurre o repositório para GitHub, ative *Pages*
   nas definições (branch `main`, pasta `/`). URL no formato
   `https://<utilizador>.github.io/<repo>/`.
2. **Netlify** — `Add new site → Import from Git`. Build command: vazio.
   Publish directory: `/`.
3. **Vercel** — `Add new project → Import Git Repository`. Sem build.
4. **Cloudflare Pages** — semelhante.

Como o projeto é 100% estático, qualquer um destes serve sem
configuração adicional.

## Notas sobre a persistência

Toda a informação fica em `LocalStorage`, com namespace `rentatool.v1.`.
O botão "Repor dados de demonstração" no rodapé apaga tudo e recarrega
o catálogo inicial.

Como cada navegador tem o seu `LocalStorage`, **os dados não são
partilhados entre utilizadores nem entre browsers**. Isto está alinhado
com o objetivo do incremento: simular a persistência para efeitos de
demonstração.

## Demonstração rápida

1. Abrir a aplicação — vê o catálogo de demonstração.
2. **Criar conta** (Chave Móvel Digital → validação imediata, trusted badge).
3. Procurar uma ferramenta, abrir a ficha.
4. **Reservar** → resumo com aluguer + taxa de serviço + caução.
5. Em **Meus alugueres** abrir o aluguer recém-criado.
6. **Check-in (código de pairing, US6.1)**: como proprietário, registar ≥ 3
   fotografias e **gerar o código** de 6 dígitos (válido 15 min).
7. Voltar à página inicial, fazer logout e entrar como o proprietário
   (`joao.silva@exemplo.pt` no quick-login) — ou vice-versa, conforme o papel.
8. Como **arrendatário**, abrir o mesmo aluguer e **inserir o código**. Após a
   validação bilateral, o aluguer transita para **ATIVO**.
9. **Check-out** "Sem ocorrências" → estado **FINALIZADO**.
10. **Avaliar** (ambos os lados precisam de avaliar para a avaliação ficar pública — BR-06).
11. Experimente **Reportar problema**:
    - **Furto** → exige anexar a queixa policial (senão bloqueia) e aciona a seguradora.
    - **Dano** com valor ≥ 50€ → aciona a seguradora e congela os pagamentos (BR-07).
12. Teste ainda o filtro **anti-bypass** nas mensagens (escreva um número de
    telemóvel ou email — é mascarado).



## Como Executar os Testes Automatizados

Os testes funcionais das *User Stories* (US) foram gravados utilizando a extensão **Katalon Recorder**. Para os executares em qualquer computador, basta seguires estes passos simples:

### 1. Pré-requisitos
* Ter um navegador moderno instalado (Google Chrome, Mozilla Firefox ou Microsoft Edge).
* Instalar a extensão gratuita **Katalon Recorder (Selenium IDE)** através da loja de extensões oficial do teu browser.

### 2. Importar os Testes
1. Entra na pasta de testes do projeto e faz o download dos ficheiros de teste com a extensão `.krecorder` (ex: `US1_CriarConta.krecorder`, `US3.1_Filtros.krecorder`, etc.).
2. Abre o Katalon Recorder clicando no ícone da extensão no canto superior do teu navegador.
3. No painel lateral esquerdo do Katalon, clica no botão de opções (os três pontos) ao lado de **"Test Suites"** e escolhe a opção **"Open Test Suite..."**.
4. Seleciona os ficheiros `.krecorder` que descarregaste da nossa pasta.

### 3. Executar as Validações
1. Garante que o site da aplicação está aberto no teu browser (pode ser a correr localmente em `http://localhost:8000` ou direto no link de produção do GitHub Pages).
2. Na barra lateral do Katalon Recorder, clica no caso de teste que queres validar.
3. Clica no botão **"Play"** (no topo do painel do Katalon) para veres o robô a simular os cliques e preenchimentos de forma automática no teu ecrã.
4. Espreita o painel inferior (**"Log"**) para confirmar se todos os passos ficaram verdes (Sucesso!).

> **Nota importante para a US1 (Criar Conta):** Este script clica automaticamente no botão *"Repor dados"* no rodapé no início do fluxo. Fizemos isto de propósito para limpar o `LocalStorage`, garantindo que o teste corre sempre do zero e limpo, sem dar erros de e-mails duplicados de execuções anteriores!
