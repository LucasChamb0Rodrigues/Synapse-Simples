class AbaCategorias extends Cadastro {
  constructor() {
    super(
      'categorias',
      'categoria',
      'Inativar esta categoria? Ela não poderá ser escolhida para novos produtos; os produtos atuais continuam nela.',
      true,
    );
  }

  desenhar() {
    Tela.elemento('#tabela-categorias').innerHTML =
      this.filtrar((c) => [c.nome])
        .map(
          (c) => `
      <tr><td>${Tela.esc(c.nome)}</td><td>${this.situacao(c)}</td><td class="text-end text-nowrap">${this.botoes(c)}</td></tr>`,
        )
        .join('') || Tela.linhaVazia(3);
  }
}
