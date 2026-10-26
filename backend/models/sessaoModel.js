const session = require('express-session');
const banco = require('./banco');

class SessaoStore extends session.Store {
  prepararTabela() {
    this.tabelaPronta ??= banco.sql(`
      CREATE TABLE IF NOT EXISTS sessao (
        id         VARCHAR(128) PRIMARY KEY,
        dados      TEXT   NOT NULL,
        expira_em  BIGINT NOT NULL  -- milissegundos (Date.now())
      )`).catch((erro) => { this.tabelaPronta = null; throw erro; });
    return this.tabelaPronta;
  }

  executar(tarefa, callback = () => {}) {
    this.prepararTabela().then(tarefa).then((resultado) => callback(null, resultado), callback);
  }

  static expiracao(sessao) {
    return new Date(sessao.cookie.expires).getTime();
  }

  get(id, callback) {
    this.executar(async () => {
      const [linha] = await banco.sql('SELECT dados FROM sessao WHERE id = ? AND expira_em > ?', [id, Date.now()]);
      return linha ? JSON.parse(linha.dados) : null;
    }, callback);
  }

  set(id, sessao, callback) {
    this.executar(async () => {
      const dados = JSON.stringify(sessao);
      const expira = SessaoStore.expiracao(sessao);
      await banco.sql(
        'INSERT INTO sessao (id, dados, expira_em) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE dados = ?, expira_em = ?',
        [id, dados, expira, dados, expira],
      );
      if (Math.random() < 0.05) await banco.sql('DELETE FROM sessao WHERE expira_em < ?', [Date.now()]);
    }, callback);
  }

  touch(id, sessao, callback) {
    this.executar(() => banco.sql('UPDATE sessao SET expira_em = ? WHERE id = ?', [SessaoStore.expiracao(sessao), id]), callback);
  }

  destroy(id, callback) {
    this.executar(() => banco.sql('DELETE FROM sessao WHERE id = ?', [id]), callback);
  }

  static encerrarDoUsuario(usuarioId, exceto = '') {
    return banco.sql("DELETE FROM sessao WHERE JSON_EXTRACT(dados, '$.usuario.id') = ? AND id <> ?", [usuarioId, exceto]);
  }
}

module.exports = SessaoStore;
