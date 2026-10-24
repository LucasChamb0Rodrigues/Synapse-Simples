const Controller = require('./Controller');
const Usuario = require('../models/usuarioModel');
const ErroApp = require('../models/ErroApp');

class AuthController extends Controller {
  async situacao(req, res) {
    res.json({ primeiroAcesso: (await Usuario.contar()) === 0, usuario: req.session.usuario || null });
  }

  async primeiroAcesso(req, res) {
    if ((await Usuario.contar()) > 0) throw new ErroApp(403, 'O primeiro acesso já foi feito.');
    const usuario = await Usuario.cadastrar(req.body, 'admin');
    req.session.usuario = usuario.dadosDaSessao();
    res.status(201).json({ usuario: req.session.usuario });
  }

  async login(req, res) {
    const usuario = await Usuario.autenticar(req.body.login, req.body.senha);
    if (!usuario) throw new ErroApp(401, 'Usuário ou senha incorretos.');
    req.session.usuario = usuario.dadosDaSessao();
    res.json({ usuario: req.session.usuario });
  }

  logout(req, res) {
    req.session.destroy(() => res.json({ ok: true }));
  }
}

module.exports = new AuthController();
