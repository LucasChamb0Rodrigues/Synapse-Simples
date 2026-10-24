const Controller = require('./Controller');
const Usuario = require('../models/usuarioModel');
const ErroApp = require('../models/ErroApp');

class PerfilController extends Controller {
  async ver(req, res) {
    const usuario = await Usuario.buscarOuFalhar(req.session.usuario.id);
    res.json({ nome: usuario.nome, login: usuario.login, perfil: usuario.perfil });
  }

  async alterar(req, res) {
    const usuario = await Usuario.buscarOuFalhar(req.session.usuario.id);
    if (!(await usuario.conferirSenha(req.body.senhaAtual))) throw new ErroApp(400, 'A senha atual não confere.');
    const { nome, login, senha } = req.body;
    const trocouSenha = await usuario.alterar({ nome, login, senha });
    req.session.usuario = usuario.dadosDaSessao();
    res.json({ usuario: req.session.usuario });
  }
}

module.exports = new PerfilController();
