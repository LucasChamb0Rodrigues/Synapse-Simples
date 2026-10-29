const Ambiente = require('./config/ambiente');
Ambiente.carregar();

const express = require('express');
const session = require('express-session');
const Rotas = require('./rotas');
const SessaoStore = require('./models/sessaoModel');
const Seguranca = require('./middlewares/seguranca');
const TratadorDeErros = require('./middlewares/erros');

class Aplicacao {
  static criar() {
    const app = express();
    app.set('trust proxy', 1);
    app.disable('x-powered-by');
    app.use(express.json());
    app.use(Seguranca.cabecalhos);
    app.use(Seguranca.cors);
    app.use(session(Aplicacao.configuracaoDaSessao()));

    app.get('/', (req, res) => res.json({ sistema: 'Synapse API', ok: true }));
    app.use('/api', Rotas.criar());
    app.use(TratadorDeErros.tratar);
    return app;
  }

  static configuracaoDaSessao() {
    const cookieEntreSites = process.env.COOKIE_CROSS_SITE === 'true';
    return {
      store: new SessaoStore(),
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        maxAge: 30 * 60 * 1000,
        sameSite: cookieEntreSites ? 'none' : 'strict',
        secure: cookieEntreSites ? true : 'auto',
      },
    };
  }
}

module.exports = Aplicacao.criar();
