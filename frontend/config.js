// Endereço da API (back-end). É o único arquivo que muda de um servidor para outro.
//
//   - No seu computador: a API roda na porta 3000 (npm start na pasta backend).
//   - Em produção, escolha UMA das opções:
//       ''                                 a hospedagem do front repassa /api para a API (recomendado, ver README)
//       'https://sua-api.up.railway.app'   a API em outro domínio (precisa de FRONTEND_URL e COOKIE_CROSS_SITE no back-end)
const API_PRODUCAO = '';

const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? `http://${location.hostname}:3000` // mesmo nome (localhost ou 127.0.0.1) para o cookie de login funcionar
  : API_PRODUCAO;
