// Cadastro de categorias (RF3).
const Controller = require('./Controller');
const Categoria = require('../models/categoriaModel');

class CategoriaController extends Controller {
  async listar(req, res) {
    res.json(await Categoria.listar());
  }

  async criar(req, res) {
    const categoria = new Categoria().preencher(req.body);
    await categoria.salvar();
    await this.auditar(req, 'Criou', 'Categoria', categoria.nome);
    res.status(201).json({ ok: true });
  }

  async alterar(req, res) {
    const categoria = await Categoria.buscarOuFalhar(req.params.id);
    const nomeAnterior = categoria.nome;
    await categoria.preencher(req.body).salvar();
    await this.auditar(req, 'Alterou', 'Categoria', `${nomeAnterior} -> ${categoria.nome}`);
    res.json({ ok: true });
  }

  async excluir(req, res) {
    const categoria = await Categoria.buscarOuFalhar(req.params.id);
    await categoria.excluir();
    await this.auditar(req, 'Excluiu', 'Categoria', categoria.nome);
    res.json({ ok: true });
  }
}

module.exports = new CategoriaController();
