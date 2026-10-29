class AbaCatalogo extends Aba {
  constructor() {
    super('catalogo');
  }

  async carregar() {
    this.lista = await Api.chamar('GET', '/api/catalogo');
    this.desenhar();
  }

  desenhar() {
    const busca = $('#catalogo-busca').value.toLowerCase();
    const filtro = $('#catalogo-filtro').value;
    const lista = this.lista.filter((p) =>
      `${p.nome} ${p.codigo}`.toLowerCase().includes(busca)
      && (!filtro || (filtro === 'margem' ? p.ativo && p.custo?.margemBaixa : p.situacao === filtro)));

    $('#tabela-catalogo').innerHTML = lista.map((p) => `
      <tr>
        <td>${Tela.esc(p.codigo)}</td><td>${Tela.esc(p.nome)}</td><td>${Tela.esc(p.categoria)}</td>
        <td>${p.versao ? 'v' + p.versao : '—'}</td>
        <td>${p.custo ? Tela.precoInsumo(p.custo.unitario) : '—'}</td>
        <td>${Tela.precoDeVenda(p)}</td>
        <td>${Tela.margem(p.custo)}</td>
        <td>${Tela.etiqueta(p.situacao)}</td>
        <td><button class="btn btn-sm btn-outline-primary" onclick="${this.chamada('verFicha', p.id)}">Ver</button></td>
      </tr>`).join('') || Tela.linhaVazia(9);

    const desatualizadas = this.lista.filter((p) => p.situacao === 'Desatualizada').length;
    $('#aviso-desatualizadas').hidden = desatualizadas === 0;
    $('#aviso-desatualizadas').textContent = `${desatualizadas} produto(s) com ficha desatualizada: o preço de algum insumo mudou desde que a ficha foi salva.`;

    const margemBaixa = this.lista.filter((p) => p.ativo && p.custo?.margemBaixa);
    $('#aviso-margem').hidden = margemBaixa.length === 0;
    $('#aviso-margem').textContent = margemBaixa.length
      ? `${margemBaixa.length} produto(s) com margem abaixo de ${margemBaixa[0].custo.margemMinima}%: o custo por unidade está alto para o preço de venda.`
      : '';
  }

  async verFicha(id) {
    const { produto, versoes, itens, custo } = await Api.chamar('GET', `/api/catalogo/${id}`);
    $('#janela-ficha-titulo').textContent = `${produto.codigo} - ${produto.nome}`;

    let html = `<p>Categoria: <strong>${Tela.esc(produto.categoria)}</strong></p>`;
    if (versoes.length === 0) {
      html += '<p class="text-muted">Este produto ainda não tem ficha técnica.</p>';
    } else {
      html += `
        <p class="small text-muted">Versão ${versoes[0].versao}, salva em ${Tela.dataHora(versoes[0].criada_em)} por ${Tela.esc(versoes[0].usuario_nome)}</p>
        ${Tela.custosEmQuadros(custo, versoes[0].rendimento, versoes[0].perda, produto)}
        <table class="table table-sm">
          <thead><tr><th>Insumo</th><th>Quantidade</th><th>Preço na ficha</th><th>Preço atual</th><th>Subtotal</th></tr></thead>
          <tbody>${itens.map((i) => `
            <tr class="${i.custo_na_ficha !== i.custo_atual ? 'table-warning' : ''}">
              <td>${Tela.esc(i.nome)}</td><td>${i.quantidade} ${i.unidade}</td>
              <td>${Tela.precoInsumo(i.custo_na_ficha)}</td><td>${Tela.precoInsumo(i.custo_atual)}</td><td>${Tela.dinheiro(i.subtotal)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr><th colspan="4" class="text-end">Custo dos insumos (preços atuais)</th><th>${Tela.dinheiro(custo.insumos)}</th></tr></tfoot>
        </table>
        <p class="small text-muted">Linhas em amarelo: o preço do insumo mudou desde que a ficha foi salva.</p>`;
    }
    $('#janela-ficha-corpo').innerHTML = html;
    $('#janela-ficha').showModal();
  }
}
