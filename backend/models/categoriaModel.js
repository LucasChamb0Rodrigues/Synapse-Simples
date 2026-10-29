const Modelo = require('./Modelo');
const ErroApp = require('../utils/ErroApp');

class Categoria extends Modelo {
  static tabela = 'categoria';
  static campos = ['nome'];
  static naoEncontrado = 'Categoria não encontrada.';

  async validar() {
    this.nome = Modelo.texto(this.nome);
    if (!this.nome) throw new ErroApp(400, 'Informe o nome da categoria.');
  }
}

module.exports = Categoria;
