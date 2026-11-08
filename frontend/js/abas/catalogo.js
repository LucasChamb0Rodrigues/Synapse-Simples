class AbaCatalogo extends Aba {
  constructor() {
    super('catalogo');
  }

  async carregar() {
    this.lista = await Api.chamar('GET', '/api/catalogo');
    this.desenhar();
  }

  desenhar() {
    const busca = Tela.elemento('#catalogo-busca').value.toLowerCase();
    const filtro = Tela.elemento('#catalogo-filtro').value;
    const lista = this.lista.filter(
      (p) =>
        `${p.nome} ${p.codigo}`.toLowerCase().includes(busca) &&
        (!filtro ||
          (filtro === 'margem' ? p.ativo && p.custo?.margemBaixa : p.situacao === filtro)),
    );

    Tela.elemento('#tabela-catalogo').innerHTML =
      lista
        .map(
          (p) => `
      <tr>
        <td>${Tela.esc(p.codigo)}</td><td>${Tela.esc(p.nome)}</td><td>${Tela.esc(p.categoria)}</td>
        <td>${p.versao ? 'v' + p.versao : '—'}</td>
        <td>${p.custo ? Tela.precoInsumo(p.custo.unitario) : '—'}</td>
        <td>${Tela.precoDeVenda(p)}</td>
        <td>${Tela.margem(p.custo)}</td>
        <td>${Tela.etiqueta(p.situacao)}</td>
        <td><button class="btn btn-sm btn-outline-primary" onclick="${this.chamada('verFicha', p.id)}">Ver</button></td>
      </tr>`,
        )
        .join('') || Tela.linhaVazia(9);

    this.desenharResumo();
  }

  desenharResumo() {
    const ativos = this.lista.filter((p) => p.ativo).length;
    const desatualizadas = this.lista.filter((p) => p.situacao === 'Desatualizada').length;
    const margemBaixa = this.lista.filter((p) => p.ativo && p.custo?.margemBaixa).length;
    const margemMinima = this.lista.find((p) => p.custo)?.custo.margemMinima ?? 30;

    Tela.elemento('#catalogo-resumo').innerHTML = [
      Tela.indicador('Total de produtos', this.lista.length, `${ativos} ativo(s)`),
      Tela.indicador('Fichas desatualizadas', desatualizadas, 'preço de insumo mudou'),
      Tela.indicador('Margem abaixo do mínimo', margemBaixa, `menos de ${margemMinima}%`),
    ].join('');
  }

  async verFicha(id) {
    const { produto, versoes, itens, custo } = await Api.chamar('GET', `/api/catalogo/${id}`);
    Tela.elemento('#janela-ficha-titulo').textContent = `${produto.codigo} - ${produto.nome}`;

    const categoria = Tela.esc(produto.categoria);
    let html;
    if (versoes.length === 0) {
      html = `<p class="small text-muted">${categoria}</p>
        <p class="text-muted">Este produto ainda não tem ficha técnica.</p>`;
    } else {
      html = `
        <p class="small text-muted">${categoria} · Versão ${versoes[0].versao} · ${Tela.dataHora(versoes[0].criada_em)} · ${Tela.esc(versoes[0].usuario_nome)}</p>
        ${Tela.custosEmLista(custo, versoes[0].rendimento, versoes[0].perda, produto)}
        <table class="table table-sm">
          <thead><tr><th>Insumo</th><th>Quantidade</th><th>Preço na ficha</th><th>Preço atual</th><th>Subtotal</th></tr></thead>
          <tbody>${itens
            .map(
              (i) => `
            <tr class="${i.custo_na_ficha !== i.custo_atual ? 'table-warning' : ''}">
              <td>${Tela.esc(i.nome)}</td><td>${i.quantidade} ${i.unidade}</td>
              <td>${Tela.precoInsumo(i.custo_na_ficha)}</td><td>${Tela.precoInsumo(i.custo_atual)}</td><td>${Tela.dinheiro(i.subtotal)}</td>
            </tr>`,
            )
            .join('')}
          </tbody>
          <tfoot><tr><th colspan="4" class="text-end">Custo dos insumos (preços atuais)</th><th>${Tela.dinheiro(custo.insumos)}</th></tr></tfoot>
        </table>
        <p class="small text-muted">Linhas em amarelo: o preço do insumo mudou desde que a ficha foi salva.</p>`;
    }
    Tela.elemento('#janela-ficha-corpo').innerHTML = html;
    Tela.elemento('#janela-ficha').showModal();
  }
}
