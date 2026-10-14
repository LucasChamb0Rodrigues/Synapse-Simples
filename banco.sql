-- Synapse (versão simplificada) — script do banco de dados MySQL 8
-- Como executar: abra no MySQL Workbench e clique no raio (Execute),
-- ou no Prompt de Comando:  mysql -u root -p < banco.sql

CREATE DATABASE IF NOT EXISTS synapse_simples CHARACTER SET utf8mb4;
USE synapse_simples;

-- Pessoas que usam o sistema.
-- perfil "recepcao" = administrador (faz tudo); "entrega" = só consulta o catálogo.
CREATE TABLE usuario (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(60)  NOT NULL,
  login       VARCHAR(30)  NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,          -- a senha nunca é guardada, só o "hash" dela
  perfil      ENUM('recepcao', 'entrega') NOT NULL
);

CREATE TABLE categoria (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  nome  VARCHAR(50) NOT NULL UNIQUE
);

-- Matéria-prima usada nos produtos (leite, açúcar, palito...).
CREATE TABLE insumo (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  nome     VARCHAR(60) NOT NULL UNIQUE,
  unidade  ENUM('KG', 'G', 'L', 'ML', 'UN') NOT NULL,
  custo    DECIMAL(10,4) NOT NULL              -- preço atual de 1 unidade
);

CREATE TABLE produto (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(20) NOT NULL UNIQUE,
  nome          VARCHAR(80) NOT NULL,
  categoria_id  INT NOT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE = produto descontinuado
  FOREIGN KEY (categoria_id) REFERENCES categoria(id)
);

-- Ficha técnica: cada vez que é salva, cria uma NOVA versão (a maior versão é a atual).
CREATE TABLE ficha_tecnica (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  produto_id    INT NOT NULL,
  versao        INT NOT NULL,
  criada_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_nome  VARCHAR(60) NOT NULL,           -- quem salvou
  custo_total   DECIMAL(10,2) NOT NULL,         -- custo calculado no momento em que foi salva
  UNIQUE (produto_id, versao),
  FOREIGN KEY (produto_id) REFERENCES produto(id) ON DELETE CASCADE
);

-- Insumos de cada versão da ficha, com o preço que o insumo tinha naquele dia.
CREATE TABLE item_ficha (
  ficha_id        INT NOT NULL,
  insumo_id       INT NOT NULL,
  quantidade      DECIMAL(10,3) NOT NULL,
  custo_unitario  DECIMAL(10,4) NOT NULL,
  PRIMARY KEY (ficha_id, insumo_id),             -- o mesmo insumo não se repete na ficha
  FOREIGN KEY (ficha_id)  REFERENCES ficha_tecnica(id) ON DELETE CASCADE,
  FOREIGN KEY (insumo_id) REFERENCES insumo(id)   -- impede excluir insumo usado em ficha
);

-- Rastreabilidade: quem fez o quê e quando.
CREATE TABLE auditoria (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_nome  VARCHAR(60)  NOT NULL,
  acao          VARCHAR(40)  NOT NULL,
  entidade      VARCHAR(40)  NOT NULL,
  detalhe       VARCHAR(255) NOT NULL DEFAULT '',
  data_hora     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categorias iniciais da Gebon
INSERT INTO categoria (nome) VALUES ('Picolé'), ('Pote 2L'), ('Sorvete de Massa'), ('Açaí');
