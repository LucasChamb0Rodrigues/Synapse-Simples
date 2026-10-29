const app = require('./aplicacao');

class Servidor {
  static ligar() {
    const porta = process.env.PORT || 3000;
    app.listen(porta, () =>
      console.log(
        `API do Synapse ligada na porta ${porta} (ela só responde às telas; o sistema abre em http://localhost:5500)`,
      ),
    );
  }
}

Servidor.ligar();
