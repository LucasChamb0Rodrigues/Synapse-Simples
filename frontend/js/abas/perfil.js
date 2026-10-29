class AbaPerfil extends Aba {
  constructor() {
    super('perfil');
  }

  async carregar() {
    const dados = await Api.chamar('GET', '/api/perfil');
    const form = Tela.elemento('#form-perfil');
    form.reset();
    form.nome.value = dados.nome;
    form.login.value = dados.login;
    Tela.elemento('#perfil-tipo').textContent = Tela.nomePerfil(dados.perfil);
  }

  async salvar(evento) {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(evento.target));
    if (dados.senha !== dados.confirmarSenha)
      return Tela.avisar('A confirmação não confere com a nova senha.', 'danger');
    const { usuario } = await Api.chamar('PUT', '/api/perfil', dados);
    sistema.mostrarUsuario(usuario);
    Tela.avisar('Seus dados foram salvos!');
    this.carregar();
  }
}
