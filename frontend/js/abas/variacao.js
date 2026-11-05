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
      html += '<div class="alert alert-info">Nenhum insumo mudou de preço nesse período.</div>';
    } else {
      html += this.resumo(mudancas) + this.tabela(mudancas);
    }

    Tela.elemento('#variacao-resultado').innerHTML = html;
    Tela.elemento('#variacao-imprimir').hidden = mudancas.length === 0;
  }

  resumo(mudancas) {
    const insumos = new Set(mudancas.map((m) => m.nome)).size;
    const aumentos = mudancas.filter((m) => m.variacao > 0);
    const maior = [...aumentos].sort((a, b) => b.variacao - a.variacao)[0];
    const comVariacao = mudancas.filter((m) => m.variacao !== null);
    const media =
      comVariacao.reduce((soma, m) => soma + m.variacao, 0) / (comVariacao.length || 1);
    return `<div class="relatorio-indicadores">
      ${Tela.indicador('Mudanças de preço', mudancas.length, `em ${insumos} insumo(s)`)}
      ${Tela.indicador('Aumentos', aumentos.length, `${mudancas.length - aumentos.length} redução(ões)`)}
      ${Tela.indicador('Maior aumento', maior ? this.variacao(maior.variacao) : '—', maior ? Tela.esc(maior.nome) : 'nenhum aumento')}
      ${Tela.indicador('Variação média', this.variacao(media), 'entre as mudanças')}
    </div>`;
  }

  tabela(mudancas) {
    return `
      <div class="card relatorio-bloco">
        <h4>Mudanças de preço no período</h4>
        <table class="table table-sm mb-0 relatorio-tabela">
          <thead><tr><th>Data</th><th>Insumo</th><th>Preço anterior</th><th>Preço novo</th><th>Variação</th><th>Usado em</th><th>Alterado por</th></tr></thead>
          <tbody>${mudancas
            .map(
              (m) => `
            <tr>
              <td>${Tela.dataHora(m.alterado_em)}</td><td>${Tela.esc(m.nome)}</td>
              <td>${Tela.precoInsumo(m.custo_anterior)}/${m.unidade}</td><td>${Tela.precoInsumo(m.custo_novo)}/${m.unidade}</td>
              <td>${this.variacao(m.variacao)}</td><td>${m.produtos > 0 ? `${m.produtos} produto(s)` : '—'}</td>
              <td>${Tela.esc(m.usuario_nome)}</td>
            </tr>`,
            )
            .join('')}
          </tbody>
        </table>
        <p class="small text-muted mt-2 mb-0">Aumento em vermelho e redução em verde. "Usado em" conta os produtos que têm o insumo na ficha técnica atual.</p>
      </div>`;
  }

  variacao(valor) {
    if (valor === null) return '—';
    const cor = valor > 0 ? 'text-danger' : 'text-success';
    return `<span class="${cor}">${valor > 0 ? '+' : ''}${Tela.porcentagem(valor)}</span>`;
  }
}
