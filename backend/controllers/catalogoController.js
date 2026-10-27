const Controller = require('./Controller');
const Produto = require('../models/produtoModel');
const Ficha = require('../models/fichaModel');
const ErroApp = require('../models/ErroApp');

class CatalogoController extends Controller {
  async listar(req, res) {
    const produtos = await Produto.listarCatalogo();
    const soConsulta = req.session.usuario.perfil === 'usuario';
    res.json(soConsulta ? produtos.filter((p) => p.ativo && p.ficha_id) : produtos);
  }

  async detalhe(req, res) {
    const produto = await Produto.buscarPorId(req.params.id);
    if (!produto || (req.session.usuario.perfil === 'usuario' && !produto.ativo)) throw new ErroApp(404, Produto.naoEncontrado);

    const versoes = await Ficha.listarVersoes(produto.id);
    const itens = versoes.length ? await Ficha.listarItens(versoes[0].id) : [];
    const custo = versoes.length
      ? Ficha.custos(itens.reduce((soma, item) => soma + item.subtotal, 0), versoes[0].rendimento, versoes[0].perda, produto.preco_venda, Ficha.unidadesDeVenda(produto))
      : null;
    res.json({ produto, versoes, itens, custo });
  }
}

module.exports = new CatalogoController();
