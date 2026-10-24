const banco = require('./banco');
const Modelo = require('./Modelo');
const ErroApp = require('./ErroApp');

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
    if (!Insumo.UNIDADES.includes(this.unidade)) throw new ErroApp(400, 'Unidade de medida inválida.');
    if (!(this.custo >= 0)) throw new ErroApp(400, 'Informe um custo válido (zero ou maior).');

    if (this.id) {
      const salvo = await Insumo.buscarPorId(this.id);
      if (salvo.unidade !== this.unidade && (await this.contarUsoEmFichas()) > 0) {
        throw new ErroApp(409, 'A unidade não pode ser alterada: o insumo já é usado em ficha técnica.');
      }
    }
  }

  async contarUsoEmFichas() {
    const [{ total }] = await banco.sql('SELECT COUNT(*) AS total FROM item_ficha WHERE insumo_id = ?', [this.id]);
    return total;
  }
}

module.exports = Insumo;
