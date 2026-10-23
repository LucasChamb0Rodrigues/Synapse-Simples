// Erro que vira resposta para o navegador: status HTTP + mensagem (ver tratamento de erros no servidor.js).
// Ex.: throw new ErroApp(404, 'Produto não encontrado.')
class ErroApp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

module.exports = ErroApp;
