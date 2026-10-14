// Ponto de entrada: configura o Express e liga o servidor.
// Para rodar: npm start   e abra http://localhost:3000
//
// Organização (MVC):
//   models/       conversam com o MySQL (só SQL)
//   views/        as telas que rodam no navegador (HTML, CSS e JS)
//   controllers/  recebem o pedido, validam os dados, chamam o model e respondem
//   rotas.js      liga cada endereço da API a uma função de controller

try { process.loadEnvFile(); } catch { /* sem .env: o aviso abaixo explica */ }
if (!process.env.SESSION_SECRET) {
  console.error('Configure o arquivo .env antes de iniciar (veja o .env.example).');
  process.exit(1);
}

const express = require('express');
const session = require('express-session');
const rotas = require('./rotas'); // carregado depois do .env, porque a conexão com o banco usa essas variáveis

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // renova o prazo a cada uso
  cookie: { httpOnly: true, sameSite: 'strict', maxAge: 30 * 60 * 1000 }, // 30 min sem usar = sai
}));
app.use(express.static(`${__dirname}/views`));
app.use('/api', rotas);

// Erros do MySQL que viram mensagens amigáveis: [status, mensagem].
const ERROS_DO_BANCO = {
  ER_DUP_ENTRY:            [409, 'Já existe um cadastro com esses dados (nome, código ou login repetido).'],
  ER_ROW_IS_REFERENCED_2:  [409, 'Não é possível excluir: este registro está em uso (em uma ficha técnica ou produto).'],
  ER_NO_REFERENCED_ROW_2:  [400, 'Um dos registros escolhidos não existe mais.'],
  ECONNREFUSED:            [500, 'Sem conexão com o banco de dados. Confira o arquivo .env.'],
  ER_ACCESS_DENIED_ERROR:  [500, 'Sem conexão com o banco de dados. Confira o arquivo .env.'],
};

// Todo erro dos controllers (inclusive os de falha()) chega aqui.
app.use((erro, req, res, next) => {
  if (erro.status) return res.status(erro.status).json({ erro: erro.message });
  if (ERROS_DO_BANCO[erro.code]) {
    const [status, mensagem] = ERROS_DO_BANCO[erro.code];
    return res.status(status).json({ erro: mensagem });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
});

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`Synapse rodando em http://localhost:${porta}`));
