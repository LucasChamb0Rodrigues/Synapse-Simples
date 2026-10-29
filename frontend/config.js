class Configuracao {
  static API_PRODUCAO = '';

  static apiUrl() {
    return ['localhost', '127.0.0.1'].includes(location.hostname)
      ? `http://${location.hostname}:3000`
      : Configuracao.API_PRODUCAO;
  }
}
