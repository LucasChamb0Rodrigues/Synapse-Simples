class Sistema {
  constructor() {
    this.usuario = null;
    this.primeiroAcesso = false;
    this.abas = {
      catalogo: new AbaCatalogo(),
      produtos: new AbaProdutos(),
      ficha: new AbaFicha(),
      insumos: new AbaInsumos(),
      categorias: new AbaCategorias(),
      relatorio: new AbaRelatorio(),
      usuarios: new AbaUsuarios(),
      perfil: new AbaPerfil(),
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
    $('#login-aviso').hidden = !situacao.aviso;
    $('#login-aviso').textContent = situacao.aviso || '';
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
      $('#login-aviso').hidden = true;
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
