require('dotenv').config({ path: '.env.development.local' });
require('dotenv').config({ path: '.env' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function criar() {
  await sql`
    CREATE TABLE IF NOT EXISTS logs_auditoria (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER,
      usuario_nome TEXT,
      acao TEXT NOT NULL,
      detalhe TEXT,
      criado_em TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log('Tabela logs_auditoria criada com sucesso.');
}

criar().catch(e => { console.error(e); process.exit(1); });
