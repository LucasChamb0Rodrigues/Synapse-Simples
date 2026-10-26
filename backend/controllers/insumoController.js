const Controller = require('./Controller');
const Insumo = require('../models/insumoModel');

class InsumoController extends Controller {
  async listar(req, res) {
    res.json(await Insumo.listar());
  }

  async criar(req, res) {
    const insumo = new Insumo().preencher(req.body);
    await insumo.salvar();
    await insumo.registrarPreco(null, req.session.usuario);
    res.status(201).json({ ok: true });
  }

  async alterar(req, res) {
    const insumo = await Insumo.buscarOuFalhar(req.params.id);
    const custoAnterior = insumo.custo;
    await insumo.preencher(req.body).salvar();
    const precoMudou = custoAnterior !== insumo.custo;
    if (precoMudou) await insumo.registrarPreco(custoAnterior, req.session.usuario);
    res.json({ ok: true, precoMudou });
  }

  async precos(req, res) {
    const insumo = await Insumo.buscarOuFalhar(req.params.id);
    res.json({ insumo, precos: await insumo.historicoDePrecos() });
  }

  async mudarAtivo(req, res) {
    const insumo = await Insumo.buscarOuFalhar(req.params.id);
    await insumo.mudarAtivo(req.body.ativo === true);
    res.json({ ok: true });
  }
}

module.exports = new InsumoController();
