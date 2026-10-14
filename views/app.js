// Todo o JavaScript da tela. Cada aba tem sua parte, marcada com ===== NOME =====.

const $ = (seletor) => document.querySelector(seletor);
let usuario = null;   // quem está logado
const listas = {};    // última lista carregada de cada aba (usada para editar)

// ===================== FUNÇÕES GERAIS =====================

// Chama a API do servidor. Se der erro, mostra a mensagem e interrompe quem chamou.
async function api(metodo, url, dados) {
  const resposta = await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: dados && JSON.stringify(dados),
  });
  const corpo = await resposta.json().catch(() => ({}));
  if (resposta.ok) return corpo;
  if (resposta.status === 401 && usuario) location.reload(); // sessão expirou: volta ao login
  avisar(corpo.erro || 'Erro ao comunicar com o servidor.', 'danger');
  throw new Error(corpo.erro);
}

// Aviso no canto da tela. tipo: 'success' (verde) ou 'danger' (vermelho).
function avisar(texto, tipo = 'success') {
  $('#mensagem').innerHTML = `<div class="alert alert-${tipo} shadow">${esc(texto)}</div>`;
  setTimeout(() => { $('#mensagem').innerHTML = ''; }, 4000);
}

// Protege contra XSS: transforma < > & " ' em texto comum antes de pôr no HTML.
function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const dinheiro = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Preço de insumo pode ter até 4 casas: 0.0035 -> "R$ 0,0035"
const precoInsumo = (valor) => 'R$ ' + Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
// "2026-10-11 08:56:00" -> "11/10/2026 08:56"
const dataHora = (texto) => texto.slice(0, 10).split('-').reverse().join('/') + ' ' + texto.slice(11, 16);
const linhaVazia = (colunas) => `<tr><td colspan="${colunas}" class="text-center text-muted">Nenhum registro.</td></tr>`;

function etiqueta(situacao) {
  const cores = { 'Ativa': 'success', 'Desatualizada': 'warning text-dark', 'Sem ficha': 'secondary', 'Inativo': 'dark' };
  return `<span class="badge bg-${cores[situacao]}">${situacao}</span>`;
}

// Botões "Editar" e "Excluir" de uma linha de tabela.
function botoes(aba, id) {
  return `<button class="btn btn-sm btn-outline-primary" onclick="editar('${aba}', ${id})">Editar</button>
          <button class="btn btn-sm btn-outline-danger" onclick="excluir('${aba}', ${id})">Excluir</button>`;
}

// Janela de confirmação. Devolve true se a pessoa clicar em "Excluir".
function confirmar(texto) {
  const janela = $('#janela-confirmar');
  $('#confirmar-texto').textContent = texto;
  janela.returnValue = '';
  janela.showModal();
  return new Promise((responder) => {
    janela.addEventListener('close', () => responder(janela.returnValue === 'sim'), { once: true });
  });
}

// ===================== CADASTROS (Produtos, Insumos, Categorias, Usuários) =====================
// O mesmo formulário serve para cadastrar e para editar:
// quando está editando, ele guarda o id do registro em form.dataset.id.

async function salvar(evento, aba) {
  evento.preventDefault(); // impede o formulário de recarregar a página
  const form = evento.target;
  const dados = Object.fromEntries(new FormData(form)); // { nome: '...', ... } pelos "name" dos campos
  const id = form.dataset.id;
  const resposta = id
    ? await api('PUT', `/api/${aba}/${id}`, dados)
    : await api('POST', `/api/${aba}`, dados);

  avisar(resposta.precoMudou ? 'Salvo. O preço mudou: confira as fichas desatualizadas no Catálogo.' : 'Salvo!');
  limpar(form);
  abas[aba]();
}

// Coloca os dados do registro no formulário do topo da aba.
function editar(aba, id) {
  const registro = listas[aba].find((r) => r.id === id);
  const form = $(`#aba-${aba} form`);
  for (const campo of form.elements) {
    if (campo.name) campo.value = registro[campo.name];
  }
  form.dataset.id = id;
  form.querySelector('button').textContent = 'Salvar alterações';
  form.scrollIntoView();
}

function limpar(form) {
  form.reset();
  delete form.dataset.id;
  form.querySelector('button').textContent = 'Cadastrar';
}

const perguntaExcluir = {
  produtos: 'Excluir este produto? As fichas técnicas dele também serão apagadas.',
  insumos: 'Excluir este insumo?',
  categorias: 'Excluir esta categoria?',
  usuarios: 'Excluir este usuário? Ele não conseguirá mais entrar no sistema.',
};

async function excluir(aba, id) {
  if (!(await confirmar(perguntaExcluir[aba]))) return;
  await api('DELETE', `/api/${aba}/${id}`);
  avisar('Excluído.');
  abas[aba]();
}

// ===================== LOGIN =====================

let primeiroAcesso = false;

async function iniciar() {
  const situacao = await api('GET', '/api/situacao');
  if (situacao.usuario) return entrar(situacao.usuario);

  // No primeiro acesso a mesma tela serve para criar o usuário administrador.
  primeiroAcesso = situacao.primeiroAcesso;
  $('#tela-login').hidden = false;
  $('#campo-nome').hidden = !primeiroAcesso;
  $('#campo-nome input').required = primeiroAcesso;
  $('#login-titulo').textContent = primeiroAcesso
    ? 'Primeiro acesso: crie o usuário da Recepção (administrador).'
    : 'Entre com seu usuário e senha.';
}

async function fazerLogin(evento) {
  evento.preventDefault();
  const url = primeiroAcesso ? '/api/primeiro-acesso' : '/api/login';
  const resposta = await api('POST', url, Object.fromEntries(new FormData(evento.target)));
  evento.target.reset();
  entrar(resposta.usuario);
}

function entrar(logado) {
  usuario = logado;
  $('#tela-login').hidden = true;
  $('#tela-sistema').hidden = false;
  $('#usuario-logado').textContent = `${usuario.nome} · ${usuario.perfil === 'recepcao' ? 'Recepção' : 'Entrega'}`;
  // O perfil Entrega só vê o catálogo. (O servidor também bloqueia; aqui é só para não mostrar.)
  document.querySelectorAll('.so-recepcao').forEach((botao) => { botao.hidden = usuario.perfil !== 'recepcao'; });
  abrirAba('catalogo');
}

async function sair() {
  await api('POST', '/api/logout');
  location.reload();
}

// ===================== ABAS =====================

// Mostra só a aba escolhida e busca os dados dela no servidor.
function abrirAba(aba) {
  document.querySelectorAll('[data-aba]').forEach((botao) => botao.classList.toggle('ativo', botao.dataset.aba === aba));
  document.querySelectorAll('main section').forEach((secao) => { secao.hidden = secao.id !== `aba-${aba}`; });
  abas[aba]();
}

document.querySelectorAll('[data-aba]').forEach((botao) => {
  botao.addEventListener('click', () => abrirAba(botao.dataset.aba));
});

// ===================== CATÁLOGO =====================

async function carregarCatalogo() {
  listas.catalogo = await api('GET', '/api/catalogo');
  desenharCatalogo();
}

function desenharCatalogo() {
  const busca = $('#catalogo-busca').value.toLowerCase();
  const filtro = $('#catalogo-filtro').value;
  const lista = listas.catalogo.filter((p) =>
    `${p.nome} ${p.codigo}`.toLowerCase().includes(busca) && (!filtro || p.situacao === filtro));

  $('#tabela-catalogo').innerHTML = lista.map((p) => `
    <tr>
      <td>${esc(p.codigo)}</td><td>${esc(p.nome)}</td><td>${esc(p.categoria)}</td>
      <td>${p.versao ? 'v' + p.versao : '—'}</td>
      <td>${p.custo_atual !== null ? dinheiro(p.custo_atual) : '—'}</td>
      <td>${etiqueta(p.situacao)}</td>
      <td><button class="btn btn-sm btn-outline-primary" onclick="verFicha(${p.id})">Ver</button></td>
    </tr>`).join('') || linhaVazia(7);

  // Alerta: fichas cujo custo mudou porque o preço de algum insumo mudou.
  const desatualizadas = listas.catalogo.filter((p) => p.situacao === 'Desatualizada').length;
  $('#aviso-desatualizadas').hidden = desatualizadas === 0;
  $('#aviso-desatualizadas').textContent = `${desatualizadas} produto(s) com ficha desatualizada: o preço de algum insumo mudou desde que a ficha foi salva.`;
}

async function verFicha(id) {
  const { produto, versoes, itens } = await api('GET', `/api/catalogo/${id}`);
  $('#janela-ficha-titulo').textContent = `${produto.codigo} - ${produto.nome}`;

  let html = `<p>Categoria: <strong>${esc(produto.categoria)}</strong></p>`;
  if (versoes.length === 0) {
    html += '<p class="text-muted">Este produto ainda não tem ficha técnica.</p>';
  } else {
    const total = itens.reduce((soma, item) => soma + item.subtotal, 0);
    html += `
      <p class="small text-muted">Versão ${versoes[0].versao}, salva em ${dataHora(versoes[0].criada_em)} por ${esc(versoes[0].usuario_nome)}</p>
      <table class="table table-sm">
        <thead><tr><th>Insumo</th><th>Quantidade</th><th>Preço na ficha</th><th>Preço atual</th><th>Subtotal</th></tr></thead>
        <tbody>${itens.map((i) => `
          <tr class="${i.custo_na_ficha !== i.custo_atual ? 'table-warning' : ''}">
            <td>${esc(i.nome)}</td><td>${i.quantidade} ${i.unidade}</td>
            <td>${precoInsumo(i.custo_na_ficha)}</td><td>${precoInsumo(i.custo_atual)}</td><td>${dinheiro(i.subtotal)}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot><tr><th colspan="4" class="text-end">Custo total (preços atuais)</th><th>${dinheiro(total)}</th></tr></tfoot>
      </table>
      <p class="small text-muted">Linhas em amarelo: o preço do insumo mudou desde que a ficha foi salva.</p>`;
  }
  $('#janela-ficha-corpo').innerHTML = html;
  $('#janela-ficha').showModal();
}

// ===================== PRODUTOS =====================

async function carregarProdutos() {
  const categorias = await api('GET', '/api/categorias');
  listas.produtos = await api('GET', '/api/catalogo');

  $('#produto-categoria').innerHTML = '<option value="">Selecione...</option>' +
    categorias.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');

  $('#tabela-produtos').innerHTML = listas.produtos.map((p) => `
    <tr>
      <td>${esc(p.codigo)}</td><td>${esc(p.nome)}</td><td>${esc(p.categoria)}</td><td>${etiqueta(p.situacao)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-secondary" onclick="alternarAtivo(${p.id}, ${!p.ativo})">${p.ativo ? 'Inativar' : 'Reativar'}</button>
        ${botoes('produtos', p.id)}
      </td>
    </tr>`).join('') || linhaVazia(5);
}

async function alternarAtivo(id, ativo) {
  await api('PATCH', `/api/produtos/${id}/ativo`, { ativo });
  avisar(ativo ? 'Produto reativado.' : 'Produto inativado.');
  carregarProdutos();
}

// ===================== FICHA TÉCNICA =====================

let insumosDisponiveis = [];
let itensDaFicha = []; // [{ insumo_id, nome, unidade, custo, quantidade }]

async function carregarFicha() {
  const produtos = await api('GET', '/api/catalogo');
  insumosDisponiveis = await api('GET', '/api/insumos');

  // Só produtos ativos podem receber ficha.
  $('#ficha-produto').innerHTML = '<option value="">Selecione o produto...</option>' +
    produtos.filter((p) => p.ativo).map((p) => `<option value="${p.id}">${esc(p.codigo)} - ${esc(p.nome)}</option>`).join('');
  $('#ficha-insumo').innerHTML = insumosDisponiveis
    .map((i) => `<option value="${i.id}">${esc(i.nome)} (${i.unidade})</option>`).join('');
  $('#ficha-editor').hidden = true;
  $('#ficha-info').textContent = '';
}

// Ao escolher um produto, carrega a ficha atual dele no editor.
async function escolherProdutoFicha() {
  const id = $('#ficha-produto').value;
  $('#ficha-editor').hidden = !id;
  if (!id) return;

  const { versoes, itens } = await api('GET', `/api/catalogo/${id}`);
  itensDaFicha = itens.map((i) => ({ insumo_id: i.insumo_id, nome: i.nome, unidade: i.unidade, custo: i.custo_atual, quantidade: i.quantidade }));

  $('#ficha-info').textContent = versoes.length
    ? `Versão atual: v${versoes[0].versao}. Ao salvar, será criada a versão ${versoes[0].versao + 1}.`
    : 'Este produto ainda não tem ficha. Ao salvar, será criada a versão 1.';
  $('#ficha-versoes').innerHTML = versoes.map((v) => `
    <li class="list-group-item d-flex justify-content-between">
      <span>v${v.versao} — ${dataHora(v.criada_em)} — ${esc(v.usuario_nome)}</span><strong>${dinheiro(v.custo_total)}</strong>
    </li>`).join('') || '<li class="list-group-item text-muted">Nenhuma versão ainda.</li>';
  desenharItensFicha();
}

function adicionarItemFicha() {
  const insumo = insumosDisponiveis.find((i) => i.id === Number($('#ficha-insumo').value));
  const quantidade = Number($('#ficha-quantidade').value);
  if (!insumo) return avisar('Cadastre insumos antes de montar a ficha.', 'danger');
  if (!(quantidade > 0)) return avisar('Informe uma quantidade maior que zero.', 'danger');
  if (itensDaFicha.some((item) => item.insumo_id === insumo.id)) {
    return avisar('Este insumo já está na ficha. Remova-o para alterar a quantidade.', 'danger');
  }
  itensDaFicha.push({ insumo_id: insumo.id, nome: insumo.nome, unidade: insumo.unidade, custo: insumo.custo, quantidade });
  $('#ficha-quantidade').value = '';
  desenharItensFicha();
}

function removerItemFicha(posicao) {
  itensDaFicha.splice(posicao, 1);
  desenharItensFicha();
}

// Prévia do custo (o valor oficial é calculado pelo servidor ao salvar).
function desenharItensFicha() {
  $('#tabela-ficha').innerHTML = itensDaFicha.map((item, posicao) => `
    <tr>
      <td>${esc(item.nome)}</td><td>${item.quantidade} ${item.unidade}</td>
      <td>${precoInsumo(item.custo)}</td><td>${dinheiro(item.quantidade * item.custo)}</td>
      <td><button class="btn btn-sm btn-outline-danger" onclick="removerItemFicha(${posicao})">Remover</button></td>
    </tr>`).join('') || linhaVazia(5);
  $('#ficha-total').textContent = dinheiro(itensDaFicha.reduce((soma, item) => soma + item.quantidade * item.custo, 0));
}

async function salvarFicha() {
  const itens = itensDaFicha.map((item) => ({ insumo_id: item.insumo_id, quantidade: item.quantidade }));
  const resposta = await api('POST', `/api/produtos/${$('#ficha-produto').value}/ficha`, { itens });
  avisar(`Ficha salva: versão ${resposta.versao}, custo ${dinheiro(resposta.custoTotal)}.`);
  escolherProdutoFicha();
}

// ===================== INSUMOS =====================

async function carregarInsumos() {
  listas.insumos = await api('GET', '/api/insumos');
  $('#tabela-insumos').innerHTML = listas.insumos.map((i) => `
    <tr>
      <td>${esc(i.nome)}</td><td>${i.unidade}</td><td>${precoInsumo(i.custo)}</td>
      <td class="text-end text-nowrap">${botoes('insumos', i.id)}</td>
    </tr>`).join('') || linhaVazia(4);
}

// ===================== CATEGORIAS =====================

async function carregarCategorias() {
  listas.categorias = await api('GET', '/api/categorias');
  $('#tabela-categorias').innerHTML = listas.categorias.map((c) => `
    <tr><td>${esc(c.nome)}</td><td class="text-end text-nowrap">${botoes('categorias', c.id)}</td></tr>`).join('') || linhaVazia(2);
}

// ===================== RELATÓRIO DE CUSTO =====================

async function carregarRelatorio() {
  const comFicha = (await api('GET', '/api/catalogo')).filter((p) => p.ficha_id);
  $('#relatorio-produtos').innerHTML = comFicha.map((p) => `
    <label class="form-check">
      <input class="form-check-input" type="checkbox" value="${p.id}"> ${esc(p.codigo)} - ${esc(p.nome)}
    </label>`).join('') || '<span class="text-muted">Nenhum produto com ficha técnica.</span>';
}

function marcarTodos() {
  document.querySelectorAll('#relatorio-produtos input').forEach((caixa) => { caixa.checked = true; });
}

async function gerarRelatorio() {
  const marcados = [...document.querySelectorAll('#relatorio-produtos input:checked')].map((caixa) => caixa.value);
  const data = $('#relatorio-data').value;
  const { produtos, semFicha } = await api('GET', `/api/relatorio?produtos=${marcados.join(',')}&data=${data}`);

  let html = `<p class="small text-muted">Gerado por ${esc(usuario.nome)} em ${new Date().toLocaleString('pt-BR')}
              ${data ? ' — fichas válidas em ' + data.split('-').reverse().join('/') : ''}</p>`;
  if (semFicha > 0) {
    html += `<div class="alert alert-warning no-print">${semFicha} produto(s) não tinham ficha técnica nessa data e ficaram de fora.</div>`;
  }
  for (const p of produtos) {
    html += `
      <div class="card mb-3">
        <div class="card-header"><strong>${esc(p.codigo)} - ${esc(p.nome)}</strong>
          <span class="text-muted">· ${esc(p.categoria)} · ficha v${p.versao} (${dataHora(p.criada_em)})</span></div>
        <table class="table table-sm mb-0">
          <thead><tr><th>Insumo</th><th>Quantidade</th><th>Custo unitário</th><th>Subtotal</th></tr></thead>
          <tbody>${p.itens.map((i) => `
            <tr><td>${esc(i.nome)}</td><td>${i.quantidade} ${i.unidade}</td><td>${precoInsumo(i.custo_atual)}</td><td>${dinheiro(i.subtotal)}</td></tr>`).join('')}
          </tbody>
          <tfoot><tr><th colspan="3" class="text-end">Custo total</th><th>${dinheiro(p.total)}</th></tr></tfoot>
        </table>
      </div>`;
  }
  $('#relatorio-resultado').innerHTML = html;
  $('#botao-imprimir').hidden = produtos.length === 0;
}

// ===================== USUÁRIOS =====================

async function carregarUsuarios() {
  const usuarios = await api('GET', '/api/usuarios');
  $('#tabela-usuarios').innerHTML = usuarios.map((u) => `
    <tr>
      <td>${esc(u.nome)}</td><td>${esc(u.login)}</td><td>${u.perfil === 'recepcao' ? 'Recepção' : 'Entrega'}</td>
      <td class="text-end">${u.id === usuario.id ? '<span class="text-muted small">você</span>'
        : `<button class="btn btn-sm btn-outline-danger" onclick="excluir('usuarios', ${u.id})">Excluir</button>`}</td>
    </tr>`).join('');
}

// ===================== AUDITORIA =====================

async function carregarAuditoria() {
  const registros = await api('GET', '/api/auditoria');
  $('#tabela-auditoria').innerHTML = registros.map((r) => `
    <tr>
      <td class="text-nowrap">${dataHora(r.data_hora)}</td><td>${esc(r.usuario_nome)}</td>
      <td>${esc(r.acao)}</td><td>${esc(r.entidade)}</td><td>${esc(r.detalhe)}</td>
    </tr>`).join('') || linhaVazia(5);
}

// Função que carrega cada aba (usada ao abrir a aba e depois de salvar/excluir).
const abas = {
  catalogo: carregarCatalogo,
  produtos: carregarProdutos,
  ficha: carregarFicha,
  insumos: carregarInsumos,
  categorias: carregarCategorias,
  relatorio: carregarRelatorio,
  usuarios: carregarUsuarios,
  auditoria: carregarAuditoria,
};

iniciar(); // começa: mostra o login ou o sistema
