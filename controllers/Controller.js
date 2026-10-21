// Classe base dos controllers.
const Auditoria = require('../models/auditoriaModel');

class Controller {
  constructor() {
    // O Express chama o método "solto" (rotas.get('/x', produtos.criar)), sem o objeto.
    // O bind prende o "this" de cada método ao controller, inclusive os herdados.
    for (let prototipo = Object.getPrototypeOf(this); prototipo !== Object.prototype; prototipo = Object.getPrototypeOf(prototipo)) {
      for (const nome of Object.getOwnPropertyNames(prototipo)) {
        if (nome !== 'constructor' && typeof this[nome] === 'function' && !Object.hasOwn(this, nome)) {
          this[nome] = this[nome].bind(this);
        }
      }
    }
  }

  // Grava na auditoria em nome de quem está logado.
  auditar(req, acao, entidade, detalhe) {
    return Auditoria.registrar(req.session.usuario, acao, entidade, detalhe);
  }
}

module.exports = Controller;
