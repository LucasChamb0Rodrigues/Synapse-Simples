// Cadastro de insumos (RF2).
const Insumo = require('../models/insumoModel');
const Auditoria = require('../models/auditoriaModel');
const { falha, texto, numero } = require('./ajuda');

function lerFormulario(dados) {
  const insumo = { nome: texto(dados.nome), unidade: texto(dados.unidade).toUpperCase(), custo: numero(dados.custo) };
  if (!insumo.nome) falha(400, 'Informe o nome do insumo.');
  if (!['KG', 'G', 'L', 'ML', 'UN'].includes(insumo.unidade)) falha(400, 'Unidade de medida inválida.');
  if (!(insumo.custo >= 0)) falha(400, 'Informe um custo válido (zero ou maior).');
  return insumo;
}

async function buscarOuFalhar(id) {
  const insumo = await Insumo.buscarPorId(id);
  if (!insumo) falha(404, 'Insumo não encontrado.');
  return insumo;
}

async function listar(req, res) {
  res.json(await Insumo.listar());
}

async function criar(req, res) {
  const insumo = lerFormulario(req.body);
  await Insumo.criar(insumo);
  await Auditoria.registrar(req.session.usuario, 'Criou', 'Insumo', `${insumo.nome} (R$ ${insumo.custo}/${insumo.unidade})`);
  res.status(201).json({ ok: true });
}

async function alterar(req, res) {
  const anterior = await buscarOuFalhar(req.params.id);
  const insumo = lerFormulario(req.body);

  // Trocar a unidade (ex.: KG -> G) estragaria as quantidades das fichas que já usam o insumo.
  if (anterior.unidade !== insumo.unidade && (await Insumo.contarUsoEmFichas(anterior.id)) > 0) {
    falha(409, 'A unidade não pode ser alterada: o insumo já é usado em ficha técnica.');
  }
  await Insumo.alterar(anterior.id, insumo);

  // Mudança de preço fica registrada na auditoria (histórico de preço).
  const precoMudou = anterior.custo !== insumo.custo;
  if (precoMudou) {
    await Auditoria.registrar(req.session.usuario, 'Alterou preço', 'Insumo', `${insumo.nome}: R$ ${anterior.custo} -> R$ ${insumo.custo}`);
  } else {
    await Auditoria.registrar(req.session.usuario, 'Alterou', 'Insumo', insumo.nome);
  }
  res.json({ ok: true, precoMudou });
}

async function excluir(req, res) {
  const insumo = await buscarOuFalhar(req.params.id);
  await Insumo.excluir(insumo.id);
  await Auditoria.registrar(req.session.usuario, 'Excluiu', 'Insumo', insumo.nome);
  res.json({ ok: true });
}

module.exports = { listar, criar, alterar, excluir };
