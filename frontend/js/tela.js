class Tela {
  static elemento(seletor) {
    return document.querySelector(seletor);
  }

  static avisar(texto, tipo = 'success') {
    (document.querySelector('dialog[open]') || document.body).append(Tela.elemento('#mensagem'));
    Tela.elemento('#mensagem').innerHTML =
      `<div class="alert alert-${tipo} shadow">${Tela.esc(texto)}</div>`;
    setTimeout(() => {
      Tela.elemento('#mensagem').innerHTML = '';
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

  static custosEmLista(custo, rendimento, perda, produto) {
    const precoVenda = produto.preco_venda;
    const caixa = custo.unidadesVenda > 1;
    const item = (rotulo, valor, detalhe = '', classe = '') =>
      `<div><span>${rotulo}${detalhe ? ` <span class="text-muted">(${detalhe})</span>` : ''}</span><strong class="${classe}">${valor}</strong></div>`;
    return `<div class="ficha-lista-custos">
      ${item('Custo por unidade', Tela.precoInsumo(custo.unitario), `rende ${Number(rendimento).toLocaleString('pt-BR')} un.`)}
      ${item('Custo da receita', Tela.dinheiro(custo.lote), `perda ${Tela.porcentagem(perda)}`)}
      ${caixa ? item('Custo da caixa', Tela.precoInsumo(custo.venda), `${custo.unidadesVenda} un.`) : ''}
      ${item(`Preço de venda da ${caixa ? 'caixa' : 'unidade'}`, precoVenda ? Tela.dinheiro(precoVenda) : '—')}
      ${item('Margem', custo.margem === null ? '—' : Tela.porcentagem(custo.margem), `mínimo ${custo.margemMinima}%`, custo.margemBaixa ? 'text-danger' : '')}
    </div>`;
  }

  // Mensagem de uma lista sem nada para mostrar: título, explicação e botão (os dois últimos opcionais)
  static estado(titulo, texto = '', botao = '', classe = '') {
    return `<div class="estado-lista ${classe}"><strong>${titulo}</strong>${texto ? `<span>${texto}</span>` : ''}${botao}</div>`;
  }

  static linhaVazia(colunas, titulo = 'Nenhum registro.', texto = '', botao = '', classe = '') {
    return `<tr class="linha-estado"><td colspan="${colunas}">${Tela.estado(titulo, texto, botao, classe)}</td></tr>`;
  }

  static botao(texto, acao, estilo = 'btn-outline-secondary') {
    return `<button type="button" class="btn btn-sm ${estilo}" onclick="${acao}">${texto}</button>`;
  }

  // Ao abrir uma aba, as listas (data-lista) ainda vazias mostram "Carregando..." até os dados chegarem
  static marcarCarregando(secao, carregando) {
    secao.setAttribute('aria-busy', String(carregando));
    if (!carregando) return;
    secao.querySelectorAll('[data-lista]').forEach((lista) => {
      if (lista.children.length === 0 || lista.querySelector('.estado-falha'))
        Tela.avisarNaLista(lista, 'Carregando...', '', 'estado-carregando');
    });
  }

  // Se a aba não conseguiu buscar os dados, as listas mostram o erro e um botão para tentar de novo
  static marcarFalha(secao, tentarDeNovo) {
    secao.querySelectorAll('[data-lista]').forEach((lista) => {
      const botao = Tela.botao('Tentar de novo', tentarDeNovo);
      Tela.avisarNaLista(lista, 'Não foi possível carregar os dados.', botao, 'estado-falha');
    });
  }

  static avisarNaLista(lista, titulo, botao, classe) {
    lista.innerHTML =
      lista.tagName === 'TBODY'
        ? Tela.linhaVazia(lista.closest('table').tHead.rows[0].cells.length, titulo, '', botao, classe)
        : Tela.estado(titulo, '', botao, classe);
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
    const janela = Tela.elemento('#janela-confirmar');
    Tela.elemento('#confirmar-texto').textContent = texto;
    Tela.elemento('#confirmar-botao').textContent = botao;
    janela.returnValue = '';
    janela.showModal();
    return new Promise((responder) => {
      janela.addEventListener('close', () => responder(janela.returnValue === 'sim'), {
        once: true,
      });
    });
  }
}
