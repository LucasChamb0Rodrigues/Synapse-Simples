class AbaUsuarios extends Cadastro {
  constructor() {
    super(
      'usuarios',
      'usuário',
      'Inativar este usuário? Ele não conseguirá mais entrar no sistema até ser reativado.',
    );
  }

  desenhar() {
    $('#tabela-usuarios').innerHTML =
      this.filtrar((u) => [u.nome, u.login])
        .map(
          (u) => `
      <tr>
        <td>${Tela.esc(u.nome)}</td><td>${Tela.esc(u.login)}</td><td>${Tela.nomePerfil(u.perfil)}</td><td>${this.situacao(u)}</td>
        <td class="text-end text-nowrap">${
          u.id === sistema.usuario.id
            ? `<span class="text-muted small me-2">você</span><button class="btn btn-sm btn-outline-primary" onclick="sistema.abrirAba('perfil')">Meu perfil</button>`
            : this.botoes(u)
        }</td>
      </tr>`,
        )
        .join('') || Tela.linhaVazia(5);
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
    tituloSenha.innerHTML =
      '<strong>Trocar senha</strong><div class="small text-muted">Deixe em branco para manter a senha atual.</div>';

    $('#editar-campos .row').replaceChildren(
      coluna('nome'),
      coluna('login'),
      coluna('perfil'),
      tituloSenha,
      senha,
      confirmar,
    );
  }
}
