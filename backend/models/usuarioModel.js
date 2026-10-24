const bcrypt = require('bcryptjs');
const banco = require('./banco');
const Modelo = require('./Modelo');
const ErroApp = require('./ErroApp');

class Usuario extends Modelo {
  static tabela = 'usuario';
  static campos = ['nome', 'login', 'senha_hash', 'perfil'];
  static naoEncontrado = 'Usuário não encontrado.';

  static async contar() {
    const [{ total }] = await banco.sql('SELECT COUNT(*) AS total FROM usuario');
    return total;
  }

  static async buscarPorLogin(login) {
    const [linha] = await banco.sql('SELECT * FROM usuario WHERE login = ?', [login]);
    return linha && new Usuario(linha);
  }

  static async listar() {
    const linhas = await banco.sql('SELECT id, nome, login, perfil FROM usuario ORDER BY nome');
    return linhas.map((linha) => new Usuario(linha));
  }

  static async cadastrar(dados, perfil) {
    const usuario = new Usuario({ nome: dados.nome, login: dados.login, perfil });
    await usuario.definirSenha(dados.senha);
    await usuario.salvar();
    return usuario;
  }

  async alterar(dados) {
    this.nome = dados.nome;
    this.login = dados.login;
    if (dados.perfil !== undefined) this.perfil = dados.perfil;
    const trocouSenha = String(dados.senha ?? '') !== '';
    if (trocouSenha) await this.definirSenha(dados.senha);
    await this.salvar();
    return trocouSenha;
  }

  static async autenticar(login, senha) {
    const usuario = await Usuario.buscarPorLogin(Modelo.texto(login).toLowerCase());
    return usuario && (await usuario.conferirSenha(senha)) ? usuario : null;
  }

  async validar() {
    this.nome = Modelo.texto(this.nome);
    this.login = Modelo.texto(this.login).toLowerCase();
    if (!this.nome) throw new ErroApp(400, 'Informe o nome.');
    if (!/^[a-z0-9._-]{3,30}$/.test(this.login)) throw new ErroApp(400, 'O login deve ter de 3 a 30 caracteres (letras minúsculas, números, ponto, hífen ou _).');
    if (this.perfil !== 'admin' && this.perfil !== 'usuario') throw new ErroApp(400, 'Perfil inválido.');
  }

  async definirSenha(senha) {
    senha = String(senha ?? '');
    if (senha.length < 6) throw new ErroApp(400, 'A senha deve ter pelo menos 6 caracteres.');
    this.senha_hash = await bcrypt.hash(senha, 10);
  }

  conferirSenha(senha) {
    return bcrypt.compare(String(senha ?? ''), this.senha_hash);
  }

  nomePerfil() {
    return this.perfil === 'admin' ? 'Admin' : 'Usuário';
  }

  dadosDaSessao() {
    return { id: this.id, nome: this.nome, perfil: this.perfil };
  }
}

module.exports = Usuario;
