require('dotenv').config({
  path: require('path').resolve(__dirname, '.env.development.local')
});

require('dotenv').config({
  path: require('path').resolve(__dirname, '.env')
});

const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function criarAdmin() {
  const senhaHash = bcrypt.hashSync('Admin@123', 10);

  await sql`
    INSERT INTO usuarios (
      nome,
      email,
      senha_hash,
      perfil
    )
    VALUES (
      'Administrador',
      'admin@demo.com',
      ${senhaHash},
      'admin'
    )
    ON CONFLICT (email)
    DO UPDATE SET
      senha_hash = EXCLUDED.senha_hash,
      perfil = EXCLUDED.perfil
  `;

  console.log('================================');
  console.log('USUÁRIO ADMIN CRIADO!');
  console.log('================================');
  console.log('E-mail: admin@demo.com');
  console.log('Senha: Admin@123');
}

criarAdmin().catch((erro) => {
  console.error('ERRO:', erro);
  process.exit(1);
});
