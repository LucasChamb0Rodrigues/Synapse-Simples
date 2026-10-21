// Cadastro de produtos (RF1) e gravação da ficha técnica (RF5 e RF6).
// A lista de produtos vem do catálogo (catalogoController).
const Controller = require('./Controller');
const Produto = require('../models/produtoModel');

class ProdutoController extends Controller {
  async criar(req, res) {
    const produto = new Produto().preencher(req.body);
    await produto.salvar();
    await this.auditar(req, 'Criou', 'Produto', produto.descricao());
    res.status(201).json({ ok: true });
  }

  async alterar(req, res) {
    const produto = await Produto.buscarOuFalhar(req.params.id);
    await produto.preencher(req.body).salvar();
    await this.auditar(req, 'Alterou', 'Produto', produto.descricao());
    res.json({ ok: true });
  }

  // Inativar (descontinuar) ou reativar.
  async mudarAtivo(req, res) {
    const produto = await Produto.buscarOuFalhar(req.params.id);
    const ativo = req.body.ativo === true;
    await produto.mudarAtivo(ativo);
    await this.auditar(req, ativo ? 'Reativou' : 'Inativou', 'Produto', produto.descricao());
    res.json({ ok: true });
  }

  // As fichas do produto são apagadas junto (ON DELETE CASCADE no banco).
  async excluir(req, res) {
    const produto = await Produto.buscarOuFalhar(req.params.id);
    await produto.excluir();
    await this.auditar(req, 'Excluiu', 'Produto', produto.descricao());
    res.json({ ok: true });
  }

  // Salva uma NOVA versão da ficha técnica (o preço e o custo total são calculados no model).
  async salvarFicha(req, res) {
    const produto = await Produto.buscarOuFalhar(req.params.id);
    const ficha = produto.novaFicha(req.body.itens);
    await ficha.salvar(req.session.usuario);
    res.status(201).json({ versao: ficha.versao, custoTotal: ficha.custoTotal });
  }
}

module.exports = new ProdutoController();
