// Cadastro de categorias (RF3).
const Categoria = require('../models/categoriaModel');
const Auditoria = require('../models/auditoriaModel');
const { falha, texto } = require('./ajuda');

function lerNome(dados) {
  const nome = texto(dados.nome);
  if (!nome) falha(400, 'Informe o nome da categoria.');
  return nome;
}

async function buscarOuFalhar(id) {
  const categoria = await Categoria.buscarPorId(id);
  if (!categoria) falha(404, 'Categoria não encontrada.');
  return categoria;
}

async function listar(req, res) {
  res.json(await Categoria.listar());
}

async function criar(req, res) {
  const nome = lerNome(req.body);
  await Categoria.criar(nome);
  await Auditoria.registrar(req.session.usuario, 'Criou', 'Categoria', nome);
  res.status(201).json({ ok: true });
}

async function alterar(req, res) {
  const anterior = await buscarOuFalhar(req.params.id);
  const nome = lerNome(req.body);
  await Categoria.alterar(anterior.id, nome);
  await Auditoria.registrar(req.session.usuario, 'Alterou', 'Categoria', `${anterior.nome} -> ${nome}`);
  res.json({ ok: true });
}

async function excluir(req, res) {
  const categoria = await buscarOuFalhar(req.params.id);
  await Categoria.excluir(categoria.id);
  await Auditoria.registrar(req.session.usuario, 'Excluiu', 'Categoria', categoria.nome);
  res.json({ ok: true });
}

module.exports = { listar, criar, alterar, excluir };
