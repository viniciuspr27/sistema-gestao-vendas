const path = require('path');
const dotenv = require('dotenv');
const { neon } = require('@neondatabase/serverless');

dotenv.config({
  path: path.resolve(__dirname, '../.env.development.local')
});

dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada.');
}

const sql = neon(process.env.DATABASE_URL);

module.exports = sql;
