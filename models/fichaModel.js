// Tabelas ficha_tecnica e item_ficha. Cada vez que a ficha é salva, vira uma NOVA versão.
const { banco, sql } = require('./banco');
const Auditoria = require('./auditoriaModel');

// Todas as versões da ficha de um produto (a primeira da lista é a atual).
function listarVersoes(produtoId) {
  return sql(
    'SELECT id, versao, criada_em, usuario_nome, custo_total FROM ficha_tecnica WHERE produto_id = ? ORDER BY versao DESC',
    [produtoId],
  );
}

// Insumos de uma ficha, com o subtotal calculado pelo preço ATUAL do insumo.
function listarItens(fichaId) {
  return sql(
    `SELECT i.insumo_id, s.nome, s.unidade, i.quantidade,
            i.custo_unitario AS custo_na_ficha, s.custo AS custo_atual,
            ROUND(i.quantidade * s.custo, 2) AS subtotal
       FROM item_ficha i JOIN insumo s ON s.id = i.insumo_id
      WHERE i.ficha_id = ? ORDER BY s.nome`,
    [fichaId],
  );
}

// A versão da ficha que valia numa data (usada no relatório).
async function buscarVersaoNaData(produtoId, data) {
  const [ficha] = await sql(
    `SELECT f.id, f.versao, f.criada_em, p.codigo, p.nome, c.nome AS categoria
       FROM ficha_tecnica f
       JOIN produto p   ON p.id = f.produto_id
       JOIN categoria c ON c.id = p.categoria_id
      WHERE f.produto_id = ? AND DATE(f.criada_em) <= ?
      ORDER BY f.versao DESC LIMIT 1`,
    [produtoId, data],
  );
  return ficha;
}

// Grava uma nova versão com o preço atual de cada insumo e calcula o custo total.
// itens = [{ insumo_id, quantidade }]. Devolve { versao, custoTotal }, ou null se algum insumo não existir.
// Transação: ou grava tudo (ficha + itens + auditoria), ou não grava nada.
async function salvarNovaVersao(produto, itens, usuario) {
  const conexao = await banco.getConnection();
  try {
    await conexao.beginTransaction();
    const [[{ versao }]] = await conexao.query(
      'SELECT COALESCE(MAX(versao), 0) + 1 AS versao FROM ficha_tecnica WHERE produto_id = ? FOR UPDATE',
      [produto.id],
    );

    let custoTotal = 0;
    for (const item of itens) {
      const [[insumo]] = await conexao.query('SELECT custo FROM insumo WHERE id = ?', [item.insumo_id]);
      if (!insumo) {
        await conexao.rollback();
        return null;
      }
      item.custo = insumo.custo;
      custoTotal += item.quantidade * insumo.custo;
    }
    custoTotal = Math.round(custoTotal * 100) / 100;

    const [ficha] = await conexao.query(
      'INSERT INTO ficha_tecnica (produto_id, versao, usuario_nome, custo_total) VALUES (?, ?, ?, ?)',
      [produto.id, versao, usuario.nome, custoTotal],
    );
    for (const item of itens) {
      await conexao.query(
        'INSERT INTO item_ficha (ficha_id, insumo_id, quantidade, custo_unitario) VALUES (?, ?, ?, ?)',
        [ficha.insertId, item.insumo_id, item.quantidade, item.custo],
      );
    }
    await Auditoria.registrar(usuario, 'Salvou ficha', 'Ficha técnica', `${produto.codigo} - v${versao}`, conexao);
    await conexao.commit();
    return { versao, custoTotal };
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

module.exports = { listarVersoes, listarItens, buscarVersaoNaData, salvarNovaVersao };
