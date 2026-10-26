const Controller = require('./Controller');
const Produto = require('../models/produtoModel');

class ProdutoController extends Controller {
  async criar(req, res) {
    const produto = new Produto().preencher(req.body);
    await produto.salvar();
    res.status(201).json({ ok: true });
  }

  async alterar(req, res) {
    const produto = await Produto.buscarOuFalhar(req.params.id);
    await produto.preencher(req.body).salvar();
    res.json({ ok: true });
  }

  async mudarAtivo(req, res) {
    const produto = await Produto.buscarOuFalhar(req.params.id);
    await produto.mudarAtivo(req.body.ativo === true);
    res.json({ ok: true });
  }

  async salvarFicha(req, res) {
    const produto = await Produto.buscarOuFalhar(req.params.id);
    const ficha = produto.novaFicha(req.body);
    await ficha.salvar(req.session.usuario);
    res.status(201).json({ versao: ficha.versao, custoTotal: ficha.custoTotal, custoUnitario: ficha.custoUnitario });
  }
}

module.exports = new ProdutoController();
