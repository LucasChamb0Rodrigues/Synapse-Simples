const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const backend = path.join(__dirname, 'backend');
const frontend = path.join(__dirname, 'frontend');
const PORTA_TELAS = 5500;

if (!fs.existsSync(path.join(backend, 'node_modules'))) {
  console.log('Instalando as dependências da API (só na primeira vez)...');
  const instalacao = spawnSync('npm', ['install'], { cwd: backend, stdio: 'inherit', shell: true });
  if (instalacao.status !== 0) process.exit(1);
}

const api = spawn('npm', ['start'], { cwd: backend, stdio: 'inherit', shell: true });
api.on('exit', (codigo) => process.exit(codigo ?? 0));

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const telas = http.createServer((req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arquivo = path.join(frontend, caminho === '/' ? 'index.html' : caminho);
  if (!arquivo.startsWith(frontend + path.sep)) return res.writeHead(403).end();
  fs.readFile(arquivo, (erro, conteudo) => {
    if (erro) return res.writeHead(404).end('Não encontrado');
    res.writeHead(200, { 'Content-Type': `${TIPOS[path.extname(arquivo)] || 'application/octet-stream'}; charset=utf-8` });
    res.end(conteudo);
  });
});

let avisou = false;
function aguardarPorta() {
  if (!avisou) {
    avisou = true;
    console.error(`\nA porta ${PORTA_TELAS} está em uso (talvez o Live Server do VS Code). A API já está ligada.`);
    console.error('Feche o Live Server: as telas sobem sozinhas assim que a porta liberar.\n');
  }
  setTimeout(ligarTelas, 2000);
}

function ligarTelas() {
  http.get(`http://127.0.0.1:${PORTA_TELAS}`, (res) => { res.resume(); aguardarPorta(); })
    .on('error', () => telas.listen(PORTA_TELAS));
}

telas.on('error', aguardarPorta);
telas.on('listening', () => console.log(`\n>>> Abra o sistema em http://localhost:${PORTA_TELAS}  (para desligar tudo: Ctrl+C)\n`));
ligarTelas();
