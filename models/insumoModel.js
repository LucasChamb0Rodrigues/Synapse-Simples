// Tabela insumo (matéria-prima: leite, açúcar, palito...).
const { sql } = require('./banco');

function listar() {
  return sql('SELECT * FROM insumo ORDER BY nome');
}

async function buscarPorId(id) {
  const [insumo] = await sql('SELECT * FROM insumo WHERE id = ?', [id]);
  return insumo;
}

function criar({ nome, unidade, custo }) {
  return sql('INSERT INTO insumo (nome, unidade, custo) VALUES (?, ?, ?)', [nome, unidade, custo]);
}

function alterar(id, { nome, unidade, custo }) {
  return sql('UPDATE insumo SET nome = ?, unidade = ?, custo = ? WHERE id = ?', [nome, unidade, custo, id]);
}

// Se o insumo estiver em alguma ficha, o próprio MySQL bloqueia (chave estrangeira).
function excluir(id) {
  return sql('DELETE FROM insumo WHERE id = ?', [id]);
}

// Em quantas fichas técnicas (atuais ou antigas) o insumo aparece.
async function contarUsoEmFichas(id) {
  const [{ total }] = await sql('SELECT COUNT(*) AS total FROM item_ficha WHERE insumo_id = ?', [id]);
  return total;
}

module.exports = { listar, buscarPorId, criar, alterar, excluir, contarUsoEmFichas };
