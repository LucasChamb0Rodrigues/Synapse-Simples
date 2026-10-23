// Tabela sessao: guarda quem está logado no MySQL, em vez de na memória do servidor.
// Assim o login continua valendo depois de reiniciar a API e funciona na Vercel,
// onde o servidor liga e desliga a cada pedido.
// O express-session chama get/set/destroy/touch; cada um responde pelo "callback" (padrão do express-session).
const session = require('express-session');
const banco = require('./banco');

class SessaoStore extends session.Store {
  // Cria a tabela na primeira vez que for usada (uma vez por servidor ligado).
  prepararTabela() {
    this.tabelaPronta ??= banco.sql(`
      CREATE TABLE IF NOT EXISTS sessao (
        id         VARCHAR(128) PRIMARY KEY,
        dados      TEXT   NOT NULL,
        expira_em  BIGINT NOT NULL  -- milissegundos (Date.now())
      )`).catch((erro) => { this.tabelaPronta = null; throw erro; });
    return this.tabelaPronta;
  }

  // Roda a tarefa depois de garantir a tabela e devolve o resultado (ou o erro) pelo callback.
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
      // De vez em quando, apaga as sessões vencidas (sem precisar de uma tarefa agendada).
      if (Math.random() < 0.05) await banco.sql('DELETE FROM sessao WHERE expira_em < ?', [Date.now()]);
    }, callback);
  }

  // Chamado a cada uso (rolling): só renova o prazo.
  touch(id, sessao, callback) {
    this.executar(() => banco.sql('UPDATE sessao SET expira_em = ? WHERE id = ?', [SessaoStore.expiracao(sessao), id]), callback);
  }

  destroy(id, callback) {
    this.executar(() => banco.sql('DELETE FROM sessao WHERE id = ?', [id]), callback);
  }
}

module.exports = SessaoStore;
