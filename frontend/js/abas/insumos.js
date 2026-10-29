class AbaInsumos extends Cadastro {
  constructor() {
    super('insumos', 'insumo', 'Inativar este insumo? Ele não poderá ser usado em novas fichas, mas continua nas fichas já salvas.');
  }

  desenhar() {
    $('#tabela-insumos').innerHTML = this.filtrar((i) => [i.nome, i.unidade]).map((i) => `
      <tr>
        <td>${Tela.esc(i.nome)}</td><td>${i.unidade}</td><td>${Tela.precoInsumo(i.custo)}</td><td>${this.situacao(i)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" onclick="${this.chamada('historico', i.id)}">Histórico</button>
          ${this.botoes(i)}
        </td>
      </tr>`).join('') || Tela.linhaVazia(5);
  }

  editar(id) {
    super.editar(id);
    this.dica('Se você mudar o custo, as fichas técnicas que usam este insumo aparecerão como "Desatualizada" no Catálogo.');
  }

  async historico(id) {
    const { insumo, precos } = await Api.chamar('GET', `/api/insumos/${id}/precos`);
    $('#janela-ficha-titulo').textContent = `Histórico de preços — ${insumo.nome}`;
    const primeiro = precos[0]?.custo_novo;
    const variacao = primeiro > 0 ? ((insumo.custo - primeiro) / primeiro) * 100 : null;
    const sinal = (v) => (v > 0 ? '+' : '') + Tela.porcentagem(v);

    $('#janela-ficha-corpo').innerHTML = `
      <div class="relatorio-indicadores">
        ${Tela.indicador('Preço atual', Tela.precoInsumo(insumo.custo), `por ${insumo.unidade}`)}
        ${Tela.indicador('Primeiro registro', primeiro !== undefined ? Tela.precoInsumo(primeiro) : '—', precos[0] ? Tela.dataHora(precos[0].alterado_em).slice(0, 10) : '')}
        ${Tela.indicador('Variação no período', variacao === null ? '—' : sinal(variacao), `${Math.max(precos.length - 1, 0)} alteração(ões)`)}
      </div>
      <table class="table table-sm">
        <thead><tr><th>Data</th><th>De</th><th>Para</th><th>Variação</th><th>Usuário</th></tr></thead>
        <tbody>${[...precos].reverse().map((p) => `
          <tr>
            <td>${Tela.dataHora(p.alterado_em)}</td>
            <td>${p.custo_anterior === null ? '—' : Tela.precoInsumo(p.custo_anterior)}</td>
            <td>${Tela.precoInsumo(p.custo_novo)}</td>
            <td>${p.custo_anterior > 0 ? sinal(((p.custo_novo - p.custo_anterior) / p.custo_anterior) * 100) : '—'}</td>
            <td>${Tela.esc(p.usuario_nome)}</td>
          </tr>`).join('') || Tela.linhaVazia(5)}
        </tbody>
      </table>`;
    $('#janela-ficha').showModal();
  }
}
