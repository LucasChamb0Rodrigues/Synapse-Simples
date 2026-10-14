// Catálogo de produtos (RF7). Os dois perfis acessam; o perfil Entrega só vê produtos ativos que têm ficha.
const Produto = require('../models/produtoModel');
const Ficha = require('../models/fichaModel');
const { falha } = require('./ajuda');

// Situação do produto (diagrama de estados do projeto).
function situacao(produto) {
  if (!produto.ativo) return 'Inativo';
  if (!produto.ficha_id) return 'Sem ficha';
  if (produto.insumos_alterados > 0) return 'Desatualizada'; // preço de insumo mudou
  return 'Ativa';
}

async function listar(req, res) {
  const produtos = await Produto.listarCatalogo();
  for (const p of produtos) p.situacao = situacao(p);

  const entrega = req.session.usuario.perfil === 'entrega';
  res.json(entrega ? produtos.filter((p) => p.ativo && p.ficha_id) : produtos);
}

// Produto, histórico de versões e insumos da versão atual.
async function detalhe(req, res) {
  const produto = await Produto.buscarPorId(req.params.id);
  if (!produto || (req.session.usuario.perfil === 'entrega' && !produto.ativo)) falha(404, 'Produto não encontrado.');

  const versoes = await Ficha.listarVersoes(produto.id);
  const itens = versoes.length ? await Ficha.listarItens(versoes[0].id) : [];
  res.json({ produto, versoes, itens });
}

module.exports = { listar, detalhe };
