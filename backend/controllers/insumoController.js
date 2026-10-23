// Cadastro de insumos (RF2).
const Controller = require('./Controller');
const Insumo = require('../models/insumoModel');

class InsumoController extends Controller {
  async listar(req, res) {
    res.json(await Insumo.listar());
  }

  async criar(req, res) {
    const insumo = new Insumo().preencher(req.body);
    await insumo.salvar();
    await this.auditar(req, 'Criou', 'Insumo', `${insumo.nome} (R$ ${insumo.custo}/${insumo.unidade})`);
    res.status(201).json({ ok: true });
  }

  async alterar(req, res) {
    const insumo = await Insumo.buscarOuFalhar(req.params.id);
    const custoAnterior = insumo.custo;
    await insumo.preencher(req.body).salvar();

    // Mudança de preço fica registrada na auditoria (histórico de preço).
    const precoMudou = custoAnterior !== insumo.custo;
    if (precoMudou) {
      await this.auditar(req, 'Alterou preço', 'Insumo', `${insumo.nome}: R$ ${custoAnterior} -> R$ ${insumo.custo}`);
    } else {
      await this.auditar(req, 'Alterou', 'Insumo', insumo.nome);
    }
    res.json({ ok: true, precoMudou });
  }

  async excluir(req, res) {
    const insumo = await Insumo.buscarOuFalhar(req.params.id);
    await insumo.excluir();
    await this.auditar(req, 'Excluiu', 'Insumo', insumo.nome);
    res.json({ ok: true });
  }
}

module.exports = new InsumoController();
