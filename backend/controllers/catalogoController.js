// Catálogo de produtos (RF7). Os dois perfis acessam; o perfil Usuário só vê produtos ativos que têm ficha.
const Controller = require('./Controller');
const Produto = require('../models/produtoModel');
const Ficha = require('../models/fichaModel');
const ErroApp = require('../models/ErroApp');

class CatalogoController extends Controller {
  async listar(req, res) {
    const produtos = await Produto.listarCatalogo(); // cada produto já vem com a situação
    const soConsulta = req.session.usuario.perfil === 'usuario';
    res.json(soConsulta ? produtos.filter((p) => p.ativo && p.ficha_id) : produtos);
  }

  // Produto, histórico de versões e insumos da versão atual.
  async detalhe(req, res) {
    const produto = await Produto.buscarPorId(req.params.id);
    if (!produto || (req.session.usuario.perfil === 'usuario' && !produto.ativo)) throw new ErroApp(404, Produto.naoEncontrado);

    const versoes = await Ficha.listarVersoes(produto.id);
    const itens = versoes.length ? await Ficha.listarItens(versoes[0].id) : [];
    res.json({ produto, versoes, itens });
  }
}

module.exports = new CatalogoController();
