// Conexão com o MySQL, usada por todos os models.
const mysql = require('mysql2/promise');

class Banco {
  constructor(configuracao) {
    this.pool = mysql.createPool(configuracao);
  }

  // Executa um SQL e devolve as linhas. Os "?" são trocados pelos valores (protege contra SQL Injection).
  // "conexao" só é passado quando o comando faz parte de uma transação.
  async sql(comando, valores = [], conexao = this.pool) {
    const [linhas] = await conexao.query(comando, valores);
    return linhas;
  }

  // Transação: ou grava tudo o que "tarefa" fizer, ou não grava nada (se der erro, desfaz).
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

// Um único objeto Banco para o sistema todo.
const banco = new Banco({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,     // datas chegam como texto "2026-10-11 08:56:00"
  decimalNumbers: true,  // DECIMAL chega como número
  // Bancos na nuvem (ex.: Aiven) exigem conexão criptografada. DB_SSL_CA é o certificado "CA" que o painel do banco fornece.
  ssl: process.env.DB_SSL === 'true' ? { ca: process.env.DB_SSL_CA || undefined } : undefined,
});

// Fuso horário das datas gravadas pelo MySQL (auditoria, versões da ficha). Bancos na nuvem usam UTC;
// com DB_TIMEZONE=-03:00 os horários ficam no horário de Brasília.
if (process.env.DB_TIMEZONE) {
  banco.pool.pool.on('connection', (conexao) => conexao.query('SET time_zone = ?', [process.env.DB_TIMEZONE]));
}

module.exports = banco;
