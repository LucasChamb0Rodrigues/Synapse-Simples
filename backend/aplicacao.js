// A API do Synapse: configura o Express (CORS, login, rotas e erros) e exporta o "app".
// Quem liga o app é o servidor.js (no computador) ou o api/index.js (na Vercel).
// As telas ficam na pasta ../frontend e são publicadas separadamente.
//
// Organização (MVC, orientado a objetos):
//   models/       classes das entidades (Produto, Insumo...): regras e SQL; herdam de Modelo
//   controllers/  classes que recebem o pedido, usam os objetos do model e respondem; herdam de Controller
//   rotas.js      liga cada endereço da API a um método de controller
//   (a View fica no front-end: ../frontend)

try { process.loadEnvFile(); } catch { /* sem .env: o aviso abaixo explica */ }
if (!process.env.SESSION_SECRET) {
  throw new Error('Configure o SESSION_SECRET (arquivo .env no computador ou variáveis de ambiente na hospedagem).');
}

const express = require('express');
const session = require('express-session');
const rotas = require('./rotas'); // carregado depois do .env, porque a conexão com o banco usa essas variáveis
const SessaoStore = require('./models/sessaoModel');

// Endereços do front-end que podem chamar esta API (CORS). Ex.: https://synapse.vercel.app
// Vários separados por vírgula. Vazio = só aceita pedidos do mesmo endereço da API.
const FRONTEND_URLS = (process.env.FRONTEND_URL || '').split(',').map((url) => url.trim().replace(/\/$/, '')).filter(Boolean);
// true quando o front-end e a API estão em domínios diferentes (ex.: front e API em domínios diferentes) e com HTTPS.
const COOKIE_ENTRE_SITES = process.env.COOKIE_CROSS_SITE === 'true';

const app = express();
// Em produção a API fica atrás do proxy HTTPS da hospedagem; isso permite o cookie "secure".
if (COOKIE_ENTRE_SITES) app.set('trust proxy', 1);
app.use(express.json());

// CORS: libera o front-end (que está em outro endereço) a chamar a API mandando o cookie de login.
app.use((req, res, next) => {
  const origem = req.headers.origin;
  if (origem && FRONTEND_URLS.includes(origem)) {
    res.set({
      'Access-Control-Allow-Origin': origem,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204); // pergunta prévia do navegador (preflight)
  next();
});

app.use(session({
  store: new SessaoStore(), // sessões no MySQL (tabela sessao), não na memória
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // renova o prazo a cada uso
  cookie: {
    httpOnly: true,
    maxAge: 30 * 60 * 1000, // 30 min sem usar = sai
    // Front e API em domínios diferentes: o cookie precisa de sameSite "none", que só funciona com HTTPS (secure).
    sameSite: COOKIE_ENTRE_SITES ? 'none' : 'strict',
    secure: COOKIE_ENTRE_SITES,
  },
}));

// Página inicial da API: serve para conferir se o servidor está no ar.
app.get('/', (req, res) => res.json({ sistema: 'Synapse API', ok: true }));
app.use('/api', rotas);

// Erros do MySQL que viram mensagens amigáveis: [status, mensagem].
const ERROS_DO_BANCO = {
  ER_DUP_ENTRY:            [409, 'Já existe um cadastro com esses dados (nome, código ou login repetido).'],
  ER_ROW_IS_REFERENCED_2:  [409, 'Não é possível excluir: este registro está em uso (em uma ficha técnica ou produto).'],
  ER_NO_REFERENCED_ROW_2:  [400, 'Um dos registros escolhidos não existe mais.'],
  ECONNREFUSED:            [500, 'Sem conexão com o banco de dados. Confira o arquivo .env.'],
  ER_ACCESS_DENIED_ERROR:  [500, 'Sem conexão com o banco de dados. Confira o arquivo .env.'],
};

// Todo erro dos controllers (inclusive os ErroApp) chega aqui.
app.use((erro, req, res, next) => {
  if (erro.status) return res.status(erro.status).json({ erro: erro.message });
  if (ERROS_DO_BANCO[erro.code]) {
    const [status, mensagem] = ERROS_DO_BANCO[erro.code];
    return res.status(status).json({ erro: mensagem });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

module.exports = app;
