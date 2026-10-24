const app = require('./aplicacao');

const porta = process.env.PORT || 3000;
app.listen(porta, () => console.log(`API do Synapse ligada na porta ${porta} (ela só responde às telas; o sistema abre em http://localhost:5500)`));
