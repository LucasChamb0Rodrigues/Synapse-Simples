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
    const busca = Tela.elemento(`#${this.nome}-busca`).value.toLowerCase();
    const situacao = Tela.elemento(`#${this.nome}-situacao`).value;
    return this.lista.filter(
      (registro) =>
        campos(registro).join(' ').toLowerCase().includes(busca) &&
        (!situacao || (situacao === 'ativos') === Boolean(registro.ativo)),
    );
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
    const linha = Tela.elemento(`#aba-${this.nome} .modelo-cadastro`).cloneNode(true);
    linha.hidden = false;
    linha.querySelectorAll('[id]').forEach((campo) => campo.removeAttribute('id'));

    linha.className = 'row g-3';
    const colunas = [...linha.children];
    colunas.forEach((coluna) => {
      coluna.className = colunas.length === 1 ? 'col-12' : 'col-md-6';
    });

    const campos = Tela.elemento('#editar-campos');
    campos.replaceChildren(linha);
    if (registro)
      campos.querySelectorAll('[name]').forEach((campo) => {
        campo.value = registro[campo.name] ?? '';
      });

    Cadastro.emEdicao = { cadastro: this, id };
    if (registro) {
      Tela.elemento('#editar-titulo').textContent = `Editar ${this.item}`;
      Tela.elemento('#editar-subtitulo').textContent = registro.codigo
        ? `${registro.codigo} - ${registro.nome}`
        : registro.nome;
      Tela.elemento('#editar-botao').textContent = 'Salvar alterações';
    } else {
      Tela.elemento('#editar-titulo').textContent =
        `${this.feminino ? 'Nova' : 'Novo'} ${this.item}`;
      Tela.elemento('#editar-subtitulo').textContent = 'Preencha os dados para cadastrar.';
      Tela.elemento('#editar-botao').textContent = 'Cadastrar';
    }
    Tela.elemento('#janela-editar').showModal();
    campos.querySelector('[name]').focus();
  }

  dica(texto) {
    const div = document.createElement('div');
    div.className = 'janela-dica mt-3';
    div.textContent = texto;
    Tela.elemento('#editar-campos').append(div);
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
      Tela.avisar(
        resposta.precoMudou
          ? 'Salvo. O preço mudou: confira as fichas desatualizadas no Catálogo.'
          : 'Alterações salvas!',
      );
    }
    Tela.elemento('#janela-editar').close();
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
