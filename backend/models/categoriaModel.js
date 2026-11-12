const Modelo = require("./Modelo");
const ErroApp = require("../utils/ErroApp");

class Categoria extends Modelo {
  static tabela = "categoria";
  static campos = ["nome"];
  static naoEncontrado = "Categoria não encontrada.";

  async validar() {
    this.nome = Modelo.texto(this.nome);
    if (!this.nome) throw new ErroApp(400, "Informe o nome da categoria.");
    if (this.nome.length > 50)
      throw new ErroApp(400, "O nome deve ter no máximo 50 caracteres.");
  }
}

module.exports = Categoria;
