const mysql = require('mysql2/promise');

class Banco {
  constructor(configuracao) {
    this.pool = mysql.createPool(configuracao);
  }

  async sql(comando, valores = [], conexao = this.pool) {
    const [linhas] = await conexao.query(comando, valores);
    return linhas;
  }

  async transacao(tarefa) {
    const conexao = await this.pool.getConnection();
    try {
      await conexao.beginTransaction();
      const resultado = await tarefa(conexao);
      await conexao.commit();
      return resultado;
    } catch (erro) {
      await conexao.rollback();
      throw erro;
    } finally {
      conexao.release();
    }
  }
}

const banco = new Banco({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,
  decimalNumbers: true,
  ssl: process.env.DB_SSL === 'true' ? { ca: process.env.DB_SSL_CA || undefined } : undefined,
});

if (process.env.DB_TIMEZONE) {
  banco.pool.pool.on('connection', (conexao) => conexao.query('SET time_zone = ?', [process.env.DB_TIMEZONE]));
}

module.exports = banco;
