const banco = require('./banco');
const ErroApp = require('./ErroApp');

class Modelo {
  static tabela = '';
  static campos = [];
  static ordem = 'nome';
  static naoEncontrado = 'Registro não encontrado.';

  constructor(dados = {}) {
    Object.assign(this, dados);
  }

  static async listar() {
    const linhas = await banco.sql(`SELECT * FROM ${this.tabela} ORDER BY ${this.ordem}`);
    return linhas.map((linha) => new this(linha));
  }

  static async buscarPorId(id) {
    const [linha] = await banco.sql(`SELECT * FROM ${this.tabela} WHERE id = ?`, [id]);
    return linha && new this(linha);
  }

  static async buscarOuFalhar(id) {
    const registro = await this.buscarPorId(id);
    if (!registro) throw new ErroApp(404, this.naoEncontrado);
    return registro;
  }

  preencher(dados) {
    for (const campo of this.constructor.campos) this[campo] = dados[campo];
    return this;
  }

  async validar() {}

  descricao() {
    return this.nome;
  }

  async salvar(conexao) {
    await this.validar();
    const { tabela, campos } = this.constructor;
    const valores = campos.map((campo) => this[campo]);
    if (this.id) {
      await banco.sql(`UPDATE ${tabela} SET ${campos.map((campo) => `${campo} = ?`).join(', ')} WHERE id = ?`, [...valores, this.id], conexao);
    } else {
      const resultado = await banco.sql(`INSERT INTO ${tabela} (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`, valores, conexao);
      this.id = resultado.insertId;
    }
  }

  async mudarAtivo(ativo) {
    await banco.sql(`UPDATE ${this.constructor.tabela} SET ativo = ? WHERE id = ?`, [ativo, this.id]);
    this.ativo = ativo;
  }

  static texto(valor) {
    return String(valor ?? '').trim();
  }

  static numero(valor) {
    return valor === '' || valor == null ? NaN : Number(valor);
  }
}

module.exports = Modelo;
