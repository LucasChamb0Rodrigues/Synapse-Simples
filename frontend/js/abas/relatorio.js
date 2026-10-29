class AbaRelatorio extends Aba {
  constructor() {
    super('relatorio');
  }

  async carregar() {
    this.lista = (await Api.chamar('GET', '/api/catalogo')).filter((p) => p.ficha_id);
    $('#relatorio-busca').value = '';
    $('#relatorio-produtos').innerHTML =
      this.lista
        .map(
          (p) => `
      <label class="produto-opcao">
        <input class="form-check-input" type="checkbox" value="${p.id}">
        <span class="produto-opcao-corpo">
          <span class="produto-opcao-codigo">${Tela.esc(p.codigo)}</span>
          <strong>${Tela.esc(p.nome)}</strong>
          <span class="produto-opcao-info">${Tela.esc(p.categoria)} · ficha v${p.versao}</span>
        </span>
        <span class="produto-opcao-custo">${p.custo ? `${Tela.precoInsumo(p.custo.unitario)}/un.` : '—'}</span>
      </label>`,
        )
        .join('') || '<span class="text-muted">Nenhum produto com ficha técnica.</span>';
    this.atualizarSelecao();
  }

  caixas(visiveis = false) {
    return [...document.querySelectorAll('#relatorio-produtos input')].filter(
      (caixa) => !visiveis || !caixa.closest('label').hidden,
    );
  }

  filtrar() {
    const busca = $('#relatorio-busca').value.toLowerCase();
    this.caixas().forEach((caixa) => {
      const opcao = caixa.closest('label');
      opcao.hidden = !opcao.textContent.toLowerCase().includes(busca);
    });
    this.atualizarSelecao();
  }

  marcarTodos() {
    const caixas = this.caixas(true);
    const marcar = !caixas.every((caixa) => caixa.checked);
    caixas.forEach((caixa) => {
      caixa.checked = marcar;
    });
    this.atualizarSelecao();
  }

  atualizarSelecao() {
    const visiveis = this.caixas(true);
    const marcados = this.caixas().filter((caixa) => caixa.checked).length;
    $('#relatorio-marcar').textContent =
      visiveis.length > 0 && visiveis.every((caixa) => caixa.checked)
        ? 'Desmarcar todos'
        : 'Marcar todos';
    $('#relatorio-contagem').textContent =
      marcados === 0
        ? 'Nenhum produto selecionado'
        : `${marcados} de ${this.lista.length} produto(s) selecionado(s)`;
  }

  async gerar() {
    const marcados = this.caixas()
      .filter((caixa) => caixa.checked)
      .map((caixa) => caixa.value);
    const data = $('#relatorio-data').value;
    const { produtos, semFicha } = await Api.chamar(
      'GET',
      `/api/relatorio?produtos=${marcados.join(',')}&data=${data}`,
    );

    let html = `
      <div class="relatorio-cabecalho">
        <h3 class="d-none d-print-block">Relatório de Custo</h3>
        <div class="small text-muted">Gerado por ${Tela.esc(sistema.usuario.nome)} em ${new Date().toLocaleString('pt-BR')}
          · ${data ? 'fichas válidas em ' + data.split('-').reverse().join('/') : 'fichas atuais'} · custos pelos preços atuais dos insumos</div>
      </div>`;
    if (semFicha > 0) {
      html += `<div class="alert alert-warning no-print">${semFicha} produto(s) não tinham ficha técnica nessa data e ficaram de fora.</div>`;
    }
    if (produtos.length > 0)
      html +=
        this.resumo(produtos) +
        this.comparativo(produtos) +
        produtos.map((p) => this.cartaoProduto(p)).join('');

    $('#relatorio-resultado').innerHTML = html;
    document.querySelectorAll('#relatorio-resultado [data-largura]').forEach((barra) => {
      barra.style.width = `${barra.dataset.largura}%`;
    });
    $('#botao-imprimir').hidden = produtos.length === 0;
  }

  resumo(produtos) {
    const ordenados = [...produtos].sort((a, b) => b.custo.unitario - a.custo.unitario);
    const media = produtos.reduce((soma, p) => soma + p.custo.unitario, 0) / produtos.length;
    return `<div class="relatorio-indicadores">
      ${Tela.indicador('Produtos no relatório', produtos.length)}
      ${Tela.indicador('Custo médio por unidade', Tela.precoInsumo(media), 'entre os produtos')}
      ${Tela.indicador('Maior custo por unidade', Tela.precoInsumo(ordenados[0].custo.unitario), Tela.esc(ordenados[0].nome))}
      ${Tela.indicador('Menor custo por unidade', Tela.precoInsumo(ordenados.at(-1).custo.unitario), Tela.esc(ordenados.at(-1).nome))}
    </div>`;
  }

  comparativo(produtos) {
    if (produtos.length < 2) return '';
    const ordenados = [...produtos].sort((a, b) => b.custo.unitario - a.custo.unitario);
    const maior = ordenados[0].custo.unitario || 1;
    return `
      <div class="card relatorio-bloco">
        <h4>Custo por unidade de cada produto</h4>
        <div class="grafico-barras" role="list">
          ${ordenados
            .map(
              (p) => `
            <div class="grafico-linha" role="listitem" title="${Tela.esc(p.codigo)} - ${Tela.esc(p.nome)}: ${Tela.precoInsumo(p.custo.unitario)} por unidade">
              <span class="grafico-rotulo">${Tela.esc(p.nome)}</span>
              <span class="grafico-trilho"><span class="grafico-barra" data-largura="${(p.custo.unitario / maior) * 100}"></span></span>
              <span class="grafico-valor">${Tela.precoInsumo(p.custo.unitario)}</span>
            </div>`,
            )
            .join('')}
        </div>
      </div>`;
  }

  cartaoProduto(p) {
    const itens = [...p.itens].sort((a, b) => b.subtotal - a.subtotal);
    const parte = (item) => (p.custo.insumos > 0 ? (item.subtotal / p.custo.insumos) * 100 : 0);
    const principal = itens[0];
    return `
      <div class="card relatorio-bloco relatorio-produto">
        <div class="relatorio-produto-topo">
          <div>
            <span class="produto-opcao-codigo">${Tela.esc(p.codigo)}</span>
            <h4>${Tela.esc(p.nome)}</h4>
            <div class="small text-muted">${Tela.esc(p.categoria)} · ficha v${p.versao} de ${Tela.dataHora(p.criada_em)}</div>
          </div>
          <div class="relatorio-produto-total">
            <span>Custo por unidade</span>
            <strong>${Tela.precoInsumo(p.custo.unitario)}</strong>
            <span>receita ${Tela.dinheiro(p.custo.lote)} · rende ${Number(p.rendimento).toLocaleString('pt-BR')} un.${p.perda > 0 ? ` · perda ${Tela.porcentagem(p.perda)}` : ''}</span>
            ${p.custo.unidadesVenda > 1 ? `<span>caixa com ${p.custo.unidadesVenda} un. · custo da caixa ${Tela.precoInsumo(p.custo.venda)}</span>` : ''}
            ${p.preco_venda ? `<span>venda ${Tela.dinheiro(p.preco_venda)}${p.custo.unidadesVenda > 1 ? '/cx' : '/un.'} · margem ${Tela.margem(p.custo)}</span>` : ''}
          </div>
        </div>
        ${principal ? `<div class="relatorio-destaque">Maior peso no custo: <strong>${Tela.esc(principal.nome)}</strong> (${Tela.porcentagem(parte(principal))})</div>` : ''}
        <table class="table table-sm mb-0">
          <thead><tr><th>Insumo</th><th>Quantidade</th><th>Custo unitário</th><th>Subtotal</th><th>Participação</th></tr></thead>
          <tbody>${itens
            .map(
              (i) => `
            <tr>
              <td>${Tela.esc(i.nome)}</td><td>${i.quantidade} ${i.unidade}</td><td>${Tela.precoInsumo(i.custo_atual)}</td><td>${Tela.dinheiro(i.subtotal)}</td>
              <td><span class="participacao"><span class="grafico-trilho"><span class="grafico-barra" data-largura="${parte(i)}"></span></span>${Tela.porcentagem(parte(i))}</span></td>
            </tr>`,
            )
            .join('')}
          </tbody>
        </table>
      </div>`;
  }
}
