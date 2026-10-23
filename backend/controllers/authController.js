// Login, logout e primeiro acesso.
const Controller = require('./Controller');
const Usuario = require('../models/usuarioModel');
const ErroApp = require('../models/ErroApp');

class AuthController extends Controller {
  // Diz à tela se alguém já está logado e se é o primeiro acesso.
  async situacao(req, res) {
    res.json({ primeiroAcesso: (await Usuario.contar()) === 0, usuario: req.session.usuario || null });
  }

  // Cria o primeiro usuário (Admin) quando o banco ainda não tem nenhum.
  async primeiroAcesso(req, res) {
    if ((await Usuario.contar()) > 0) throw new ErroApp(403, 'O primeiro acesso já foi feito.');
    const usuario = await Usuario.cadastrar(req.body, 'recepcao');
    req.session.usuario = usuario.dadosDaSessao();
    await this.auditar(req, 'Criou', 'Usuário', `${usuario.nome} (primeiro acesso)`);
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
