try { process.loadEnvFile(); } catch {}
if (!process.env.SESSION_SECRET) {
  throw new Error('Configure o SESSION_SECRET (arquivo .env no computador ou variáveis de ambiente na hospedagem).');
}

const express = require('express');
const session = require('express-session');
const rotas = require('./rotas');
const SessaoStore = require('./models/sessaoModel');

const FRONTEND_URLS = (process.env.FRONTEND_URL || '').split(',').map((url) => url.trim().replace(/\/$/, '')).filter(Boolean);
const COOKIE_ENTRE_SITES = process.env.COOKIE_CROSS_SITE === 'true';

const app = express();
if (COOKIE_ENTRE_SITES) app.set('trust proxy', 1);
app.use(express.json());

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
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(session({
  store: new SessaoStore(),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    maxAge: 30 * 60 * 1000,
    sameSite: COOKIE_ENTRE_SITES ? 'none' : 'strict',
    secure: COOKIE_ENTRE_SITES,
  },
}));

app.get('/', (req, res) => res.json({ sistema: 'Synapse API', ok: true }));
app.use('/api', rotas);

const ERROS_DO_BANCO = {
  ER_DUP_ENTRY:            [409, 'Já existe um cadastro com esses dados (nome, código ou login repetido).'],
  ER_ROW_IS_REFERENCED_2:  [409, 'Não é possível excluir: este registro está em uso (em uma ficha técnica ou produto).'],
  ER_NO_REFERENCED_ROW_2:  [400, 'Um dos registros escolhidos não existe mais.'],
  ECONNREFUSED:            [500, 'Sem conexão com o banco de dados. Confira o arquivo .env.'],
  ER_ACCESS_DENIED_ERROR:  [500, 'Sem conexão com o banco de dados. Confira o arquivo .env.'],
};

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
