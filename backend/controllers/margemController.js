const Produto = require('../models/produtoModel');

class MargemController {
  async gerar(req, res) {
    const categoria = Number(req.query.categoria) || 0;
    const soMargemBaixa = req.query.baixa === '1';

    const ativos = (await Produto.listarCatalogo()).filter(
      (p) => p.ativo && (!categoria || p.categoria_id === categoria),
    );
    const comMargem = ativos.filter((p) => p.custo && p.custo.margem !== null);
    const produtos = comMargem
      .filter((p) => !soMargemBaixa || p.custo.margemBaixa)
      .sort((a, b) => a.custo.margem - b.custo.margem);

    res.json({ produtos, semMargem: ativos.length - comMargem.length });
  }
}

module.exports = new MargemController();
