const Controller = require('./Controller');
const Ficha = require('../models/fichaModel');
const ErroApp = require('../models/ErroApp');

class RelatorioController extends Controller {
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
    res.json({ produtos, semFicha });
  }
}

module.exports = new RelatorioController();
