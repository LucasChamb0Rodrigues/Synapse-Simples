const banco = require('../config/banco');
const Modelo = require('./Modelo');
const ErroApp = require('../utils/ErroApp');

class TentativaLogin {
  static LIMITE = 5;
  static JANELA = 15 * 60 * 1000;

  static chave(login) {
    return Modelo.texto(login).toLowerCase().slice(0, 30);
  }

  static async conferir(login) {
    const [{ total }] = await banco.sql(
      'SELECT COUNT(*) AS total FROM tentativa_login WHERE login = ? AND feita_em > ?',
      [TentativaLogin.chave(login), Date.now() - TentativaLogin.JANELA],
    );
    if (total >= TentativaLogin.LIMITE)
      throw new ErroApp(
        429,
        'Muitas tentativas com senha errada. Aguarde 15 minutos e tente de novo.',
      );
  }

  static async registrarFalha(login) {
    await banco.sql('INSERT INTO tentativa_login (login, feita_em) VALUES (?, ?)', [
      TentativaLogin.chave(login),
      Date.now(),
    ]);
    if (Math.random() < 0.05)
      await banco.sql('DELETE FROM tentativa_login WHERE feita_em < ?', [
        Date.now() - TentativaLogin.JANELA,
      ]);
  }

  static limpar(login) {
    return banco.sql('DELETE FROM tentativa_login WHERE login = ?', [TentativaLogin.chave(login)]);
  }
}

module.exports = TentativaLogin;
