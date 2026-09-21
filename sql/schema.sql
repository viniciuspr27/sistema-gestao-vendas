PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('admin','analista')),
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY,
  data TEXT NOT NULL,
  produto TEXT NOT NULL,
  categoria TEXT NOT NULL,
  cliente TEXT NOT NULL,
  vendedor TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario REAL NOT NULL CHECK (preco_unitario >= 0),
  pagamento TEXT NOT NULL CHECK (pagamento IN ('Pix','Cartão','Boleto')),
  status TEXT NOT NULL CHECK (status IN ('Pago','Pendente','Cancelado')),
  faturamento REAL NOT NULL CHECK (faturamento >= 0)
);

CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas(data);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_produto ON vendas(produto);
