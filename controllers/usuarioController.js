// Cadastro de usuários (só o perfil Recepção acessa).
const Controller = require('./Controller');
const Usuario = require('../models/usuarioModel');
const ErroApp = require('../models/ErroApp');

class UsuarioController extends Controller {
  async listar(req, res) {
    res.json(await Usuario.listar());
  }

  async criar(req, res) {
    const novo = await Usuario.cadastrar(req.body, req.body.perfil);
    await this.auditar(req, 'Criou', 'Usuário', `${novo.nome} (${novo.perfil})`);
    res.status(201).json({ ok: true });
  }

  async excluir(req, res) {
    if (Number(req.params.id) === req.session.usuario.id) throw new ErroApp(400, 'Você não pode excluir o seu próprio usuário.');
    const usuario = await Usuario.buscarOuFalhar(req.params.id);
    await usuario.excluir();
    await this.auditar(req, 'Excluiu', 'Usuário', usuario.nome);
    res.json({ ok: true });
  }
}

module.exports = new UsuarioController();
