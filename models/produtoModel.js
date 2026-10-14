// Tabela produto (e a lista do catálogo).
const { sql } = require('./banco');

// Todos os produtos com a ficha ATUAL (maior versão), o custo pelo preço atual dos insumos
// e quantos insumos mudaram de preço desde que a ficha foi salva.
function listarCatalogo() {
  return sql(`
    SELECT p.id, p.codigo, p.nome, p.ativo, p.categoria_id, c.nome AS categoria,
           f.id AS ficha_id, f.versao, t.custo_atual, t.insumos_alterados
      FROM produto p
      JOIN categoria c ON c.id = p.categoria_id
      LEFT JOIN ficha_tecnica f
             ON f.produto_id = p.id
            AND f.versao = (SELECT MAX(versao) FROM ficha_tecnica WHERE produto_id = p.id)
      LEFT JOIN (SELECT i.ficha_id,
                        ROUND(SUM(i.quantidade * s.custo), 2) AS custo_atual,
                        SUM(i.custo_unitario <> s.custo)      AS insumos_alterados
                   FROM item_ficha i JOIN insumo s ON s.id = i.insumo_id
                  GROUP BY i.ficha_id) t ON t.ficha_id = f.id
     ORDER BY p.nome`);
}

// Produto com o nome da categoria.
async function buscarPorId(id) {
  const [produto] = await sql(
    'SELECT p.*, c.nome AS categoria FROM produto p JOIN categoria c ON c.id = p.categoria_id WHERE p.id = ?',
    [id],
  );
  return produto;
}

// Código e nome não podem repetir. "idAtual" é o próprio produto (na alteração), que não conta.
async function existeRepetido(codigo, nome, idAtual = 0) {
  const repetidos = await sql('SELECT id FROM produto WHERE (codigo = ? OR nome = ?) AND id <> ?', [codigo, nome, idAtual]);
  return repetidos.length > 0;
}

function criar({ codigo, nome, categoria_id }) {
  return sql('INSERT INTO produto (codigo, nome, categoria_id) VALUES (?, ?, ?)', [codigo, nome, categoria_id]);
}

function alterar(id, { codigo, nome, categoria_id }) {
  return sql('UPDATE produto SET codigo = ?, nome = ?, categoria_id = ? WHERE id = ?', [codigo, nome, categoria_id, id]);
}

function mudarAtivo(id, ativo) {
  return sql('UPDATE produto SET ativo = ? WHERE id = ?', [ativo, id]);
}

// As fichas do produto são apagadas junto (ON DELETE CASCADE no banco).
function excluir(id) {
  return sql('DELETE FROM produto WHERE id = ?', [id]);
}

module.exports = { listarCatalogo, buscarPorId, existeRepetido, criar, alterar, mudarAtivo, excluir };
