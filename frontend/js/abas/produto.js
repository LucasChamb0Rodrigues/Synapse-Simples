class AbaProdutos extends Cadastro {
  constructor() {
    super(
      'produtos',
      'produto',
      'Inativar este produto? Ele sai do catálogo de consulta e não recebe novas fichas, mas o histórico fica guardado.',
    );
  }

  async carregar() {
    this.categorias = await Api.chamar('GET', '/api/categorias');
    this.lista = await Api.chamar('GET', '/api/catalogo');
    this.desenhar();
  }

  abrirJanela(id) {
    const atual = this.lista.find((p) => p.id === id)?.categoria_id;
    Tela.elemento('#produto-categoria').innerHTML =
      '<option value="">Selecione...</option>' +
      this.categorias
        .filter((c) => c.ativo || c.id === atual)
        .map(
          (c) =>
            `<option value="${c.id}">${Tela.esc(c.nome)}${c.ativo ? '' : ' (inativa)'}</option>`,
        )
        .join('');
    super.abrirJanela(id);
    this.alternarCaixa();
  }

  alternarCaixa() {
    const campos = Tela.elemento('#editar-campos');
    const caixa = campos.querySelector('[name="forma_venda"]').value === 'caixa';
    const quantidade = campos.querySelector('[name="unidades_por_caixa"]');
    quantidade.parentElement.hidden = !caixa;
    quantidade.required = caixa;
    campos.querySelector('[data-ajuda-preco]').textContent = caixa
      ? 'Preço da caixa inteira.'
      : 'Preço de uma unidade.';
  }

  desenhar() {
    Tela.elemento('#tabela-produtos').innerHTML =
      this.filtrar((p) => [p.codigo, p.nome, p.categoria])
        .map(
          (p) => `
      <tr>
        <td>${Tela.esc(p.codigo)}</td><td>${Tela.esc(p.nome)}</td><td>${Tela.esc(p.categoria)}</td>
        <td>${Tela.formaVenda(p)}</td><td>${Tela.precoDeVenda(p)}</td><td>${Tela.etiqueta(p.situacao)}</td>
        <td class="text-end text-nowrap">${this.botoes(p)}</td>
      </tr>`,
        )
        .join('') || Tela.linhaVazia(7);
  }
}
