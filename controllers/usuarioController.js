// Cadastro de usuários (só o perfil Recepção acessa).
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuarioModel');
const Auditoria = require('../models/auditoriaModel');
const { falha, texto } = require('./ajuda');

// Valida e cadastra um usuário. Também é usado no primeiro acesso (authController).
async function validarECriar(dados, perfil) {
  const nome = texto(dados.nome);
  const login = texto(dados.login).toLowerCase();
  const senha = String(dados.senha ?? '');
  if (!nome) falha(400, 'Informe o nome.');
  if (!/^[a-z0-9._-]{3,30}$/.test(login)) falha(400, 'O login deve ter de 3 a 30 caracteres (letras minúsculas, números, ponto, hífen ou _).');
  if (senha.length < 6) falha(400, 'A senha deve ter pelo menos 6 caracteres.');
  if (perfil !== 'recepcao' && perfil !== 'entrega') falha(400, 'Perfil inválido.');

  const senhaHash = await bcrypt.hash(senha, 10); // a senha nunca é guardada, só o hash
  const id = await Usuario.criar(nome, login, senhaHash, perfil);
  return { id, nome, perfil };
}

async function listar(req, res) {
  res.json(await Usuario.listar());
}

async function criar(req, res) {
  const novo = await validarECriar(req.body, req.body.perfil);
  await Auditoria.registrar(req.session.usuario, 'Criou', 'Usuário', `${novo.nome} (${novo.perfil})`);
  res.status(201).json({ ok: true });
}

async function excluir(req, res) {
  if (Number(req.params.id) === req.session.usuario.id) falha(400, 'Você não pode excluir o seu próprio usuário.');
  const usuario = await Usuario.buscarPorId(req.params.id);
  if (!usuario) falha(404, 'Usuário não encontrado.');

  await Usuario.excluir(usuario.id);
  await Auditoria.registrar(req.session.usuario, 'Excluiu', 'Usuário', usuario.nome);
  res.json({ ok: true });
}

module.exports = { validarECriar, listar, criar, excluir };
