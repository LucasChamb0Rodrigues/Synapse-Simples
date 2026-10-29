const mysql = require('mysql2/promise');

class Banco {
  constructor() {
    this.pool = mysql.createPool(Banco.configuracao());
    if (process.env.DB_TIMEZONE) {
      this.pool.pool.on('connection', (conexao) =>
        conexao.query('SET time_zone = ?', [process.env.DB_TIMEZONE]),
      );
    }
  }

  static configuracao() {
    return {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      dateStrings: true,
      decimalNumbers: true,
      ssl: process.env.DB_SSL === 'true' ? { ca: process.env.DB_SSL_CA || undefined } : undefined,
    };
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

  async comTrava(nome, tarefa) {
    const conexao = await this.pool.getConnection();
    try {
      const [{ obtida }] = await this.sql('SELECT GET_LOCK(?, 10) AS obtida', [nome], conexao);
      if (obtida !== 1) throw new Error(`Não foi possível obter a trava ${nome}.`);
      return await tarefa(conexao);
    } finally {
      await this.sql('SELECT RELEASE_LOCK(?)', [nome], conexao).catch(() => {});
      conexao.release();
    }
  }
}

module.exports = new Banco();
