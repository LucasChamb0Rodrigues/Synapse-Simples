const Usuario = require('../models/usuarioModel');
const SessaoStore = require('../models/sessaoModel');
const ErroApp = require('../utils/ErroApp');

class UsuarioController {
  async listar(req, res) {
    res.json(await Usuario.listar());
  }

  async criar(req, res) {
    await Usuario.cadastrar(req.body, req.body.perfil);
    res.status(201).json({ ok: true });
  }

  async alterar(req, res) {
    const usuario = await Usuario.buscarOuFalhar(req.params.id);
    const eu = usuario.id === req.session.usuario.id;
    if (eu && req.body.perfil !== undefined && req.body.perfil !== usuario.perfil) {
      throw new ErroApp(400, 'Você não pode mudar o seu próprio perfil.');
    }
    const trocouSenha = await usuario.alterar(req.body);
    if (trocouSenha) await SessaoStore.encerrarDoUsuario(usuario.id, req.sessionID);
    if (eu) req.session.usuario = usuario.dadosDaSessao();
    res.json({ ok: true });
  }

  async mudarAtivo(req, res) {
    if (Number(req.params.id) === req.session.usuario.id) throw new ErroApp(400, 'Você não pode inativar o seu próprio usuário.');
    const usuario = await Usuario.buscarOuFalhar(req.params.id);
    const ativo = req.body.ativo === true;
    await usuario.mudarAtivo(ativo);
    if (!ativo) await SessaoStore.encerrarDoUsuario(usuario.id);
    res.json({ ok: true });
  }
}

module.exports = new UsuarioController();
