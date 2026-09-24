const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.development.local') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const sql = require('../src/db');

const indices = [
  'CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas (data)',
  'CREATE INDEX IF NOT EXISTS idx_vendas_status_data ON vendas (status, data)',
  'CREATE INDEX IF NOT EXISTS idx_vendas_vendedor ON vendas (vendedor)',
  'CREATE INDEX IF NOT EXISTS idx_vendas_produto ON vendas (produto)',
  'CREATE INDEX IF NOT EXISTS idx_vendas_categoria ON vendas (categoria)',
  'CREATE INDEX IF NOT EXISTS idx_vendas_pagamento ON vendas (pagamento)'
];

(async () => {
  try {
    for (const comando of indices) {
      await sql.query(comando);
      console.log('OK:', comando.split(' ON ')[0].replace('CREATE INDEX IF NOT EXISTS ', ''));
    }
    const tipo = await sql.query(
      "SELECT data_type FROM information_schema.columns WHERE table_name = 'vendas' AND column_name = 'data'"
    );
    console.log('Tipo da coluna data:', tipo[0] && tipo[0].data_type);
    process.exit(0);
  } catch (erro) {
    console.error('Erro:', erro.message);
    process.exit(1);
  }
})();
