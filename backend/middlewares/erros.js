const ERROS_DO_BANCO = {
  ER_DUP_ENTRY: [
    409,
    'Já existe um cadastro com esses dados (nome, código ou login repetido). Se ele estiver inativo, reative-o.',
  ],
  ER_NO_REFERENCED_ROW_2: [400, 'Um dos registros escolhidos não existe mais.'],
  ECONNREFUSED: [500, 'Sem conexão com o banco de dados. Confira o arquivo .env.'],
  ER_ACCESS_DENIED_ERROR: [500, 'Sem conexão com o banco de dados. Confira o arquivo .env.'],
};

function tratarErros(erro, req, res, next) {
  if (erro.status) return res.status(erro.status).json({ erro: erro.message });
  if (ERROS_DO_BANCO[erro.code]) {
    const [status, mensagem] = ERROS_DO_BANCO[erro.code];
    return res.status(status).json({ erro: mensagem });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno no servidor.' });
}

module.exports = tratarErros;
