// Login, logout e primeiro acesso.
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuarioModel');
const Auditoria = require('../models/auditoriaModel');
const { validarECriar } = require('./usuarioController');
const { falha, texto } = require('./ajuda');

// Diz à tela se alguém já está logado e se é o primeiro acesso.
async function situacao(req, res) {
  res.json({ primeiroAcesso: (await Usuario.contar()) === 0, usuario: req.session.usuario || null });
}

// Cria o primeiro usuário (Recepção) quando o banco ainda não tem nenhum.
async function primeiroAcesso(req, res) {
  if ((await Usuario.contar()) > 0) falha(403, 'O primeiro acesso já foi feito.');
  req.session.usuario = await validarECriar(req.body, 'recepcao');
  await Auditoria.registrar(req.session.usuario, 'Criou', 'Usuário', `${req.session.usuario.nome} (primeiro acesso)`);
  res.status(201).json({ usuario: req.session.usuario });
}

async function login(req, res) {
  const usuario = await Usuario.buscarPorLogin(texto(req.body.login).toLowerCase());
  // bcrypt.compare confere a senha digitada com o hash guardado no banco.
  if (!usuario || !(await bcrypt.compare(String(req.body.senha ?? ''), usuario.senha_hash))) {
    falha(401, 'Usuário ou senha incorretos.');
  }
  req.session.usuario = { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil };
  res.json({ usuario: req.session.usuario });
}

function logout(req, res) {
  req.session.destroy(() => res.json({ ok: true }));
}

module.exports = { situacao, primeiroAcesso, login, logout };
