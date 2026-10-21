// Classe base dos cadastros (Categoria, Insumo, Produto, Usuario).
// Cada objeto é uma linha da tabela. As classes filhas dizem qual é a tabela e quais campos gravar;
// listar, buscar, salvar e excluir vêm prontos daqui (herança).
const banco = require('./banco');
const ErroApp = require('./ErroApp');

class Modelo {
  static tabela = '';                                 // nome da tabela no MySQL
  static campos = [];                                 // colunas gravadas pelo salvar()
  static ordem = 'nome';                              // ordem do listar()
  static naoEncontrado = 'Registro não encontrado.';  // mensagem do buscarOuFalhar()

  constructor(dados = {}) {
    Object.assign(this, dados);
  }

  static async listar() {
    const linhas = await banco.sql(`SELECT * FROM ${this.tabela} ORDER BY ${this.ordem}`);
    return linhas.map((linha) => new this(linha)); // "this" aqui é a classe filha (Insumo, Produto...)
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

  // Copia do formulário só os campos da tabela (o "id" e outros campos não vêm do navegador).
  preencher(dados) {
    for (const campo of this.constructor.campos) this[campo] = dados[campo];
    return this;
  }

  // Cada classe filha confere os próprios dados (polimorfismo). Aqui não há regra.
  async validar() {}

  // Texto que identifica o registro na auditoria.
  descricao() {
    return this.nome;
  }

  // INSERT se o registro ainda não tem id; UPDATE se já tem.
  async salvar() {
    await this.validar();
    const { tabela, campos } = this.constructor;
    const valores = campos.map((campo) => this[campo]);
    if (this.id) {
      await banco.sql(`UPDATE ${tabela} SET ${campos.map((campo) => `${campo} = ?`).join(', ')} WHERE id = ?`, [...valores, this.id]);
    } else {
      const resultado = await banco.sql(`INSERT INTO ${tabela} (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`, valores);
      this.id = resultado.insertId;
    }
  }

  // Se o registro estiver em uso, o próprio MySQL bloqueia (chave estrangeira).
  excluir() {
    return banco.sql(`DELETE FROM ${this.constructor.tabela} WHERE id = ?`, [this.id]);
  }

  // "  Leite " -> "Leite"
  static texto(valor) {
    return String(valor ?? '').trim();
  }

  // Campo vazio vira NaN (inválido) em vez de 0.
  static numero(valor) {
    return valor === '' || valor == null ? NaN : Number(valor);
  }
}

module.exports = Modelo;
