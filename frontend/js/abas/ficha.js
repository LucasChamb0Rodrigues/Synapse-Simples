class AbaFicha extends Aba {
  constructor() {
    super('ficha');
    this.insumosDisponiveis = [];
    this.itens = [];
  }

  async carregar() {
    const produtos = await Api.chamar('GET', '/api/catalogo');
    this.insumosDisponiveis = (await Api.chamar('GET', '/api/insumos')).filter((i) => i.ativo);

    $('#ficha-produto').innerHTML = '<option value="">Selecione o produto...</option>' +
      produtos.filter((p) => p.ativo).map((p) => `<option value="${p.id}">${Tela.esc(p.codigo)} - ${Tela.esc(p.nome)}</option>`).join('');
    $('#ficha-insumo').innerHTML = this.insumosDisponiveis
      .map((i) => `<option value="${i.id}">${Tela.esc(i.nome)} (${i.unidade})</option>`).join('');
    $('#ficha-editor').hidden = true;
    $('#ficha-info').textContent = '';
  }

  async escolherProduto() {
    const id = $('#ficha-produto').value;
    $('#ficha-editor').hidden = !id;
    if (!id) return;

    const { produto, versoes, itens } = await Api.chamar('GET', `/api/catalogo/${id}`);
    this.precoVenda = produto.preco_venda;
    this.unidadesVenda = produto.forma_venda === 'caixa' && produto.unidades_por_caixa > 0 ? produto.unidades_por_caixa : 1;
    $('#ficha-rendimento').value = versoes[0]?.rendimento ?? 1;
    $('#ficha-perda').value = versoes[0]?.perda ?? 0;
    this.itens = itens.map((i) => ({ insumo_id: i.insumo_id, nome: i.nome, unidade: i.unidade, custo: i.custo_atual, quantidade: i.quantidade, ativo: i.ativo }));

    $('#ficha-info').textContent = versoes.length
      ? `Versão atual: v${versoes[0].versao}. Ao salvar, será criada a versão ${versoes[0].versao + 1}.`
      : 'Este produto ainda não tem ficha. Ao salvar, será criada a versão 1.';
    $('#ficha-versoes').innerHTML = versoes.map((v) => `
      <li class="list-group-item d-flex justify-content-between">
        <span>v${v.versao} — ${Tela.dataHora(v.criada_em)} — ${Tela.esc(v.usuario_nome)}</span><strong>${Tela.precoInsumo(v.custo_total / v.rendimento)}/un. <span class="text-muted fw-normal">· receita ${Tela.dinheiro(v.custo_total)}</span></strong>
      </li>`).join('') || '<li class="list-group-item text-muted">Nenhuma versão ainda.</li>';
    this.desenharItens();
  }

  adicionarItem() {
    const insumo = this.insumosDisponiveis.find((i) => i.id === Number($('#ficha-insumo').value));
    const quantidade = Number($('#ficha-quantidade').value);
    if (!insumo) return Tela.avisar('Cadastre insumos antes de montar a ficha.', 'danger');
    if (!(quantidade > 0)) return Tela.avisar('Informe uma quantidade maior que zero.', 'danger');
    const posicao = this.itens.findIndex((item) => item.insumo_id === insumo.id);
    if (posicao >= 0) {
      Tela.avisar('Este insumo já está na ficha. Altere a quantidade direto na tabela.', 'danger');
      return $(`#ficha-qtd-${posicao}`).select();
    }
    this.itens.push({ insumo_id: insumo.id, nome: insumo.nome, unidade: insumo.unidade, custo: insumo.custo, quantidade, ativo: true });
    $('#ficha-quantidade').value = '';
    this.desenharItens();
  }

  removerItem(posicao) {
    this.itens.splice(posicao, 1);
    this.desenharItens();
  }

  mudarQuantidade(posicao, valor) {
    const item = this.itens[posicao];
    item.quantidade = Number(valor);
    $(`#ficha-qtd-${posicao}`).classList.toggle('is-invalid', !(item.quantidade > 0));
    $(`#ficha-subtotal-${posicao}`).textContent = Tela.dinheiro(item.quantidade * item.custo);
    this.desenharTotal();
  }

  desenharItens() {
    $('#tabela-ficha').innerHTML = this.itens.map((item, posicao) => `
      <tr class="${item.ativo ? '' : 'table-warning'}">
        <td>${Tela.esc(item.nome)}${item.ativo ? '' : ' <span class="badge bg-dark">inativo</span>'}</td>
        <td>
          <div class="input-group input-group-sm campo-quantidade">
            <input class="form-control" id="ficha-qtd-${posicao}" type="number" step="0.001" min="0" value="${item.quantidade}"
                   oninput="${this.chamada('mudarQuantidade', posicao, 'this.value')}">
            <span class="input-group-text">${item.unidade}</span>
          </div>
        </td>
        <td>${Tela.precoInsumo(item.custo)}</td><td id="ficha-subtotal-${posicao}">${Tela.dinheiro(item.quantidade * item.custo)}</td>
        <td><button class="btn btn-sm btn-outline-danger" onclick="${this.chamada('removerItem', posicao)}">Remover</button></td>
      </tr>`).join('') || Tela.linhaVazia(5);
    this.desenharTotal();
  }

  custoAtual() {
    const insumos = this.itens.reduce((soma, item) => soma + item.quantidade * item.custo, 0);
    const rendimento = Number($('#ficha-rendimento').value);
    const perda = Number($('#ficha-perda').value) || 0;
    const lote = Math.round(insumos * (1 + perda / 100) * 100) / 100;
    const unitario = rendimento > 0 ? lote / rendimento : null;
    const venda = unitario === null ? null : unitario * this.unidadesVenda;
    const margem = this.precoVenda > 0 && venda !== null ? ((this.precoVenda - venda) / this.precoVenda) * 100 : null;
    return { insumos, rendimento, perda, lote, unitario, venda, margem };
  }

  desenharTotal() {
    const custo = this.custoAtual();
    $('#ficha-total').textContent = Tela.dinheiro(custo.insumos);
    $('#ficha-rendimento').classList.toggle('is-invalid', !(custo.rendimento > 0));
    $('#ficha-perda').classList.toggle('is-invalid', !(custo.perda >= 0 && custo.perda < 100));
    const item = (rotulo, valor, destaque = false) => `<div class="${destaque ? 'ficha-custo-destaque' : ''}"><span>${rotulo}</span><strong>${valor}</strong></div>`;
    $('#ficha-custos').innerHTML = [
      item('Custo da receita (com perda)', Tela.dinheiro(custo.lote)),
      item('Custo por unidade', custo.unitario === null ? '—' : Tela.precoInsumo(custo.unitario), true),
      this.unidadesVenda > 1 ? item(`Custo da caixa (${this.unidadesVenda} un.)`, custo.venda === null ? '—' : Tela.precoInsumo(custo.venda)) : '',
      item('Margem', custo.margem === null ? (this.precoVenda ? '—' : 'sem preço de venda') : Tela.porcentagem(custo.margem)),
    ].join('');
  }

  async salvar() {
    const inativo = this.itens.find((item) => !item.ativo);
    if (inativo) return Tela.avisar(`O insumo ${inativo.nome} está inativo. Remova-o da ficha ou reative-o em Insumos.`, 'danger');
    const invalido = this.itens.findIndex((item) => !(item.quantidade > 0));
    if (invalido >= 0) {
      Tela.avisar(`Informe uma quantidade maior que zero para ${this.itens[invalido].nome}.`, 'danger');
      return $(`#ficha-qtd-${invalido}`).focus();
    }
    const { rendimento, perda } = this.custoAtual();
    if (!(rendimento > 0)) return Tela.avisar('Informe quantas unidades a receita rende.', 'danger');
    if (!(perda >= 0 && perda < 100)) return Tela.avisar('A perda deve ser um percentual entre 0 e 99.', 'danger');
    const itens = this.itens.map((item) => ({ insumo_id: item.insumo_id, quantidade: item.quantidade }));
    const resposta = await Api.chamar('POST', `/api/produtos/${$('#ficha-produto').value}/ficha`, { itens, rendimento, perda });
    Tela.avisar(`Ficha salva: versão ${resposta.versao}, custo por unidade ${Tela.precoInsumo(resposta.custoUnitario)}.`);
    this.escolherProduto();
  }
}
