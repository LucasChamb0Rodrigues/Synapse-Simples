const Usuario = require('../models/usuarioModel');
const TentativaLogin = require('../models/tentativaLoginModel');
const SessaoStore = require('../models/sessaoModel');
const ErroApp = require('../utils/ErroApp');

class PerfilController {
  async ver(req, res) {
    const usuario = await Usuario.buscarOuFalhar(req.session.usuario.id);
    res.json({ nome: usuario.nome, login: usuario.login, perfil: usuario.perfil });
  }

  async alterar(req, res) {
    const usuario = await Usuario.buscarOuFalhar(req.session.usuario.id);
    await TentativaLogin.conferir(usuario.login);
    if (!(await usuario.conferirSenha(req.body.senhaAtual))) {
      await TentativaLogin.registrarFalha(usuario.login);
      throw new ErroApp(400, 'A senha atual não confere.');
    }
    const { nome, login, senha } = req.body;
    const trocouSenha = await usuario.alterar({ nome, login, senha });
    if (trocouSenha) await SessaoStore.encerrarDoUsuario(usuario.id, req.sessionID);
    req.session.usuario = usuario.dadosDaSessao();
    res.json({ usuario: req.session.usuario });
  }
}

module.exports = new PerfilController();
