const Categoria = require('../models/categoriaModel');

class CategoriaController {
  async listar(req, res) {
    res.json(await Categoria.listar());
  }

  async criar(req, res) {
    const categoria = new Categoria().preencher(req.body);
    await categoria.salvar();
    res.status(201).json({ ok: true });
  }

  async alterar(req, res) {
    const categoria = await Categoria.buscarOuFalhar(req.params.id);
    await categoria.preencher(req.body).salvar();
    res.json({ ok: true });
  }

  async mudarAtivo(req, res) {
    const categoria = await Categoria.buscarOuFalhar(req.params.id);
    await categoria.mudarAtivo(req.body.ativo === true);
    res.json({ ok: true });
  }
}

module.exports = new CategoriaController();
