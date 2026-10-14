// Relatório de custo por produto (RF4).
const Ficha = require('../models/fichaModel');
const Auditoria = require('../models/auditoriaModel');
const { falha } = require('./ajuda');

// GET /api/relatorio?produtos=1,2,3&data=2026-10-11
// Para cada produto usa a versão da ficha que valia na data (ou a atual, sem data).
async function gerar(req, res) {
  const ids = String(req.query.produtos || '').split(',').map(Number).filter((id) => id > 0);
  if (ids.length === 0) falha(400, 'Selecione pelo menos um produto.');
  const data = req.query.data || '9999-12-31';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) falha(400, 'Data inválida.');

  const produtos = [];
  let semFicha = 0;
  for (const id of ids) {
    const ficha = await Ficha.buscarVersaoNaData(id, data);
    if (!ficha) { semFicha++; continue; }
    ficha.itens = await Ficha.listarItens(ficha.id);
    ficha.total = Math.round(ficha.itens.reduce((soma, item) => soma + item.subtotal, 0) * 100) / 100;
    produtos.push(ficha);
  }
  await Auditoria.registrar(req.session.usuario, 'Gerou', 'Relatório de custo', `${produtos.length} produto(s)`);
  res.json({ produtos, semFicha });
}

module.exports = { gerar };
