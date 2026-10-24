const Controller = require('./Controller');
const Usuario = require('../models/usuarioModel');
const ErroApp = require('../models/ErroApp');

class UsuarioController extends Controller {
  async listar(req, res) {
    res.json(await Usuario.listar());
  }

  async criar(req, res) {
    const novo = await Usuario.cadastrar(req.body, req.body.perfil);
    res.status(201).json({ ok: true });
  }

  async alterar(req, res) {
    const usuario = await Usuario.buscarOuFalhar(req.params.id);
    const eu = usuario.id === req.session.usuario.id;
    if (eu && req.body.perfil !== undefined && req.body.perfil !== usuario.perfil) {
      throw new ErroApp(400, 'Você não pode mudar o seu próprio perfil.');
    }
    const nomeAnterior = usuario.nome;
    const trocouSenha = await usuario.alterar(req.body);
    if (eu) req.session.usuario = usuario.dadosDaSessao();
    res.json({ ok: true });
  }

  async excluir(req, res) {
    if (Number(req.params.id) === req.session.usuario.id) throw new ErroApp(400, 'Você não pode excluir o seu próprio usuário.');
    const usuario = await Usuario.buscarOuFalhar(req.params.id);
    await usuario.excluir();
    res.json({ ok: true });
  }
}

module.exports = new UsuarioController();
