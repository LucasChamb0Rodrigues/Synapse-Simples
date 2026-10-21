// Consulta da auditoria (RNF4).
const Controller = require('./Controller');
const Auditoria = require('../models/auditoriaModel');

class AuditoriaController extends Controller {
  async listar(req, res) {
    res.json(await Auditoria.listarRecentes());
  }
}

module.exports = new AuditoriaController();
