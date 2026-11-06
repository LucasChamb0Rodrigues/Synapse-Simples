class AbaMargem extends Aba {
  constructor() {
    super('margem');
  }

  async carregar() {
    const categorias = await Api.chamar('GET', '/api/categorias');
    const campo = Tela.elemento('#margem-categoria');
    const escolhida = campo.value;
    campo.innerHTML =
      '<option value="">Todas as categorias</option>' +
      categorias.map((c) => `<option value="${c.id}">${Tela.esc(c.nome)}</option>`).join('');
    campo.value = escolhida;
  }

  async gerar() {
    const campo = Tela.elemento('#margem-categoria');
    const baixa = Tela.elemento('#margem-baixa').checked ? '1' : '0';
    const { produtos, semMargem } = await Api.chamar(
      'GET',
      `/api/margem?categoria=${campo.value}&baixa=${baixa}`,
    );
    const filtro = campo.value ? campo.selectedOptions[0].textContent : 'todas as categorias';

    let html = `
      <div class="relatorio-cabecalho">
        <h3 class="d-none d-print-block">Relatório de Margem de Lucro</h3>
        <div class="small text-muted">Gerado por ${Tela.esc(sistema.usuario.nome)} em ${new Date().toLocaleString('pt-BR')}
          · ${Tela.esc(filtro)}${baixa === '1' ? ' · só margem abaixo de 30%' : ''} · custos pelos preços atuais dos insumos</div>
      </div>`;
    if (semMargem.length > 0) {
      const lista = semMargem.map((p) => `${Tela.esc(p.codigo)} ${Tela.esc(p.nome)} (${p.motivo})`);
      html += `<div class="alert alert-warning no-print">Ficaram de fora: ${lista.join('; ')}.</div>`;
    }
    if (produtos.length === 0) {
      html += '<div class="alert alert-info">Nenhum produto para mostrar com esses filtros.</div>';
    } else {
      html += this.resumo(produtos) + this.grafico(produtos) + this.tabela(produtos);
    }

    Tela.elemento('#margem-resultado').innerHTML = html;
    document.querySelectorAll('#margem-resultado [data-largura]').forEach((barra) => {
      barra.style.width = `${barra.dataset.largura}%`;
    });
    Tela.elemento('#margem-imprimir').hidden = produtos.length === 0;
  }

  resumo(produtos) {
    const media = produtos.reduce((soma, p) => soma + p.custo.margem, 0) / produtos.length;
    const baixas = produtos.filter((p) => p.custo.margemBaixa).length;
    const pior = produtos[0];
    return `<div class="relatorio-indicadores">
      ${Tela.indicador('Produtos no relatório', produtos.length)}
      ${Tela.indicador('Margem média', Tela.porcentagem(media), 'entre os produtos')}
      ${Tela.indicador('Abaixo de 30%', baixas, 'precisam de atenção')}
      ${Tela.indicador('Menor margem', Tela.porcentagem(pior.custo.margem), Tela.esc(pior.nome))}
    </div>`;
  }

  grafico(produtos) {
    return `
      <div class="card relatorio-bloco">
        <h4>Margem de cada produto</h4>
        <div class="grafico-barras" role="list">
          ${produtos
            .map(
              (p) => `
            <div class="grafico-linha" role="listitem" title="${Tela.esc(p.codigo)} - ${Tela.esc(p.nome)}: margem de ${Tela.porcentagem(p.custo.margem)}">
              <span class="grafico-rotulo">${Tela.esc(p.nome)}</span>
              <span class="grafico-trilho"><span class="grafico-barra${p.custo.margemBaixa ? ' alerta' : ''}" data-largura="${Math.max(p.custo.margem, 0)}"></span></span>
              <span class="grafico-valor">${Tela.porcentagem(p.custo.margem)}</span>
            </div>`,
            )
            .join('')}
        </div>
      </div>`;
  }

  tabela(produtos) {
    return `
      <div class="card relatorio-bloco">
        <h4>Custo, preço e lucro de cada produto</h4>
        <table class="table table-sm mb-0 relatorio-tabela">
          <thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Custo</th><th>Preço de venda</th><th>Lucro</th><th>Margem</th></tr></thead>
          <tbody>${produtos
            .map((p) => {
              const por = p.custo.unidadesVenda > 1 ? `/cx (${p.custo.unidadesVenda} un.)` : '/un.';
              return `
            <tr>
              <td>${Tela.esc(p.codigo)}</td><td>${Tela.esc(p.nome)}</td><td>${Tela.esc(p.categoria)}</td>
              <td>${Tela.precoInsumo(p.custo.venda)}${por}</td><td>${Tela.dinheiro(p.preco_venda)}${por}</td>
              <td>${Tela.dinheiro(p.preco_venda - p.custo.venda)}</td><td>${Tela.margem(p.custo)}</td>
            </tr>`;
            })
            .join('')}
          </tbody>
        </table>
        <p class="small text-muted mt-2 mb-0">Margem = (preço de venda − custo) ÷ preço de venda. Produto vendido em caixa usa o custo da caixa inteira.</p>
      </div>`;
  }
}
