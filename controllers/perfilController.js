// "Meu perfil": qualquer usuário logado vê e altera os próprios dados (nome, login e senha).
// O perfil (Admin/Usuário) não muda por aqui; só o Admin muda, pela aba Usuários.
const Controller = require('./Controller');
const Usuario = require('../models/usuarioModel');
const ErroApp = require('../models/ErroApp');

class PerfilController extends Controller {
  async ver(req, res) {
    const usuario = await Usuario.buscarOuFalhar(req.session.usuario.id);
    res.json({ nome: usuario.nome, login: usuario.login, perfil: usuario.perfil });
  }

  // Pede a senha atual para confirmar que é a própria pessoa (e não alguém num computador esquecido logado).
  async alterar(req, res) {
    const usuario = await Usuario.buscarOuFalhar(req.session.usuario.id);
    if (!(await usuario.conferirSenha(req.body.senhaAtual))) throw new ErroApp(400, 'A senha atual não confere.');
    const { nome, login, senha } = req.body;
    const trocouSenha = await usuario.alterar({ nome, login, senha });
    req.session.usuario = usuario.dadosDaSessao();
    await this.auditar(req, 'Alterou', 'Usuário', `${usuario.nome} (o próprio perfil)${trocouSenha ? ', senha trocada' : ''}`);
    res.json({ usuario: req.session.usuario });
  }
}

module.exports = new PerfilController();
