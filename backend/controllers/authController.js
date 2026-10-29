const Usuario = require('../models/usuarioModel');
const TentativaLogin = require('../models/tentativaLoginModel');
const SessaoStore = require('../models/sessaoModel');
const ErroApp = require('../utils/ErroApp');

class AuthController {
  async situacao(req, res) {
    const aviso = req.session.aviso || null;
    delete req.session.aviso;
    res.json({
      primeiroAcesso: (await Usuario.contar()) === 0,
      usuario: req.session.usuario || null,
      aviso,
    });
  }

  async primeiroAcesso(req, res) {
    const usuario = await Usuario.cadastrarPrimeiroAdmin(req.body);
    await AuthController.iniciarSessao(req, usuario);
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
    await AuthController.iniciarSessao(req, usuario);
    await SessaoStore.encerrarComAviso(
      usuario.id,
      req.sessionID,
      'Sua sessão foi encerrada porque sua conta entrou em outro dispositivo.',
    );
    res.json({ usuario: req.session.usuario });
  }

  logout(req, res) {
    req.session.destroy(() => res.json({ ok: true }));
  }

  static iniciarSessao(req, usuario) {
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
