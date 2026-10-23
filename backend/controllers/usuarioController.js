// Cadastro de usuários (só o perfil Admin acessa).
const Controller = require('./Controller');
const Usuario = require('../models/usuarioModel');
const ErroApp = require('../models/ErroApp');

class UsuarioController extends Controller {
  async listar(req, res) {
    res.json(await Usuario.listar());
  }

  async criar(req, res) {
    const novo = await Usuario.cadastrar(req.body, req.body.perfil);
    await this.auditar(req, 'Criou', 'Usuário', `${novo.nome} (${novo.nomePerfil()})`);
    res.status(201).json({ ok: true });
  }

  // O Admin altera os dados de qualquer usuário. Senha em branco mantém a atual.
  async alterar(req, res) {
    const usuario = await Usuario.buscarOuFalhar(req.params.id);
    const eu = usuario.id === req.session.usuario.id;
    // Impede o Admin de tirar o próprio acesso de administrador sem querer.
    if (eu && req.body.perfil !== undefined && req.body.perfil !== usuario.perfil) {
      throw new ErroApp(400, 'Você não pode mudar o seu próprio perfil.');
    }
    const nomeAnterior = usuario.nome;
    const trocouSenha = await usuario.alterar(req.body);
    if (eu) req.session.usuario = usuario.dadosDaSessao();
    await this.auditar(req, 'Alterou', 'Usuário', `${nomeAnterior} -> ${usuario.nome} (${usuario.nomePerfil()})${trocouSenha ? ', senha trocada' : ''}`);
    res.json({ ok: true });
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
