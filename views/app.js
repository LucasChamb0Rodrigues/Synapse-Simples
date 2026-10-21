// Todo o JavaScript da tela, organizado em classes:
//   Api       conversa com o servidor
//   Tela      funções de apoio (avisos, formatação, janela de confirmação)
//   Aba       classe base de cada aba do menu; cada aba é uma classe filha com o seu carregar()
//   Cadastro  aba com formulário + tabela (Produtos, Insumos, Categorias, Usuários): cadastrar, editar, excluir
//   Sistema   login, menu e troca de abas. "sistema" é o objeto usado pelos botões do index.html.

const $ = (seletor) => document.querySelector(seletor);

// ===================== API =====================

class Api {
  // Chama a API do servidor. Se der erro, mostra a mensagem e interrompe quem chamou.
  static async chamar(metodo, url, dados) {
    const resposta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: dados && JSON.stringify(dados),
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (resposta.ok) return corpo;
    if (resposta.status === 401 && sistema.usuario) location.reload(); // sessão expirou: volta ao login
    Tela.avisar(corpo.erro || 'Erro ao comunicar com o servidor.', 'danger');
    throw new Error(corpo.erro);
  }
}

// ===================== TELA (funções de apoio) =====================

class Tela {
  // Aviso no canto da tela. tipo: 'success' (verde) ou 'danger' (vermelho).
  static avisar(texto, tipo = 'success') {
    $('#mensagem').innerHTML = `<div class="alert alert-${tipo} shadow">${Tela.esc(texto)}</div>`;
    setTimeout(() => { $('#mensagem').innerHTML = ''; }, 4000);
  }

  // Protege contra XSS: transforma < > & " ' em texto comum antes de pôr no HTML.
  static esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  }

  static dinheiro(valor) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Preço de insumo pode ter até 4 casas: 0.0035 -> "R$ 0,0035"
  static precoInsumo(valor) {
    return 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }

  // "2026-10-11 08:56:00" -> "11/10/2026 08:56"
  static dataHora(texto) {
    return texto.slice(0, 10).split('-').reverse().join('/') + ' ' + texto.slice(11, 16);
  }

  static linhaVazia(colunas) {
    return `<tr><td colspan="${colunas}" class="text-center text-muted">Nenhum registro.</td></tr>`;
  }

  static etiqueta(situacao) {
    const cores = { 'Ativa': 'success', 'Desatualizada': 'warning text-dark', 'Sem ficha': 'secondary', 'Inativo': 'dark' };
    return `<span class="badge bg-${cores[situacao]}">${situacao}</span>`;
  }

  // Janela de confirmação. Devolve true se a pessoa clicar no botão de confirmar.
  static confirmar(texto, botao = 'Excluir') {
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

// ===================== ABA (classe base) =====================

class Aba {
  constructor(nome) {
    this.nome = nome;  // igual ao data-aba do menu e ao id "aba-NOME" da seção
    this.lista = [];   // última lista carregada (usada para editar)
  }

  // Busca os dados no servidor e desenha a aba. Cada classe filha faz o seu.
  async carregar() {}

  // Texto que chama um método deste objeto a partir de um botão do HTML: onclick="${this.chamada('editar', 3)}"
  chamada(metodo, ...argumentos) {
    return `sistema.abas.${this.nome}.${metodo}(${argumentos.join(', ')})`;
  }
}

// ===================== CADASTRO (Produtos, Insumos, Categorias, Usuários) =====================
// O formulário do topo da aba só cadastra. Para editar, abre a janela de edição.

class Cadastro extends Aba {
  static emEdicao = null; // { cadastro, id } do registro aberto na janela de edição

  constructor(nome, item, perguntaExcluir) {
    super(nome);
    this.item = item;                       // "produto", "insumo"... (título da janela de edição)
    this.perguntaExcluir = perguntaExcluir;
  }

  async salvar(evento) {
    evento.preventDefault(); // impede o formulário de recarregar a página
    const form = evento.target;
    const dados = Object.fromEntries(new FormData(form)); // { nome: '...', ... } pelos "name" dos campos
    await Api.chamar('POST', `/api/${this.nome}`, dados);
    Tela.avisar('Cadastrado!');
    form.reset();
    this.carregar();
  }

  // Botões "Editar" e "Excluir" de uma linha de tabela.
  botoes(id) {
    return `<button class="btn btn-sm btn-outline-primary" onclick="${this.chamada('editar', id)}">Editar</button>
            <button class="btn btn-sm btn-outline-danger" onclick="${this.chamada('excluir', id)}">Excluir</button>`;
  }

  // Abre a janela de edição com uma cópia dos campos do formulário de cadastro da aba,
  // já preenchidos com os dados do registro.
  editar(id) {
    const registro = this.lista.find((r) => r.id === id);
    const copia = $(`#aba-${this.nome} form`).cloneNode(true);
    copia.lastElementChild.remove(); // tira os botões "Cadastrar"/"Limpar"
    copia.querySelectorAll('[id]').forEach((campo) => campo.removeAttribute('id')); // evita ids repetidos

    const campos = $('#editar-campos');
    campos.replaceChildren(...copia.childNodes);
    campos.querySelectorAll('[name]').forEach((campo) => { campo.value = registro[campo.name] ?? ''; });

    Cadastro.emEdicao = { cadastro: this, id };
    $('#editar-titulo').textContent = `Editar ${this.item}`;
    $('#janela-editar').showModal();
  }

  // A janela de edição é uma só para todos os cadastros, por isso este método é da classe (static).
  static async salvarEdicao(evento) {
    evento.preventDefault();
    const { cadastro, id } = Cadastro.emEdicao;
    const dados = Object.fromEntries(new FormData(evento.target));
    const resposta = await Api.chamar('PUT', `/api/${cadastro.nome}/${id}`, dados); // se der erro, a janela continua aberta
    $('#janela-editar').close();
    Tela.avisar(resposta.precoMudou ? 'Salvo. O preço mudou: confira as fichas desatualizadas no Catálogo.' : 'Alterações salvas!');
    cadastro.carregar();
  }

  async excluir(id) {
    if (!(await Tela.confirmar(this.perguntaExcluir))) return;
    await Api.chamar('DELETE', `/api/${this.nome}/${id}`);
    Tela.avisar('Excluído.');
    this.carregar();
  }
}

// ===================== CATÁLOGO =====================

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

    // Alerta: fichas cujo custo mudou porque o preço de algum insumo mudou.
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

// ===================== PRODUTOS =====================

class AbaProdutos extends Cadastro {
  constructor() {
    super('produtos', 'produto', 'Excluir este produto? As fichas técnicas dele também serão apagadas.');
  }

  async carregar() {
    const categorias = await Api.chamar('GET', '/api/categorias');
    this.lista = await Api.chamar('GET', '/api/catalogo');

    $('#produto-categoria').innerHTML = '<option value="">Selecione...</option>' +
      categorias.map((c) => `<option value="${c.id}">${Tela.esc(c.nome)}</option>`).join('');

    $('#tabela-produtos').innerHTML = this.lista.map((p) => `
      <tr>
        <td>${Tela.esc(p.codigo)}</td><td>${Tela.esc(p.nome)}</td><td>${Tela.esc(p.categoria)}</td><td>${Tela.etiqueta(p.situacao)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" onclick="${this.chamada('alternarAtivo', p.id, !p.ativo)}">${p.ativo ? 'Inativar' : 'Reativar'}</button>
          ${this.botoes(p.id)}
        </td>
      </tr>`).join('') || Tela.linhaVazia(5);
  }

  async alternarAtivo(id, ativo) {
    await Api.chamar('PATCH', `/api/produtos/${id}/ativo`, { ativo });
    Tela.avisar(ativo ? 'Produto reativado.' : 'Produto inativado.');
    this.carregar();
  }
}

// ===================== FICHA TÉCNICA =====================

class AbaFicha extends Aba {
  constructor() {
    super('ficha');
    this.insumosDisponiveis = [];
    this.itens = []; // [{ insumo_id, nome, unidade, custo, quantidade }]
  }

  async carregar() {
    const produtos = await Api.chamar('GET', '/api/catalogo');
    this.insumosDisponiveis = await Api.chamar('GET', '/api/insumos');

    // Só produtos ativos podem receber ficha.
    $('#ficha-produto').innerHTML = '<option value="">Selecione o produto...</option>' +
      produtos.filter((p) => p.ativo).map((p) => `<option value="${p.id}">${Tela.esc(p.codigo)} - ${Tela.esc(p.nome)}</option>`).join('');
    $('#ficha-insumo').innerHTML = this.insumosDisponiveis
      .map((i) => `<option value="${i.id}">${Tela.esc(i.nome)} (${i.unidade})</option>`).join('');
    $('#ficha-editor').hidden = true;
    $('#ficha-info').textContent = '';
  }

  // Ao escolher um produto, carrega a ficha atual dele no editor.
  async escolherProduto() {
    const id = $('#ficha-produto').value;
    $('#ficha-editor').hidden = !id;
    if (!id) return;

    const { versoes, itens } = await Api.chamar('GET', `/api/catalogo/${id}`);
    this.itens = itens.map((i) => ({ insumo_id: i.insumo_id, nome: i.nome, unidade: i.unidade, custo: i.custo_atual, quantidade: i.quantidade }));

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
    if (this.itens.some((item) => item.insumo_id === insumo.id)) {
      return Tela.avisar('Este insumo já está na ficha. Remova-o para alterar a quantidade.', 'danger');
    }
    this.itens.push({ insumo_id: insumo.id, nome: insumo.nome, unidade: insumo.unidade, custo: insumo.custo, quantidade });
    $('#ficha-quantidade').value = '';
    this.desenharItens();
  }

  removerItem(posicao) {
    this.itens.splice(posicao, 1);
    this.desenharItens();
  }

  // Prévia do custo (o valor oficial é calculado pelo servidor ao salvar).
  desenharItens() {
    $('#tabela-ficha').innerHTML = this.itens.map((item, posicao) => `
      <tr>
        <td>${Tela.esc(item.nome)}</td><td>${item.quantidade} ${item.unidade}</td>
        <td>${Tela.precoInsumo(item.custo)}</td><td>${Tela.dinheiro(item.quantidade * item.custo)}</td>
        <td><button class="btn btn-sm btn-outline-danger" onclick="${this.chamada('removerItem', posicao)}">Remover</button></td>
      </tr>`).join('') || Tela.linhaVazia(5);
    $('#ficha-total').textContent = Tela.dinheiro(this.itens.reduce((soma, item) => soma + item.quantidade * item.custo, 0));
  }

  async salvar() {
    const itens = this.itens.map((item) => ({ insumo_id: item.insumo_id, quantidade: item.quantidade }));
    const resposta = await Api.chamar('POST', `/api/produtos/${$('#ficha-produto').value}/ficha`, { itens });
    Tela.avisar(`Ficha salva: versão ${resposta.versao}, custo ${Tela.dinheiro(resposta.custoTotal)}.`);
    this.escolherProduto();
  }
}

// ===================== INSUMOS =====================

class AbaInsumos extends Cadastro {
  constructor() {
    super('insumos', 'insumo', 'Excluir este insumo?');
  }

  async carregar() {
    this.lista = await Api.chamar('GET', '/api/insumos');
    $('#tabela-insumos').innerHTML = this.lista.map((i) => `
      <tr>
        <td>${Tela.esc(i.nome)}</td><td>${i.unidade}</td><td>${Tela.precoInsumo(i.custo)}</td>
        <td class="text-end text-nowrap">${this.botoes(i.id)}</td>
      </tr>`).join('') || Tela.linhaVazia(4);
  }
}

// ===================== CATEGORIAS =====================

class AbaCategorias extends Cadastro {
  constructor() {
    super('categorias', 'categoria', 'Excluir esta categoria?');
  }

  async carregar() {
    this.lista = await Api.chamar('GET', '/api/categorias');
    $('#tabela-categorias').innerHTML = this.lista.map((c) => `
      <tr><td>${Tela.esc(c.nome)}</td><td class="text-end text-nowrap">${this.botoes(c.id)}</td></tr>`).join('') || Tela.linhaVazia(2);
  }
}

// ===================== RELATÓRIO DE CUSTO =====================

class AbaRelatorio extends Aba {
  async carregar() {
    const comFicha = (await Api.chamar('GET', '/api/catalogo')).filter((p) => p.ficha_id);
    $('#relatorio-produtos').innerHTML = comFicha.map((p) => `
      <label class="form-check">
        <input class="form-check-input" type="checkbox" value="${p.id}"> ${Tela.esc(p.codigo)} - ${Tela.esc(p.nome)}
      </label>`).join('') || '<span class="text-muted">Nenhum produto com ficha técnica.</span>';
  }

  marcarTodos() {
    document.querySelectorAll('#relatorio-produtos input').forEach((caixa) => { caixa.checked = true; });
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

// ===================== USUÁRIOS =====================

class AbaUsuarios extends Cadastro {
  constructor() {
    super('usuarios', 'usuário', 'Excluir este usuário? Ele não conseguirá mais entrar no sistema.');
  }

  async carregar() {
    this.lista = await Api.chamar('GET', '/api/usuarios');
    $('#tabela-usuarios').innerHTML = this.lista.map((u) => `
      <tr>
        <td>${Tela.esc(u.nome)}</td><td>${Tela.esc(u.login)}</td><td>${u.perfil === 'recepcao' ? 'Recepção' : 'Entrega'}</td>
        <td class="text-end">${u.id === sistema.usuario.id ? '<span class="text-muted small">você</span>'
          : `<button class="btn btn-sm btn-outline-danger" onclick="${this.chamada('excluir', u.id)}">Excluir</button>`}</td>
      </tr>`).join('');
  }
}

// ===================== AUDITORIA =====================

class AbaAuditoria extends Aba {
  async carregar() {
    const registros = await Api.chamar('GET', '/api/auditoria');
    $('#tabela-auditoria').innerHTML = registros.map((r) => `
      <tr>
        <td class="text-nowrap">${Tela.dataHora(r.data_hora)}</td><td>${Tela.esc(r.usuario_nome)}</td>
        <td>${Tela.esc(r.acao)}</td><td>${Tela.esc(r.entidade)}</td><td>${Tela.esc(r.detalhe)}</td>
      </tr>`).join('') || Tela.linhaVazia(5);
  }
}

// ===================== SISTEMA (login, menu e abas) =====================

class Sistema {
  constructor() {
    this.usuario = null;         // quem está logado
    this.primeiroAcesso = false;
    // Um objeto para cada aba do menu (a chave é o data-aba do botão).
    this.abas = {
      catalogo: new AbaCatalogo('catalogo'),
      produtos: new AbaProdutos(),
      ficha: new AbaFicha(),
      insumos: new AbaInsumos(),
      categorias: new AbaCategorias(),
      relatorio: new AbaRelatorio('relatorio'),
      usuarios: new AbaUsuarios(),
      auditoria: new AbaAuditoria('auditoria'),
    };
    document.querySelectorAll('[data-aba]').forEach((botao) => {
      botao.addEventListener('click', () => this.abrirAba(botao.dataset.aba));
    });
  }

  async iniciar() {
    const situacao = await Api.chamar('GET', '/api/situacao');
    if (situacao.usuario) return this.entrar(situacao.usuario);

    // No primeiro acesso a mesma tela serve para criar o usuário administrador.
    this.primeiroAcesso = situacao.primeiroAcesso;
    $('#tela-login').hidden = false;
    $('#campo-nome').hidden = !this.primeiroAcesso;
    $('#campo-nome input').required = this.primeiroAcesso;
    $('#login-titulo').textContent = this.primeiroAcesso
      ? 'Primeiro acesso: crie o usuário da Recepção (administrador).'
      : 'Entre com seu usuário e senha.';
  }

  async fazerLogin(evento) {
    evento.preventDefault();
    const url = this.primeiroAcesso ? '/api/primeiro-acesso' : '/api/login';
    const resposta = await Api.chamar('POST', url, Object.fromEntries(new FormData(evento.target)));
    evento.target.reset();
    this.entrar(resposta.usuario);
  }

  entrar(usuario) {
    this.usuario = usuario;
    $('#tela-login').hidden = true;
    $('#tela-sistema').hidden = false;
    // Rodapé do menu: iniciais (ex.: "Marina Lopes" -> "ML"), nome e perfil.
    const palavras = usuario.nome.trim().split(/\s+/);
    $('#usuario-avatar').textContent = (palavras[0][0] + (palavras.length > 1 ? palavras.at(-1)[0] : '')).toUpperCase();
    $('#usuario-nome').textContent = usuario.nome;
    $('#usuario-perfil').textContent = usuario.perfil === 'recepcao' ? 'Recepção' : 'Entrega';
    // O perfil Entrega só vê o catálogo. (O servidor também bloqueia; aqui é só para não mostrar.)
    document.querySelectorAll('.so-recepcao').forEach((botao) => { botao.hidden = usuario.perfil !== 'recepcao'; });
    this.abrirAba('catalogo');
  }

  async sair() {
    if (!(await Tela.confirmar('Deseja sair do sistema?', 'Sair'))) return;
    await Api.chamar('POST', '/api/logout');
    location.reload();
  }

  // Mostra só a aba escolhida e busca os dados dela no servidor.
  abrirAba(nome) {
    document.querySelectorAll('[data-aba]').forEach((botao) => botao.classList.toggle('ativo', botao.dataset.aba === nome));
    document.querySelectorAll('main section').forEach((secao) => { secao.hidden = secao.id !== `aba-${nome}`; });
    this.abas[nome].carregar();
  }
}

const sistema = new Sistema();
sistema.iniciar(); // começa: mostra o login ou o sistema
