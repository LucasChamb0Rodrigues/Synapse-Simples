const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

class Iniciador {
  static PORTA_TELAS = 5500;
  static TIPOS = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };

  constructor() {
    this.backend = path.join(__dirname, 'backend');
    this.frontend = path.join(__dirname, 'frontend');
    this.avisou = false;
    this.telas = http.createServer((req, res) => this.responder(req, res));
  }

  iniciar() {
    this.instalarDependencias();
    this.ligarApi();
    this.telas.on('error', () => this.aguardarPorta());
    this.telas.on('listening', () =>
      console.log(
        `\n>>> Abra o sistema em http://localhost:${Iniciador.PORTA_TELAS}  (para desligar tudo: Ctrl+C)\n`,
      ),
    );
    this.ligarTelas();
  }

  instalarDependencias() {
    if (fs.existsSync(path.join(this.backend, 'node_modules'))) return;
    console.log('Instalando as dependências da API (só na primeira vez)...');
    const instalacao = spawnSync('npm', ['install'], {
      cwd: this.backend,
      stdio: 'inherit',
      shell: true,
    });
    if (instalacao.status !== 0) process.exit(1);
  }

  ligarApi() {
    const api = spawn('npm', ['start'], { cwd: this.backend, stdio: 'inherit', shell: true });
    api.on('exit', (codigo) => process.exit(codigo ?? 0));
  }

  responder(req, res) {
    try {
      const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const arquivo = path.join(this.frontend, caminho === '/' ? 'index.html' : caminho);
      if (!arquivo.startsWith(this.frontend + path.sep)) return res.writeHead(403).end();
      fs.readFile(arquivo, (erro, conteudo) => {
        if (erro) return res.writeHead(404).end('Não encontrado');
        const tipo = Iniciador.TIPOS[path.extname(arquivo)] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': `${tipo}; charset=utf-8` });
        res.end(conteudo);
      });
    } catch {
      // endereço inválido (byte nulo, %ZZ malformado): responde 400 em vez de derrubar o servidor
      res.writeHead(400).end('Pedido inválido');
    }
  }

  aguardarPorta() {
    if (!this.avisou) {
      this.avisou = true;
      console.error(
        `\nA porta ${Iniciador.PORTA_TELAS} está em uso (talvez o Live Server do VS Code). A API já está ligada.`,
      );
      console.error('Feche o Live Server: as telas sobem sozinhas assim que a porta liberar.\n');
    }
    setTimeout(() => this.ligarTelas(), 2000);
  }

  ligarTelas() {
    http
      .get(`http://127.0.0.1:${Iniciador.PORTA_TELAS}`, (res) => {
        res.resume();
        this.aguardarPorta();
      })
      .on('error', () => this.telas.listen(Iniciador.PORTA_TELAS));
  }
}

new Iniciador().iniciar();
