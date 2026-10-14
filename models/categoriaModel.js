// Tabela categoria.
const { sql } = require('./banco');

function listar() {
  return sql('SELECT * FROM categoria ORDER BY nome');
}

async function buscarPorId(id) {
  const [categoria] = await sql('SELECT * FROM categoria WHERE id = ?', [id]);
  return categoria;
}

function criar(nome) {
  return sql('INSERT INTO categoria (nome) VALUES (?)', [nome]);
}

function alterar(id, nome) {
  return sql('UPDATE categoria SET nome = ? WHERE id = ?', [nome, id]);
}

// Se algum produto usa a categoria, o próprio MySQL bloqueia (chave estrangeira).
function excluir(id) {
  return sql('DELETE FROM categoria WHERE id = ?', [id]);
}

module.exports = { listar, buscarPorId, criar, alterar, excluir };
