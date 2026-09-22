require('dotenv').config({
  path: require('path').resolve(__dirname, '.env.development.local')
});

require('dotenv').config({
  path: require('path').resolve(__dirname, '.env')
});

const XLSX = require('xlsx');
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não encontrada.');
}

const sql = neon(process.env.DATABASE_URL);

async function importar() {
  console.log('Lendo Excel...');

  const workbook = XLSX.readFile('./data/base_vendas.xlsx');
  const sheet = workbook.Sheets['Vendas'];

  if (!sheet) {
    throw new Error('A aba "Vendas" não foi encontrada.');
  }

  const dados = XLSX.utils.sheet_to_json(sheet);

  console.log(`Registros encontrados: ${dados.length}`);

  await sql`DELETE FROM vendas`;

  console.log('Tabela vendas limpa.');

  let contador = 0;

  for (const venda of dados) {
    const dataExcel = Number(venda['Data']);
    const data = XLSX.SSF.parse_date_code(dataExcel);

    const dataFormatada =
      `${data.y}-${String(data.m).padStart(2, '0')}-${String(data.d).padStart(2, '0')}`;

    let pagamento = venda['Forma de Pagamento'];

    if (pagamento === 'Cartão de Crédito') {
      pagamento = 'Cartão';
    } else if (
      pagamento === 'Transferência' ||
      pagamento === 'Pix'
    ) {
      pagamento = 'Pix';
    } else if (pagamento === 'Boleto') {
      pagamento = 'Boleto';
    }

    let status = venda['Status'];

    if (status === 'Concluída') {
      status = 'Pago';
    } else if (status === 'Pendente') {
      status = 'Pendente';
    } else if (status === 'Cancelada') {
      status = 'Cancelado';
    }

    await sql`
      INSERT INTO vendas (
        id,
        data,
        produto,
        categoria,
        cliente,
        vendedor,
        quantidade,
        preco_unitario,
        pagamento,
        status,
        faturamento
      )
      VALUES (
        ${contador + 1},
        ${dataFormatada},
        ${venda['Produto']},
        ${venda['Categoria']},
        ${venda['Cliente']},
        ${venda['Vendedor']},
        ${Number(venda['Quantidade'])},
        ${Number(venda['Preço Unitário'])},
        ${pagamento},
        ${status},
        ${Number(venda['Valor Líquido'])}
      )
    `;

    contador++;

    if (contador % 100 === 0) {
      console.log(`Importados: ${contador}/${dados.length}`);
    }
  }

  const resultado = await sql`
    SELECT COUNT(*)::int AS total
    FROM vendas
  `;

  console.log('');
  console.log('================================');
  console.log('IMPORTAÇÃO CONCLUÍDA!');
  console.log('================================');
  console.log(`Registros no Neon: ${resultado[0].total}`);
}

importar().catch((erro) => {
  console.error('');
  console.error('ERRO NA IMPORTAÇÃO:');
  console.error(erro);
  process.exit(1);
});
