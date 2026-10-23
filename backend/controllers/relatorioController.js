// Relatório de custo por produto (RF4).
const Controller = require('./Controller');
const Ficha = require('../models/fichaModel');
const ErroApp = require('../models/ErroApp');

class RelatorioController extends Controller {
  // GET /api/relatorio?produtos=1,2,3&data=2026-10-11
  // Para cada produto usa a versão da ficha que valia na data (ou a atual, sem data).
  async gerar(req, res) {
    const ids = String(req.query.produtos || '').split(',').map(Number).filter((id) => id > 0);
    if (ids.length === 0) throw new ErroApp(400, 'Selecione pelo menos um produto.');
    const data = req.query.data || '9999-12-31';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new ErroApp(400, 'Data inválida.');

    const produtos = [];
    let semFicha = 0;
    for (const id of ids) {
      const ficha = await Ficha.buscarVersaoNaData(id, data);
      if (!ficha) { semFicha++; continue; }
      await ficha.carregarItens();
      produtos.push(ficha);
    }
    await this.auditar(req, 'Gerou', 'Relatório de custo', `${produtos.length} produto(s)`);
    res.json({ produtos, semFicha });
  }
}

module.exports = new RelatorioController();
