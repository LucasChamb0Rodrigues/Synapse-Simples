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
    if (this.nome.length > 60) throw new ErroApp(400, 'O nome deve ter no máximo 60 caracteres.');
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

  static async variacaoDePrecos(inicio, fim) {
    const mudancas = await banco.sql(
      `SELECT i.nome, i.unidade, p.custo_anterior, p.custo_novo, p.alterado_em, p.usuario_nome,
              (SELECT COUNT(*)
                 FROM item_ficha it
                 JOIN ficha_tecnica f ON f.id = it.ficha_id
                 JOIN produto pr ON pr.id = f.produto_id
                WHERE it.insumo_id = i.id
                  AND pr.ativo = 1
                  AND f.versao = (SELECT MAX(versao) FROM ficha_tecnica WHERE produto_id = f.produto_id)
              ) AS produtos
         FROM insumo_preco p
         JOIN insumo i ON i.id = p.insumo_id
        WHERE p.custo_anterior IS NOT NULL AND DATE(p.alterado_em) BETWEEN ? AND ?
        ORDER BY p.alterado_em, p.id`,
      [inicio, fim],
    );
    return mudancas.map((mudanca) => {
      const antes = mudanca.custo_anterior;
      const depois = mudanca.custo_novo;
      const variacao = antes > 0 ? Math.round(((depois - antes) / antes) * 1000) / 10 : null;
      return { ...mudanca, variacao };
    });
  }
}

module.exports = Insumo;
