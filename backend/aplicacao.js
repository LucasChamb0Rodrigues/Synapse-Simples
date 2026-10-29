try { process.loadEnvFile(); } catch {}
if (!process.env.SESSION_SECRET) {
  throw new Error('Configure o SESSION_SECRET (arquivo .env no computador ou variáveis de ambiente na hospedagem).');
}

const express = require('express');
const session = require('express-session');
const rotas = require('./rotas');
const SessaoStore = require('./models/sessaoModel');
const Estrutura = require('./config/estrutura');
const { cabecalhosDeSeguranca, cors } = require('./middlewares/seguranca');
const tratarErros = require('./middlewares/erros');

const COOKIE_ENTRE_SITES = process.env.COOKIE_CROSS_SITE === 'true';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json());
app.use(cabecalhosDeSeguranca);
app.use(cors);

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
    secure: COOKIE_ENTRE_SITES ? true : 'auto',
  },
}));

app.get('/', (req, res) => res.json({ sistema: 'Synapse API', ok: true }));
app.use('/api', async (req, res, next) => {
  await Estrutura.preparar();
  next();
});
app.use('/api', rotas);
app.use(tratarErros);

module.exports = app;
