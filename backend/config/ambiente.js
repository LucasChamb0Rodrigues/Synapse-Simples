class Ambiente {
  static carregar() {
    try {
      process.loadEnvFile();
    } catch {}
    if (!process.env.SESSION_SECRET) {
      throw new Error(
        'Configure o SESSION_SECRET (arquivo .env no computador ou variáveis de ambiente na hospedagem).',
      );
    }
  }
}

module.exports = Ambiente;
