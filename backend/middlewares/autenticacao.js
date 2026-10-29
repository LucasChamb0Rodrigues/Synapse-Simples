const Usuario = require('../models/usuarioModel');
const ErroApp = require('../utils/ErroApp');

async function atualizarUsuarioDaSessao(req, res, next) {
  if (req.session.usuario) {
    const usuario = await Usuario.buscarPorId(req.session.usuario.id);
    if (usuario?.ativo) req.session.usuario = usuario.dadosDaSessao();
    else delete req.session.usuario;
  }
  next();
}

function exigirLogin(req, res, next) {
  if (!req.session.usuario) throw new ErroApp(401, 'Faça login para continuar.');
  next();
}

function exigirAdmin(req, res, next) {
  if (req.session.usuario.perfil !== 'admin') throw new ErroApp(403, 'Seu perfil não tem permissão para esta ação.');
  next();
}

module.exports = { atualizarUsuarioDaSessao, exigirLogin, exigirAdmin };
