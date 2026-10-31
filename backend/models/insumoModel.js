const banco = require('../config/banco');
const Modelo = require('./Modelo');
const ErroApp = require('../utils/ErroApp');

class Insumo extends Modelo {
  static tabela = 'insumo';
  static campos = ['nome', 'unidade', 'custo'];
  static naoEncontrado = 'Insumo não encontrado.';
  static UNIDADES = ['KG', 'G', 'L', 'ML', 'UN'];

  async validar() {
    this.nome = Modelo.texto(this.nome);
    this.unidade = Modelo.texto(this.unidade).toUpperCase();
    this.custo = Modelo.numero(this.custo);
    if (!this.nome) throw new ErroApp(400, 'Informe o nome do insumo.');
    if (!Insumo.UNIDADES.includes(this.unidade))
      throw new ErroApp(400, 'Unidade de medida inválida.');
    this.custo = Math.round(this.custo * 10000) / 10000;
    if (!(this.custo > 0)) throw new ErroApp(400, 'Informe um custo válido (maior que zero).');

    if (this.id) {
      const salvo = await Insumo.buscarPorId(this.id);
      if (salvo.unidade !== this.unidade && (await this.contarUsoEmFichas()) > 0) {
        throw new ErroApp(
          409,
          'A unidade não pode ser alterada: o insumo já é usado em ficha técnica.',
        );
      }
    }
  }

  registrarPreco(custoAnterior, usuario) {
    return banco.sql(
      'INSERT INTO insumo_preco (insumo_id, custo_anterior, custo_novo, usuario_nome) VALUES (?, ?, ?, ?)',
      [this.id, custoAnterior, this.custo, usuario.nome],
    );
  }

  historicoDePrecos() {
    return banco.sql(
      'SELECT custo_anterior, custo_novo, alterado_em, usuario_nome FROM insumo_preco WHERE insumo_id = ? ORDER BY alterado_em, id',
      [this.id],
    );
  }

  async contarUsoEmFichas() {
    const [{ total }] = await banco.sql(
      'SELECT COUNT(*) AS total FROM item_ficha WHERE insumo_id = ?',
      [this.id],
    );
    return total;
  }
}

module.exports = Insumo;
