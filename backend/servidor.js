// Liga a API no computador.   Para rodar: npm start
// (Na Vercel quem usa o app é o api/index.js, sem este arquivo.)
const app = require('./aplicacao');

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`API do Synapse ligada na porta ${porta} (ela só responde às telas; o sistema abre em http://localhost:5500)`));
