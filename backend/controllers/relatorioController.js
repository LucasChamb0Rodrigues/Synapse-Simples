const Ficha = require('../models/fichaModel');
const ErroApp = require('../utils/ErroApp');

class RelatorioController {
  async gerar(req, res) {
    const ids = [
      ...new Set(
        String(req.query.produtos || '')
          .split(',')
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    if (ids.length === 0) throw new ErroApp(400, 'Selecione pelo menos um produto.');
    if (ids.length > 200) throw new ErroApp(400, 'Selecione no máximo 200 produtos por relatório.');
    const data = req.query.data || '9999-12-31';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new ErroApp(400, 'Data inválida.');

    const produtos = await Ficha.buscarVersoesNaData(ids, data);
    res.json({ produtos, semFicha: ids.length - produtos.length });
  }
}

module.exports = new RelatorioController();
