CREATE DATABASE IF NOT EXISTS synapse_simples CHARACTER SET utf8mb4;
USE synapse_simples;

CREATE TABLE usuario (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(60)  NOT NULL,
  login       VARCHAR(30)  NOT NULL UNIQUE,
  senha_hash  VARCHAR(100) NOT NULL,
  perfil      ENUM('admin', 'usuario') NOT NULL,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE categoria (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nome   VARCHAR(50) NOT NULL UNIQUE,
  ativo  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE insumo (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  nome     VARCHAR(60) NOT NULL UNIQUE,
  unidade  ENUM('KG', 'G', 'L', 'ML', 'UN') NOT NULL,
  custo    DECIMAL(10,4) NOT NULL,
  ativo    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE produto (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(20) NOT NULL UNIQUE,
  nome          VARCHAR(80) NOT NULL,
  categoria_id  INT NOT NULL,
  preco_venda   DECIMAL(10,2) NULL,
  forma_venda   ENUM('unidade', 'caixa') NOT NULL DEFAULT 'unidade',
  unidades_por_caixa INT NULL,
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (categoria_id) REFERENCES categoria(id)
);

CREATE TABLE ficha_tecnica (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  produto_id    INT NOT NULL,
  versao        INT NOT NULL,
  criada_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_nome  VARCHAR(60) NOT NULL,
  custo_total   DECIMAL(10,2) NOT NULL,
  rendimento    DECIMAL(10,3) NOT NULL DEFAULT 1,
  perda         DECIMAL(5,2)  NOT NULL DEFAULT 0,
  UNIQUE (produto_id, versao),
  FOREIGN KEY (produto_id) REFERENCES produto(id) ON DELETE CASCADE
);

CREATE TABLE item_ficha (
  ficha_id        INT NOT NULL,
  insumo_id       INT NOT NULL,
  quantidade      DECIMAL(10,3) NOT NULL,
  custo_unitario  DECIMAL(10,4) NOT NULL,
  PRIMARY KEY (ficha_id, insumo_id),
  FOREIGN KEY (ficha_id)  REFERENCES ficha_tecnica(id) ON DELETE CASCADE,
  FOREIGN KEY (insumo_id) REFERENCES insumo(id)
);

CREATE TABLE insumo_preco (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  insumo_id       INT NOT NULL,
  custo_anterior  DECIMAL(10,4) NULL,
  custo_novo      DECIMAL(10,4) NOT NULL,
  alterado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario_nome    VARCHAR(60) NOT NULL,
  INDEX (insumo_id, alterado_em),
  FOREIGN KEY (insumo_id) REFERENCES insumo(id)
);

CREATE TABLE sessao (
  id         VARCHAR(128) PRIMARY KEY,
  dados      TEXT   NOT NULL,
  expira_em  BIGINT NOT NULL
);

CREATE TABLE tentativa_login (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  login     VARCHAR(30) NOT NULL,
  feita_em  BIGINT      NOT NULL,
  INDEX (login, feita_em)
);

INSERT INTO categoria (nome) VALUES ('Picolé'), ('Pote 2L'), ('Sorvete de Massa'), ('Açaí');
