// Tabela auditoria: quem fez o quê e quando.
const { banco, sql } = require('./banco');

// "conexao" só é usado quando a gravação faz parte de uma transação.
function registrar(usuario, acao, entidade, detalhe, conexao = banco) {
  return conexao.query(
    'INSERT INTO auditoria (usuario_nome, acao, entidade, detalhe) VALUES (?, ?, ?, ?)',
    [usuario.nome, acao, entidade, String(detalhe).slice(0, 255)],
  );
}

function listarRecentes() {
  return sql('SELECT * FROM auditoria ORDER BY id DESC LIMIT 300');
}

module.exports = { registrar, listarRecentes };
