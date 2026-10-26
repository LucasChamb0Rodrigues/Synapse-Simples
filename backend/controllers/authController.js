const Controller = require('./Controller');
const Usuario = require('../models/usuarioModel');
const TentativaLogin = require('../models/tentativaLoginModel');
const ErroApp = require('../models/ErroApp');

class AuthController extends Controller {
  async situacao(req, res) {
    res.json({ primeiroAcesso: (await Usuario.contar()) === 0, usuario: req.session.usuario || null });
  }

  async primeiroAcesso(req, res) {
    const usuario = await Usuario.cadastrarPrimeiroAdmin(req.body);
    await this.iniciarSessao(req, usuario);
    res.status(201).json({ usuario: req.session.usuario });
  }

  async login(req, res) {
    await TentativaLogin.conferir(req.body.login);
    const usuario = await Usuario.autenticar(req.body.login, req.body.senha);
    if (!usuario) {
      await TentativaLogin.registrarFalha(req.body.login);
      throw new ErroApp(401, 'Usuário ou senha incorretos.');
    }
    await TentativaLogin.limpar(req.body.login);
    await this.iniciarSessao(req, usuario);
    res.json({ usuario: req.session.usuario });
  }

  logout(req, res) {
    req.session.destroy(() => res.json({ ok: true }));
  }

  iniciarSessao(req, usuario) {
    return new Promise((resolver, rejeitar) => {
      req.session.regenerate((erro) => {
        if (erro) return rejeitar(erro);
        req.session.usuario = usuario.dadosDaSessao();
        resolver();
      });
    });
  }
}

module.exports = new AuthController();
