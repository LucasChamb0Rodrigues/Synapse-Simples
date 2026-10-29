const $ = (seletor) => document.querySelector(seletor);

class Tela {
  static avisar(texto, tipo = 'success') {
    (document.querySelector('dialog[open]') || document.body).append($('#mensagem'));
    $('#mensagem').innerHTML = `<div class="alert alert-${tipo} shadow">${Tela.esc(texto)}</div>`;
    setTimeout(() => {
      $('#mensagem').innerHTML = '';
    }, 4000);
  }

  static esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  }

  static dinheiro(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  static precoInsumo(valor) {
    return (
      'R$ ' +
      Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    );
  }

  static dataHora(texto) {
    return texto.slice(0, 10).split('-').reverse().join('/') + ' ' + texto.slice(11, 16);
  }

  static porcentagem(valor) {
    return `${Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }

  static formaVenda(produto) {
    return produto.forma_venda === 'caixa'
      ? `Caixa com ${produto.unidades_por_caixa} un.`
      : 'Unidade';
  }

  static precoDeVenda(produto) {
    if (!produto.preco_venda) return '—';
    const por =
      produto.forma_venda === 'caixa' ? `/cx (${produto.unidades_por_caixa} un.)` : '/un.';
    return `${Tela.dinheiro(produto.preco_venda)} <span class="text-muted small">${por}</span>`;
  }

  static margem(custo) {
    if (!custo || custo.margem === null) return '<span class="text-muted">—</span>';
    const cor = custo.margemBaixa ? 'danger' : 'success';
    return `<span class="badge bg-${cor}" title="Margem mínima: ${custo.margemMinima}%">${Tela.porcentagem(custo.margem)}</span>`;
  }

  static indicador(rotulo, valor, detalhe = '') {
    return `
      <div class="indicador">
        <span class="indicador-rotulo">${rotulo}</span>
        <strong class="indicador-valor">${valor}</strong>
        <span class="indicador-detalhe">${detalhe}</span>
      </div>`;
  }

  static custosEmQuadros(custo, rendimento, perda, produto) {
    const precoVenda = produto.preco_venda;
    const caixa = custo.unidadesVenda > 1;
    return `<div class="relatorio-indicadores">
      ${Tela.indicador('Custo por unidade', Tela.precoInsumo(custo.unitario), `rende ${Number(rendimento).toLocaleString('pt-BR')} un. por receita`)}
      ${Tela.indicador('Custo da receita', Tela.dinheiro(custo.lote), `insumos ${Tela.dinheiro(custo.insumos)} + perda ${Tela.porcentagem(perda)}`)}
      ${caixa ? Tela.indicador('Custo da caixa', Tela.precoInsumo(custo.venda), `${custo.unidadesVenda} un. por caixa`) : ''}
      ${Tela.indicador('Preço de venda', precoVenda ? Tela.dinheiro(precoVenda) : '—', precoVenda ? (caixa ? `por caixa com ${custo.unidadesVenda} un.` : 'por unidade') : 'não informado')}
      ${Tela.indicador('Margem', custo.margem === null ? '—' : Tela.porcentagem(custo.margem), custo.margem === null ? '' : custo.margemBaixa ? `abaixo do mínimo de ${custo.margemMinima}%` : `mínimo: ${custo.margemMinima}%`)}
    </div>`;
  }

  static linhaVazia(colunas) {
    return `<tr><td colspan="${colunas}" class="text-center text-muted">Nenhum registro.</td></tr>`;
  }

  static nomePerfil(perfil) {
    return perfil === 'admin' ? 'Admin' : 'Usuário';
  }

  static etiqueta(situacao) {
    const cores = {
      Ativa: 'success',
      Ativo: 'success',
      Desatualizada: 'warning text-dark',
      'Sem ficha': 'secondary',
      Inativo: 'dark',
      Inativa: 'dark',
    };
    return `<span class="badge bg-${cores[situacao]}">${situacao}</span>`;
  }

  static rotularTabelas() {
    document.querySelectorAll('table').forEach((tabela) => {
      const titulos = [...tabela.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      tabela.querySelectorAll('tbody tr').forEach((linha) => {
        [...linha.cells].forEach((celula, i) => {
          if (celula.colSpan === 1) celula.dataset.label = titulos[i] ?? '';
        });
      });
    });
  }

  static confirmar(texto, botao = 'Confirmar') {
    const janela = $('#janela-confirmar');
    $('#confirmar-texto').textContent = texto;
    $('#confirmar-botao').textContent = botao;
    janela.returnValue = '';
    janela.showModal();
    return new Promise((responder) => {
      janela.addEventListener('close', () => responder(janela.returnValue === 'sim'), {
        once: true,
      });
    });
  }
}
