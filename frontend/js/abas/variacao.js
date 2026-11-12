class AbaVariacao extends Aba {
  constructor() {
    super('variacao');
  }

  carregar() {
    const hoje = new Date();
    const inicio = Tela.elemento('#variacao-inicio');
    const fim = Tela.elemento('#variacao-fim');
    if (!inicio.value) inicio.value = `${hoje.getFullYear()}-01-01`;
    if (!fim.value) {
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const dia = String(hoje.getDate()).padStart(2, '0');
      fim.value = `${hoje.getFullYear()}-${mes}-${dia}`;
    }
  }

  async gerar() {
    const inicio = Tela.elemento('#variacao-inicio').value;
    const fim = Tela.elemento('#variacao-fim').value;
    const mudancas = await Api.chamar('GET', `/api/variacao?inicio=${inicio}&fim=${fim}`);
    const data = (texto) => texto.split('-').reverse().join('/');

    let html = `
      <div class="relatorio-cabecalho">
        <h3 class="d-none d-print-block">Relatório de Variação de Preços</h3>
        <div class="small text-muted">Gerado por ${Tela.esc(sistema.usuario.nome)} em ${new Date().toLocaleString('pt-BR')}
          · período de ${data(inicio)} a ${data(fim)}</div>
      </div>`;
    if (mudancas.length === 0) {
      html +=
        '<div class="alert alert-info">Nenhum insumo mudou de preço nesse período. Experimente um período maior.</div>';
    } else {
      const insumos = this.porInsumo(mudancas);
      html += this.resumo(insumos, mudancas) + this.tabelaInsumos(insumos) + this.tabela(mudancas);
    }

    Tela.elemento('#variacao-resultado').innerHTML = html;
    Tela.elemento('#variacao-imprimir').hidden = mudancas.length === 0;
  }

  porInsumo(mudancas) {
    const insumos = new Map();
    for (const m of mudancas) {
      if (!insumos.has(m.nome)) {
        insumos.set(m.nome, {
          nome: m.nome,
          unidade: m.unidade,
          inicio: m.custo_anterior,
          mudancas: 0,
          produtos: m.produtos,
        });
      }
      const insumo = insumos.get(m.nome);
      insumo.fim = m.custo_novo;
      insumo.mudancas++;
    }
    return [...insumos.values()]
      .map((i) => ({
        ...i,
        variacao: i.inicio > 0 ? Math.round(((i.fim - i.inicio) / i.inicio) * 1000) / 10 : null,
      }))
      .sort((a, b) => (b.variacao ?? -999) - (a.variacao ?? -999));
  }

  resumo(insumos, mudancas) {
    const subiram = insumos.filter((i) => i.variacao > 0);
    const maior = subiram[0];
    const comVariacao = insumos.filter((i) => i.variacao !== null);
    const media =
      comVariacao.reduce((soma, i) => soma + i.variacao, 0) / (comVariacao.length || 1);
    return `<div class="relatorio-indicadores">
      ${Tela.indicador('Mudanças de preço', mudancas.length, `em ${insumos.length} insumo(s)`)}
      ${Tela.indicador('Insumos que subiram', subiram.length, `de ${insumos.length} insumo(s)`)}
      ${Tela.indicador('Maior aumento', maior ? this.variacao(maior.variacao) : '—', maior ? Tela.esc(maior.nome) : 'nenhum aumento')}
      ${Tela.indicador('Variação média', this.variacao(media), 'por insumo, no período')}
    </div>`;
  }

  tabelaInsumos(insumos) {
    return `
      <div class="card relatorio-bloco">
        <h4>Variação no período, por insumo</h4>
        <table class="table table-sm mb-0 relatorio-tabela">
          <thead><tr><th>Insumo</th><th>Preço no início</th><th>Preço no fim</th><th>Variação</th><th>Mudanças</th><th>Usado em</th></tr></thead>
          <tbody>${insumos
            .map(
              (i) => `
            <tr>
              <td>${Tela.esc(i.nome)}</td>
              <td>${Tela.precoInsumo(i.inicio)}/${i.unidade}</td><td>${Tela.precoInsumo(i.fim)}/${i.unidade}</td>
              <td>${this.variacao(i.variacao)}</td><td>${i.mudancas}</td><td>${this.usadoEm(i.produtos)}</td>
            </tr>`,
            )
            .join('')}
          </tbody>
        </table>
        <p class="small text-muted mt-2 mb-0">Preço no início: antes da primeira mudança do período. Preço no fim: depois da última.</p>
      </div>`;
  }

  tabela(mudancas) {
    return `
      <div class="card relatorio-bloco">
        <h4>Todas as mudanças de preço</h4>
        <table class="table table-sm mb-0 relatorio-tabela">
          <thead><tr><th>Data</th><th>Insumo</th><th>Preço anterior</th><th>Preço novo</th><th>Variação</th><th>Usado em</th><th>Alterado por</th></tr></thead>
          <tbody>${mudancas
            .map(
              (m) => `
            <tr>
              <td>${Tela.dataHora(m.alterado_em)}</td><td>${Tela.esc(m.nome)}</td>
              <td>${Tela.precoInsumo(m.custo_anterior)}/${m.unidade}</td><td>${Tela.precoInsumo(m.custo_novo)}/${m.unidade}</td>
              <td>${this.variacao(m.variacao)}</td><td>${this.usadoEm(m.produtos)}</td>
              <td>${Tela.esc(m.usuario_nome)}</td>
            </tr>`,
            )
            .join('')}
          </tbody>
        </table>
        <p class="small text-muted mt-2 mb-0">Aumento em vermelho e redução em verde. "Usado em" conta os produtos ativos que têm o insumo na ficha técnica atual.</p>
      </div>`;
  }

  variacao(valor) {
    if (valor === null) return '—';
    const cor = valor > 0 ? 'text-danger' : 'text-success';
    return `<span class="${cor}">${valor > 0 ? '+' : ''}${Tela.porcentagem(valor)}</span>`;
  }

  usadoEm(produtos) {
    return produtos > 0 ? `${produtos} produto(s)` : '—';
  }
}
