class Login {
  constructor() {
    this.primeiroAcesso = false;
  }

  mostrar(situacao) {
    this.primeiroAcesso = situacao.primeiroAcesso;
    Tela.elemento('#tela-login').hidden = false;
    Tela.elemento('#login-aviso').hidden = !situacao.aviso;
    Tela.elemento('#login-aviso').textContent = situacao.aviso || '';
    Tela.elemento('#campo-nome').hidden = !this.primeiroAcesso;
    Tela.elemento('#campo-nome input').required = this.primeiroAcesso;
    Tela.elemento('#login-titulo').textContent = this.primeiroAcesso
      ? 'Primeiro acesso: crie o usuário Admin (administrador).'
      : 'Entre com seu usuário e senha.';
  }

  async fazerLogin(evento) {
    evento.preventDefault();
    const url = this.primeiroAcesso ? '/api/primeiro-acesso' : '/api/login';
    const botao = Tela.elemento('#login-botao');
    botao.disabled = true;
    botao.textContent = 'Entrando...';
    try {
      const resposta = await Api.chamar(
        'POST',
        url,
        Object.fromEntries(new FormData(evento.target)),
      );
      evento.target.reset();
      Tela.elemento('#login-aviso').hidden = true;
      Tela.elemento('#tela-login').hidden = true;
      sistema.entrar(resposta.usuario);
    } finally {
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  }

  alternarSenha(botao) {
    const campo = Tela.elemento('#login-senha');
    const mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    botao.classList.toggle('ativo', mostrar);
    botao.setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha');
  }
}
