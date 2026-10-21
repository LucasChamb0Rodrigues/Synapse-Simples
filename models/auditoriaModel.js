// Tabela auditoria: quem fez o quê e quando.
const banco = require('./banco');

class Auditoria {
  // "conexao" só é usado quando a gravação faz parte de uma transação.
  static registrar(usuario, acao, entidade, detalhe, conexao) {
    return banco.sql(
      'INSERT INTO auditoria (usuario_nome, acao, entidade, detalhe) VALUES (?, ?, ?, ?)',
      [usuario.nome, acao, entidade, String(detalhe).slice(0, 255)],
      conexao,
    );
  }

  static listarRecentes() {
    return banco.sql('SELECT * FROM auditoria ORDER BY id DESC LIMIT 300');
  }
}

module.exports = Auditoria;
