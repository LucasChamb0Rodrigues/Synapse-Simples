const Insumo = require('../models/insumoModel');
const ErroApp = require('../utils/ErroApp');

class VariacaoController {
  async gerar(req, res) {
    const { inicio, fim } = req.query;
    const data = /^\d{4}-\d{2}-\d{2}$/;
    if (!data.test(inicio || '') || !data.test(fim || ''))
      throw new ErroApp(400, 'Informe a data inicial e a data final.');
    if (inicio > fim) throw new ErroApp(400, 'A data inicial deve ser antes da data final.');

    res.json(await Insumo.variacaoDePrecos(inicio, fim));
  }
}

module.exports = new VariacaoController();
