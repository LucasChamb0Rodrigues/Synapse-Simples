const API_PRODUCAO = '';

const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? `http://${location.hostname}:3000`
  : API_PRODUCAO;
