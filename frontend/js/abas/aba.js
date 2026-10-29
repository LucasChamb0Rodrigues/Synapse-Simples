class Aba {
  constructor(nome) {
    this.nome = nome;
    this.lista = [];
  }

  async carregar() {}

  chamada(metodo, ...argumentos) {
    return `sistema.abas.${this.nome}.${metodo}(${argumentos.join(', ')})`;
  }
}
