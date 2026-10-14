// Tabela usuario.
const { sql } = require('./banco');

async function contar() {
  const [{ total }] = await sql('SELECT COUNT(*) AS total FROM usuario');
  return total;
}

async function buscarPorId(id) {
  const [usuario] = await sql('SELECT * FROM usuario WHERE id = ?', [id]);
  return usuario;
}

async function buscarPorLogin(login) {
  const [usuario] = await sql('SELECT * FROM usuario WHERE login = ?', [login]);
  return usuario;
}

// Nunca devolve o hash da senha.
function listar() {
  return sql('SELECT id, nome, login, perfil FROM usuario ORDER BY nome');
}

async function criar(nome, login, senhaHash, perfil) {
  const resultado = await sql('INSERT INTO usuario (nome, login, senha_hash, perfil) VALUES (?, ?, ?, ?)', [nome, login, senhaHash, perfil]);
  return resultado.insertId;
}

function excluir(id) {
  return sql('DELETE FROM usuario WHERE id = ?', [id]);
}

module.exports = { contar, buscarPorId, buscarPorLogin, listar, criar, excluir };
