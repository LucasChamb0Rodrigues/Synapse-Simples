// Consulta da auditoria (RNF4).
const Auditoria = require('../models/auditoriaModel');

async function listar(req, res) {
  res.json(await Auditoria.listarRecentes());
}

module.exports = { listar };
