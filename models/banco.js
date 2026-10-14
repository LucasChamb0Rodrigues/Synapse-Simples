// Conexão com o MySQL, usada por todos os models.
const mysql = require('mysql2/promise');

const banco = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,     // datas chegam como texto "2026-10-11 08:56:00"
  decimalNumbers: true,  // DECIMAL chega como número
});

// Executa um SQL e devolve as linhas. Os "?" são trocados pelos valores (protege contra SQL Injection).
async function sql(comando, valores = []) {
  const [linhas] = await banco.query(comando, valores);
  return linhas;
}

module.exports = { banco, sql };
