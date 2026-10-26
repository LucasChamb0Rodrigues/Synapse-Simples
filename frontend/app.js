const $ = (seletor) => document.querySelector(seletor);

class Api {
  static async chamar(metodo, url, dados) {
    const resposta = await fetch(API_URL + url, {
      method: metodo,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: dados && JSON.stringify(dados),
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (resposta.ok) return corpo;
    if (resposta.status === 401 && sistema.usuario) location.reload();
    Tela.avisar(corpo.erro || 'Erro ao comunicar com o servidor.', 'danger');
    throw new Error(corpo.erro);
  }
}

class Tela {
  static avisar(texto, tipo = 'success') {
    (document.querySelector('dialog[open]') || document.body).append($('#mensagem'));
    $('#mensagem').innerHTML = `<div class="alert alert-${tipo} shadow">${Tela.esc(texto)}</div>`;
    setTimeout(() => { $('#mensagem').innerHTML = ''; }, 4000);
  }

  static esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  }

  static dinheiro(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  static precoInsumo(valor) {
    return 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }

  static dataHora(texto) {
    return texto.slice(0, 10).split('-').reverse().join('/') + ' ' + texto.slice(11, 16);
  }

  static linhaVazia(colunas) {
    return `<tr><td colspan="${colunas}" class="text-center text-muted">Nenhum registro.</td></tr>`;
  }

  static nomePerfil(perfil) {
    return perfil === 'admin' ? 'Admin' : 'Usuário';
  }

  static etiqueta(situacao) {
    const cores = { 'Ativa': 'success', 'Ativo': 'success', 'Desatualizada': 'warning text-dark', 'Sem ficha': 'secondary', 'Inativo': 'dark', 'Inativa': 'dark' };
    return `<span class="badge bg-${cores[situacao]}">${situacao}</span>`;
  }

  static rotularTabelas() {
    document.querySelectorAll('table').forEach((tabela) => {
      const titulos = [...tabela.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      tabela.querySelectorAll('tbody tr').forEach((linha) => {
        [...linha.cells].forEach((celula, i) => { if (celula.colSpan === 1) celula.dataset.label = titulos[i] ?? ''; });
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
      janela.addEventListener('close', () => responder(janela.returnValue === 'sim'), { once: true });
    });
  }
}

class Aba {
  constructor(nome) {
    this.nome = nome;
    this.lista = [];
  }

  async carregar() {}

  chamada(metodo, ...argumentos) {
    return `sistema.abas.${this.nome}.${metodo}(${argumentos.join(', ')})`;
  }
}

class Cadastro extends Aba {
  static emEdicao = null;

  constructor(nome, item, perguntaInativar, feminino = false) {
    super(nome);
    this.item = item;
    this.perguntaInativar = perguntaInativar;
    this.feminino = feminino;
  }

  async carregar() {
    this.lista = await Api.chamar('GET', `/api/${this.nome}`);
    this.desenhar();
  }

  desenhar() {}

  filtrar(campos) {
    const busca = $(`#${this.nome}-busca`).value.toLowerCase();
    const situacao = $(`#${this.nome}-situacao`).value;
    return this.lista.filter((registro) => campos(registro).join(' ').toLowerCase().includes(busca)
      && (!situacao || (situacao === 'ativos') === Boolean(registro.ativo)));
  }

  situacao(registro) {
    const final = this.feminino ? 'a' : 'o';
    return Tela.etiqueta(registro.ativo ? `Ativ${final}` : `Inativ${final}`);
  }

  botoes(registro) {
    return `<button class="btn btn-sm btn-outline-primary" onclick="${this.chamada('editar', registro.id)}">Editar</button>
            <button class="btn btn-sm btn-outline-${registro.ativo ? 'danger' : 'success'}" onclick="${this.chamada('alternarAtivo', registro.id, !registro.ativo)}">${registro.ativo ? 'Inativar' : 'Reativar'}</button>`;
  }

  novo() {
    this.abrirJanela(null);
  }

  editar(id) {
    this.abrirJanela(id);
  }

  abrirJanela(id) {
    const registro = this.lista.find((r) => r.id === id);
    const linha = $(`#aba-${this.nome} .modelo-cadastro`).cloneNode(true);
    linha.hidden = false;
    linha.querySelectorAll('[id]').forEach((campo) => campo.removeAttribute('id'));

    linha.className = 'row g-3';
    const colunas = [...linha.children];
    colunas.forEach((coluna) => { coluna.className = colunas.length === 1 ? 'col-12' : 'col-md-6'; });

    const campos = $('#editar-campos');
    campos.replaceChildren(linha);
    if (registro) campos.querySelectorAll('[name]').forEach((campo) => { campo.value = registro[campo.name] ?? ''; });

    Cadastro.emEdicao = { cadastro: this, id };
    $('#editar-icone').setAttribute('href', `#i-${this.nome}`);
    if (registro) {
      $('#editar-titulo').textContent = `Editar ${this.item}`;
      $('#editar-subtitulo').textContent = registro.codigo ? `${registro.codigo} - ${registro.nome}` : registro.nome;
      $('#editar-botao').textContent = 'Salvar alterações';
    } else {
      $('#editar-titulo').textContent = `${this.feminino ? 'Nova' : 'Novo'} ${this.item}`;
      $('#editar-subtitulo').textContent = 'Preencha os dados para cadastrar.';
      $('#editar-botao').textContent = 'Cadastrar';
    }
    $('#janela-editar').showModal();
    campos.querySelector('[name]').focus();
  }

  dica(texto) {
    const div = document.createElement('div');
    div.className = 'janela-dica mt-3';
    div.textContent = texto;
    $('#editar-campos').append(div);
  }

  static async salvarJanela(evento) {
    evento.preventDefault();
    const { cadastro, id } = Cadastro.emEdicao;
    const dados = Object.fromEntries(new FormData(evento.target));
    if ('confirmarSenha' in dados && dados.senha !== dados.confirmarSenha) {
      return Tela.avisar('A confirmação não confere com a senha.', 'danger');
    }
    if (id === null) {
      await Api.chamar('POST', `/api/${cadastro.nome}`, dados);
      Tela.avisar('Cadastrado!');
    } else {
      const resposta = await Api.chamar('PUT', `/api/${cadastro.nome}/${id}`, dados);
      Tela.avisar(resposta.precoMudou ? 'Salvo. O preço mudou: confira as fichas desatualizadas no Catálogo.' : 'Alterações salvas!');
    }
    $('#janela-editar').close();
    cadastro.carregar();
  }

  async alternarAtivo(id, ativo) {
    if (!ativo && !(await Tela.confirmar(this.perguntaInativar, 'Inativar'))) return;
    await Api.chamar('PATCH', `/api/${this.nome}/${id}/ativo`, { ativo });
    const final = this.feminino ? 'a' : 'o';
    Tela.avisar(ativo ? `Reativad${final}.` : `Inativad${final}.`);
    this.carregar();
  }
}

class AbaCatalogo extends Aba {
  async carregar() {
    this.lista = await Api.chamar('GET', '/api/catalogo');
    this.desenhar();
  }

  desenhar() {
    const busca = $('#catalogo-busca').value.toLowerCase();
    const filtro = $('#catalogo-filtro').value;
    const lista = this.lista.filter((p) =>
      `${p.nome} ${p.codigo}`.toLowerCase().includes(busca) && (!filtro || p.situacao === filtro));

    $('#tabela-catalogo').innerHTML = lista.map((p) => `
      <tr>
        <td>${Tela.esc(p.codigo)}</td><td>${Tela.esc(p.nome)}</td><td>${Tela.esc(p.categoria)}</td>
        <td>${p.versao ? 'v' + p.versao : '—'}</td>
        <td>${p.custo_atual !== null ? Tela.dinheiro(p.custo_atual) : '—'}</td>
        <td>${Tela.etiqueta(p.situacao)}</td>
        <td><button class="btn btn-sm btn-outline-primary" onclick="${this.chamada('verFicha', p.id)}">Ver</button></td>
      </tr>`).join('') || Tela.linhaVazia(7);

    const desatualizadas = this.lista.filter((p) => p.situacao === 'Desatualizada').length;
    $('#aviso-desatualizadas').hidden = desatualizadas === 0;
    $('#aviso-desatualizadas').textContent = `${desatualizadas} produto(s) com ficha desatualizada: o preço de algum insumo mudou desde que a ficha foi salva.`;
  }

  async verFicha(id) {
    const { produto, versoes, itens } = await Api.chamar('GET', `/api/catalogo/${id}`);
    $('#janela-ficha-titulo').textContent = `${produto.codigo} - ${produto.nome}`;

    let html = `<p>Categoria: <strong>${Tela.esc(produto.categoria)}</strong></p>`;
    if (versoes.length === 0) {
      html += '<p class="text-muted">Este produto ainda não tem ficha técnica.</p>';
    } else {
      const total = itens.reduce((soma, item) => soma + item.subtotal, 0);
      html += `
        <p class="small text-muted">Versão ${versoes[0].versao}, salva em ${Tela.dataHora(versoes[0].criada_em)} por ${Tela.esc(versoes[0].usuario_nome)}</p>
        <table class="table table-sm">
          <thead><tr><th>Insumo</th><th>Quantidade</th><th>Preço na ficha</th><th>Preço atual</th><th>Subtotal</th></tr></thead>
          <tbody>${itens.map((i) => `
            <tr class="${i.custo_na_ficha !== i.custo_atual ? 'table-warning' : ''}">
              <td>${Tela.esc(i.nome)}</td><td>${i.quantidade} ${i.unidade}</td>
              <td>${Tela.precoInsumo(i.custo_na_ficha)}</td><td>${Tela.precoInsumo(i.custo_atual)}</td><td>${Tela.dinheiro(i.subtotal)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr><th colspan="4" class="text-end">Custo total (preços atuais)</th><th>${Tela.dinheiro(total)}</th></tr></tfoot>
        </table>
        <p class="small text-muted">Linhas em amarelo: o preço do insumo mudou desde que a ficha foi salva.</p>`;
    }
    $('#janela-ficha-corpo').innerHTML = html;
    $('#janela-ficha').showModal();
  }
}

class AbaProdutos extends Cadastro {
  constructor() {
    super('produtos', 'produto', 'Inativar este produto? Ele sai do catálogo de consulta e não recebe novas fichas, mas o histórico fica guardado.');
  }

  async carregar() {
    this.categorias = await Api.chamar('GET', '/api/categorias');
    this.lista = await Api.chamar('GET', '/api/catalogo');
    this.desenhar();
  }

  abrirJanela(id) {
    const atual = this.lista.find((p) => p.id === id)?.categoria_id;
    $('#produto-categoria').innerHTML = '<option value="">Selecione...</option>' +
      this.categorias.filter((c) => c.ativo || c.id === atual)
        .map((c) => `<option value="${c.id}">${Tela.esc(c.nome)}${c.ativo ? '' : ' (inativa)'}</option>`).join('');
    super.abrirJanela(id);
  }

  desenhar() {
    $('#tabela-produtos').innerHTML = this.filtrar((p) => [p.codigo, p.nome, p.categoria]).map((p) => `
      <tr>
        <td>${Tela.esc(p.codigo)}</td><td>${Tela.esc(p.nome)}</td><td>${Tela.esc(p.categoria)}</td><td>${Tela.etiqueta(p.situacao)}</td>
        <td class="text-end text-nowrap">${this.botoes(p)}</td>
      </tr>`).join('') || Tela.linhaVazia(5);
  }
}

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

    const { versoes, itens } = await Api.chamar('GET', `/api/catalogo/${id}`);
    this.itens = itens.map((i) => ({ insumo_id: i.insumo_id, nome: i.nome, unidade: i.unidade, custo: i.custo_atual, quantidade: i.quantidade, ativo: i.ativo }));

    $('#ficha-info').textContent = versoes.length
      ? `Versão atual: v${versoes[0].versao}. Ao salvar, será criada a versão ${versoes[0].versao + 1}.`
      : 'Este produto ainda não tem ficha. Ao salvar, será criada a versão 1.';
    $('#ficha-versoes').innerHTML = versoes.map((v) => `
      <li class="list-group-item d-flex justify-content-between">
        <span>v${v.versao} — ${Tela.dataHora(v.criada_em)} — ${Tela.esc(v.usuario_nome)}</span><strong>${Tela.dinheiro(v.custo_total)}</strong>
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

  desenharTotal() {
    $('#ficha-total').textContent = Tela.dinheiro(this.itens.reduce((soma, item) => soma + item.quantidade * item.custo, 0));
  }

  async salvar() {
    const inativo = this.itens.find((item) => !item.ativo);
    if (inativo) return Tela.avisar(`O insumo ${inativo.nome} está inativo. Remova-o da ficha ou reative-o em Insumos.`, 'danger');
    const invalido = this.itens.findIndex((item) => !(item.quantidade > 0));
    if (invalido >= 0) {
      Tela.avisar(`Informe uma quantidade maior que zero para ${this.itens[invalido].nome}.`, 'danger');
      return $(`#ficha-qtd-${invalido}`).focus();
    }
    const itens = this.itens.map((item) => ({ insumo_id: item.insumo_id, quantidade: item.quantidade }));
    const resposta = await Api.chamar('POST', `/api/produtos/${$('#ficha-produto').value}/ficha`, { itens });
    Tela.avisar(`Ficha salva: versão ${resposta.versao}, custo ${Tela.dinheiro(resposta.custoTotal)}.`);
    this.escolherProduto();
  }
}

class AbaInsumos extends Cadastro {
  constructor() {
    super('insumos', 'insumo', 'Inativar este insumo? Ele não poderá ser usado em novas fichas, mas continua nas fichas já salvas.');
  }

  desenhar() {
    $('#tabela-insumos').innerHTML = this.filtrar((i) => [i.nome, i.unidade]).map((i) => `
      <tr>
        <td>${Tela.esc(i.nome)}</td><td>${i.unidade}</td><td>${Tela.precoInsumo(i.custo)}</td><td>${this.situacao(i)}</td>
        <td class="text-end text-nowrap">${this.botoes(i)}</td>
      </tr>`).join('') || Tela.linhaVazia(5);
  }

  editar(id) {
    super.editar(id);
    this.dica('Se você mudar o custo, as fichas técnicas que usam este insumo aparecerão como "Desatualizada" no Catálogo.');
  }
}

class AbaCategorias extends Cadastro {
  constructor() {
    super('categorias', 'categoria', 'Inativar esta categoria? Ela não poderá ser escolhida para novos produtos; os produtos atuais continuam nela.', true);
  }

  desenhar() {
    $('#tabela-categorias').innerHTML = this.filtrar((c) => [c.nome]).map((c) => `
      <tr><td>${Tela.esc(c.nome)}</td><td>${this.situacao(c)}</td><td class="text-end text-nowrap">${this.botoes(c)}</td></tr>`).join('') || Tela.linhaVazia(3);
  }
}

class AbaRelatorio extends Aba {
  async carregar() {
    const comFicha = (await Api.chamar('GET', '/api/catalogo')).filter((p) => p.ficha_id);
    $('#relatorio-produtos').innerHTML = comFicha.map((p) => `
      <label class="form-check">
        <input class="form-check-input" type="checkbox" value="${p.id}"> ${Tela.esc(p.codigo)} - ${Tela.esc(p.nome)}
      </label>`).join('') || '<span class="text-muted">Nenhum produto com ficha técnica.</span>';
    this.atualizarBotaoMarcar();
  }

  marcarTodos() {
    const caixas = document.querySelectorAll('#relatorio-produtos input');
    const marcar = !this.todosMarcados();
    caixas.forEach((caixa) => { caixa.checked = marcar; });
    this.atualizarBotaoMarcar();
  }

  todosMarcados() {
    const caixas = [...document.querySelectorAll('#relatorio-produtos input')];
    return caixas.length > 0 && caixas.every((caixa) => caixa.checked);
  }

  atualizarBotaoMarcar() {
    $('#relatorio-marcar').textContent = this.todosMarcados() ? 'Desmarcar todos' : 'Marcar todos';
  }

  async gerar() {
    const marcados = [...document.querySelectorAll('#relatorio-produtos input:checked')].map((caixa) => caixa.value);
    const data = $('#relatorio-data').value;
    const { produtos, semFicha } = await Api.chamar('GET', `/api/relatorio?produtos=${marcados.join(',')}&data=${data}`);

    let html = `<p class="small text-muted">Gerado por ${Tela.esc(sistema.usuario.nome)} em ${new Date().toLocaleString('pt-BR')}
                ${data ? ' — fichas válidas em ' + data.split('-').reverse().join('/') : ''}</p>`;
    if (semFicha > 0) {
      html += `<div class="alert alert-warning no-print">${semFicha} produto(s) não tinham ficha técnica nessa data e ficaram de fora.</div>`;
    }
    for (const p of produtos) {
      html += `
        <div class="card mb-3">
          <div class="card-header"><strong>${Tela.esc(p.codigo)} - ${Tela.esc(p.nome)}</strong>
            <span class="text-muted">· ${Tela.esc(p.categoria)} · ficha v${p.versao} (${Tela.dataHora(p.criada_em)})</span></div>
          <table class="table table-sm mb-0">
            <thead><tr><th>Insumo</th><th>Quantidade</th><th>Custo unitário</th><th>Subtotal</th></tr></thead>
            <tbody>${p.itens.map((i) => `
              <tr><td>${Tela.esc(i.nome)}</td><td>${i.quantidade} ${i.unidade}</td><td>${Tela.precoInsumo(i.custo_atual)}</td><td>${Tela.dinheiro(i.subtotal)}</td></tr>`).join('')}
            </tbody>
            <tfoot><tr><th colspan="3" class="text-end">Custo total</th><th>${Tela.dinheiro(p.total)}</th></tr></tfoot>
          </table>
        </div>`;
    }
    $('#relatorio-resultado').innerHTML = html;
    $('#botao-imprimir').hidden = produtos.length === 0;
  }
}

class AbaUsuarios extends Cadastro {
  constructor() {
    super('usuarios', 'usuário', 'Inativar este usuário? Ele não conseguirá mais entrar no sistema até ser reativado.');
  }

  desenhar() {
    $('#tabela-usuarios').innerHTML = this.filtrar((u) => [u.nome, u.login]).map((u) => `
      <tr>
        <td>${Tela.esc(u.nome)}</td><td>${Tela.esc(u.login)}</td><td>${Tela.nomePerfil(u.perfil)}</td><td>${this.situacao(u)}</td>
        <td class="text-end text-nowrap">${u.id === sistema.usuario.id
          ? `<span class="text-muted small me-2">você</span><button class="btn btn-sm btn-outline-primary" onclick="sistema.abrirAba('perfil')">Meu perfil</button>`
          : this.botoes(u)}</td>
      </tr>`).join('') || Tela.linhaVazia(5);
  }

  editar(id) {
    super.editar(id);
    const coluna = (nome) => $(`#editar-campos [name="${nome}"]`).parentElement;

    const senha = coluna('senha');
    senha.querySelector('label').textContent = 'Nova senha';
    senha.querySelector('input').required = false;

    const confirmar = senha.cloneNode(true);
    confirmar.querySelector('label').textContent = 'Confirmar nova senha';
    confirmar.querySelector('input').name = 'confirmarSenha';

    const tituloSenha = document.createElement('div');
    tituloSenha.className = 'col-12 mt-3 pt-3 border-top';
    tituloSenha.innerHTML = '<strong>Trocar senha</strong><div class="small text-muted">Deixe em branco para manter a senha atual.</div>';

    $('#editar-campos .row').replaceChildren(coluna('nome'), coluna('login'), coluna('perfil'), tituloSenha, senha, confirmar);
  }
}

class AbaPerfil extends Aba {
  async carregar() {
    const dados = await Api.chamar('GET', '/api/perfil');
    const form = $('#form-perfil');
    form.reset();
    form.nome.value = dados.nome;
    form.login.value = dados.login;
    $('#perfil-tipo').textContent = Tela.nomePerfil(dados.perfil);
  }

  async salvar(evento) {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.target));
    if (dados.senha !== dados.confirmarSenha) return Tela.avisar('A confirmação não confere com a nova senha.', 'danger');
    const { usuario } = await Api.chamar('PUT', '/api/perfil', dados);
    sistema.mostrarUsuario(usuario);
    Tela.avisar('Seus dados foram salvos!');
    this.carregar();
  }
}

class Sistema {
  constructor() {
    this.usuario = null;
    this.primeiroAcesso = false;
    this.abas = {
      catalogo: new AbaCatalogo('catalogo'),
      produtos: new AbaProdutos(),
      ficha: new AbaFicha(),
      insumos: new AbaInsumos(),
      categorias: new AbaCategorias(),
      relatorio: new AbaRelatorio('relatorio'),
      usuarios: new AbaUsuarios(),
      perfil: new AbaPerfil('perfil'),
    };
    document.querySelectorAll('[data-aba]').forEach((botao) => {
      botao.addEventListener('click', () => this.abrirAba(botao.dataset.aba));
    });
    new MutationObserver(() => Tela.rotularTabelas()).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') this.alternarMenu(false); });
  }

  alternarMenu(abrir) {
    $('#tela-sistema').classList.toggle('menu-aberto', abrir);
  }

  async iniciar() {
    const situacao = await Api.chamar('GET', '/api/situacao');
    if (situacao.usuario) return this.entrar(situacao.usuario);

    this.primeiroAcesso = situacao.primeiroAcesso;
    $('#tela-login').hidden = false;
    $('#campo-nome').hidden = !this.primeiroAcesso;
    $('#campo-nome input').required = this.primeiroAcesso;
    $('#login-titulo').textContent = this.primeiroAcesso
      ? 'Primeiro acesso: crie o usuário Admin (administrador).'
      : 'Entre com seu usuário e senha.';
  }

  async fazerLogin(evento) {
    evento.preventDefault();
    const url = this.primeiroAcesso ? '/api/primeiro-acesso' : '/api/login';
    const botao = $('#login-botao');
    botao.disabled = true;
    botao.textContent = 'Entrando...';
    try {
      const resposta = await Api.chamar('POST', url, Object.fromEntries(new FormData(evento.target)));
      evento.target.reset();
      this.entrar(resposta.usuario);
    } finally {
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  }

  alternarSenha(botao) {
    const campo = $('#login-senha');
    const mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    botao.classList.toggle('ativo', mostrar);
    botao.setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha');
  }

  entrar(usuario) {
    this.usuario = usuario;
    $('#tela-login').hidden = true;
    $('#tela-sistema').hidden = false;
    this.mostrarUsuario(usuario);
    document.querySelectorAll('.so-admin').forEach((botao) => { botao.hidden = usuario.perfil !== 'admin'; });
    this.abrirAba('catalogo');
  }

  mostrarUsuario(usuario) {
    this.usuario = usuario;
    const palavras = usuario.nome.trim().split(/\s+/);
    $('#usuario-avatar').textContent = (palavras[0][0] + (palavras.length > 1 ? palavras.at(-1)[0] : '')).toUpperCase();
    $('#usuario-nome').textContent = usuario.nome;
    $('#usuario-perfil').textContent = Tela.nomePerfil(usuario.perfil);
  }

  async sair() {
    if (!(await Tela.confirmar('Deseja sair do sistema?', 'Sair'))) return;
    await Api.chamar('POST', '/api/logout');
    location.reload();
  }

  abrirAba(nome) {
    document.querySelectorAll('[data-aba]').forEach((botao) => botao.classList.toggle('ativo', botao.dataset.aba === nome));
    document.querySelectorAll('main section').forEach((secao) => { secao.hidden = secao.id !== `aba-${nome}`; });
    this.alternarMenu(false);
    this.abas[nome].carregar();
  }
}

const sistema = new Sistema();
sistema.iniciar();
