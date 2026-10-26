const banco = require('./banco');
const Modelo = require('./Modelo');
const ErroApp = require('./ErroApp');

class TentativaLogin {
  static LIMITE = 5;
  static JANELA = 15 * 60 * 1000;

  static prepararTabela() {
    TentativaLogin.tabelaPronta ??= banco.sql(`
      CREATE TABLE IF NOT EXISTS tentativa_login (
        login     VARCHAR(30) NOT NULL,
        feita_em  BIGINT      NOT NULL,  -- milissegundos (Date.now())
        INDEX (login, feita_em)
      )`).catch((erro) => { TentativaLogin.tabelaPronta = null; throw erro; });
    return TentativaLogin.tabelaPronta;
  }

  static chave(login) {
    return Modelo.texto(login).toLowerCase().slice(0, 30);
  }

  static async conferir(login) {
    await TentativaLogin.prepararTabela();
    const [{ total }] = await banco.sql(
      'SELECT COUNT(*) AS total FROM tentativa_login WHERE login = ? AND feita_em > ?',
      [TentativaLogin.chave(login), Date.now() - TentativaLogin.JANELA],
    );
    if (total >= TentativaLogin.LIMITE) throw new ErroApp(429, 'Muitas tentativas com senha errada. Aguarde 15 minutos e tente de novo.');
  }

  static async registrarFalha(login) {
    await banco.sql('INSERT INTO tentativa_login (login, feita_em) VALUES (?, ?)', [TentativaLogin.chave(login), Date.now()]);
    if (Math.random() < 0.05) await banco.sql('DELETE FROM tentativa_login WHERE feita_em < ?', [Date.now() - TentativaLogin.JANELA]);
  }

  static limpar(login) {
    return banco.sql('DELETE FROM tentativa_login WHERE login = ?', [TentativaLogin.chave(login)]);
  }
}

module.exports = TentativaLogin;
