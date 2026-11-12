class Sistema {
  constructor() {
    this.usuario = null;
    this.login = new Login();
    this.abas = Object.fromEntries(Rotas.ABAS.map((aba) => [aba.nome, new aba.classe()]));
    document.querySelectorAll('[data-aba]').forEach((botao) => {
      botao.addEventListener('click', () => this.abrirAba(botao.dataset.aba));
    });
    window.addEventListener('hashchange', () => this.mostrarAbaDaRota());
    new MutationObserver(() => Tela.rotularTabelas()).observe(document.body, {
      childList: true,
      subtree: true,
    });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') this.alternarMenu(false);
    });
  }

  alternarMenu(abrir) {
    Tela.elemento('#tela-sistema').classList.toggle('menu-aberto', abrir);
  }

  async carregarTelas() {
    const telas = await Promise.all(
      Rotas.ABAS.map(async ({ tela }) => {
        const resposta = await fetch(`telas/${tela}.html`);
        if (!resposta.ok) throw new Error(`Não foi possível carregar a tela ${tela}.`);
        return resposta.text();
      }),
    );
    Tela.elemento('main').innerHTML = telas.join('');
  }

  async iniciar() {
    await this.carregarTelas();
    const situacao = await Api.chamar('GET', '/api/situacao');
    if (situacao.usuario) return this.entrar(situacao.usuario);
    this.login.mostrar(situacao);
  }

  entrar(usuario) {
    this.usuario = usuario;
    Tela.elemento('#tela-sistema').hidden = false;
    this.mostrarUsuario(usuario);
    document.querySelectorAll('[data-aba]').forEach((botao) => {
      botao.hidden = !Rotas.pode(botao.dataset.aba, usuario);
    });
    this.mostrarAbaDaRota();
  }

  mostrarUsuario(usuario) {
    this.usuario = usuario;
    const palavras = usuario.nome.trim().split(/\s+/);
    Tela.elemento('#usuario-avatar').textContent = (
      palavras[0][0] + (palavras.length > 1 ? palavras.at(-1)[0] : '')
    ).toUpperCase();
    Tela.elemento('#usuario-nome').textContent = usuario.nome;
    Tela.elemento('#usuario-perfil').textContent = Tela.nomePerfil(usuario.perfil);
  }

  async sair() {
    if (!(await Tela.confirmar('Deseja sair do sistema?', 'Sair'))) return;
    await Api.chamar('POST', '/api/logout');
    // Quem entrar depois começa do Catálogo, não na aba da pessoa anterior
    history.replaceState(null, '', location.pathname);
    location.reload();
  }

  abrirAba(nome) {
    const endereco = Rotas.endereco(nome);
    // Clicar na aba já aberta não dispara hashchange, mas precisa recarregar os dados
    if (location.hash === endereco) this.mostrarAbaDaRota();
    else location.hash = endereco;
  }

  mostrarAbaDaRota() {
    if (!this.usuario) return;
    const nome = Rotas.atual(this.usuario);
    history.replaceState(null, '', Rotas.endereco(nome));
    document.querySelectorAll('dialog[open]').forEach((janela) => janela.close());
    document
      .querySelectorAll('[data-aba]')
      .forEach((botao) => botao.classList.toggle('ativo', botao.dataset.aba === nome));
    document.querySelectorAll('main section').forEach((secao) => {
      secao.hidden = secao.id !== `aba-${nome}`;
    });
    this.alternarMenu(false);
    this.abas[nome].carregar();
  }
}

const sistema = new Sistema();
sistema.iniciar();
