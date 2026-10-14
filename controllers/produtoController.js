// Cadastro de produtos (RF1) e gravação da ficha técnica (RF5 e RF6).
// A lista de produtos vem do catálogo (catalogoController).
const Produto = require('../models/produtoModel');
const Ficha = require('../models/fichaModel');
const Auditoria = require('../models/auditoriaModel');
const { falha, texto, numero } = require('./ajuda');

// Valida o formulário. "id" é o próprio produto (na alteração), que não conta como repetido.
async function lerFormulario(dados, id = 0) {
  const produto = { codigo: texto(dados.codigo).toUpperCase(), nome: texto(dados.nome), categoria_id: dados.categoria_id };
  if (!/^[A-Z0-9._-]{1,20}$/.test(produto.codigo)) falha(400, 'O código deve ter de 1 a 20 caracteres (letras, números, ponto, hífen ou _).');
  if (!produto.nome) falha(400, 'Informe o nome do produto.');
  if (!produto.categoria_id) falha(400, 'Selecione uma categoria.');
  if (await Produto.existeRepetido(produto.codigo, produto.nome, id)) falha(409, 'Já existe um produto com esse código ou nome.');
  return produto;
}

async function buscarOuFalhar(id) {
  const produto = await Produto.buscarPorId(id);
  if (!produto) falha(404, 'Produto não encontrado.');
  return produto;
}

async function criar(req, res) {
  const produto = await lerFormulario(req.body);
  await Produto.criar(produto);
  await Auditoria.registrar(req.session.usuario, 'Criou', 'Produto', `${produto.codigo} - ${produto.nome}`);
  res.status(201).json({ ok: true });
}

async function alterar(req, res) {
  const { id } = await buscarOuFalhar(req.params.id);
  const produto = await lerFormulario(req.body, id);
  await Produto.alterar(id, produto);
  await Auditoria.registrar(req.session.usuario, 'Alterou', 'Produto', `${produto.codigo} - ${produto.nome}`);
  res.json({ ok: true });
}

// Inativar (descontinuar) ou reativar.
async function mudarAtivo(req, res) {
  const produto = await buscarOuFalhar(req.params.id);
  const ativo = req.body.ativo === true;
  await Produto.mudarAtivo(produto.id, ativo);
  await Auditoria.registrar(req.session.usuario, ativo ? 'Reativou' : 'Inativou', 'Produto', `${produto.codigo} - ${produto.nome}`);
  res.json({ ok: true });
}

async function excluir(req, res) {
  const produto = await buscarOuFalhar(req.params.id);
  await Produto.excluir(produto.id);
  await Auditoria.registrar(req.session.usuario, 'Excluiu', 'Produto', `${produto.codigo} - ${produto.nome}`);
  res.json({ ok: true });
}

// Salva uma NOVA versão da ficha técnica.
// O navegador manda só insumo + quantidade; o preço e o custo total são calculados no model.
async function salvarFicha(req, res) {
  const produto = await buscarOuFalhar(req.params.id);
  if (!produto.ativo) falha(400, 'Produto inativo não pode receber ficha técnica.');

  const itens = Array.isArray(req.body.itens) ? req.body.itens : [];
  if (itens.length === 0) falha(400, 'Adicione pelo menos um insumo à ficha.');
  if (itens.some((item) => !(numero(item.quantidade) > 0))) falha(400, 'Todas as quantidades devem ser maiores que zero.');
  if (new Set(itens.map((item) => Number(item.insumo_id))).size !== itens.length) {
    falha(400, 'O mesmo insumo aparece mais de uma vez na ficha.');
  }

  const resultado = await Ficha.salvarNovaVersao(produto, itens, req.session.usuario);
  if (!resultado) falha(400, 'Um dos insumos da ficha não existe mais.');
  res.status(201).json(resultado);
}

module.exports = { criar, alterar, mudarAtivo, excluir, salvarFicha };
