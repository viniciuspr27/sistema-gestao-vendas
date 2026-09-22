const XLSX = require('xlsx');
const db = require('./src/db');

const arquivo = './data/base_vendas.xlsx';

const workbook = XLSX.readFile(arquivo);
const sheet = workbook.Sheets['Vendas'];

if (!sheet) {
  throw new Error('A aba Vendas não foi encontrada.');
}

const dados = XLSX.utils.sheet_to_json(sheet, { defval: null });

console.log(`Registros encontrados no Excel: ${dados.length}`);

const pagamentoMap = {
  'Cartão de Crédito': 'Cartão',
  'Boleto': 'Boleto',
  'Transferência': 'Pix',
  'Pix': 'Pix'
};

const statusMap = {
  'Concluída': 'Pago',
  'Pendente': 'Pendente',
  'Cancelada': 'Cancelado'
};

function converterData(valor) {
  if (typeof valor === 'number') {
    const data = XLSX.SSF.parse_date_code(valor);

    return `${data.y}-${String(data.m).padStart(2, '0')}-${String(data.d).padStart(2, '0')}`;
  }

  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }

  return String(valor);
}

const vendas = dados.map((v, index) => {
  const pagamento = pagamentoMap[v['Forma de Pagamento']];
  const status = statusMap[v.Status];

  if (!pagamento) {
    throw new Error(`Forma de pagamento inválida na linha ${index + 2}: ${v['Forma de Pagamento']}`);
  }

  if (!status) {
    throw new Error(`Status inválido na linha ${index + 2}: ${v.Status}`);
  }

  return {
    id: index + 1,
    data: converterData(v.Data),
    produto: String(v.Produto),
    categoria: String(v.Categoria),
    cliente: String(v.Cliente),
    vendedor: String(v.Vendedor),
    quantidade: Number(v.Quantidade),
    preco_unitario: Number(v['Preço Unitário']),
    pagamento,
    status,
    faturamento: Number(v['Valor Líquido'])
  };
});

const inserir = db.prepare(`
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
    @id,
    @data,
    @produto,
    @categoria,
    @cliente,
    @vendedor,
    @quantidade,
    @preco_unitario,
    @pagamento,
    @status,
    @faturamento
  )
`);

const importar = db.transaction((lista) => {
  db.prepare('DELETE FROM vendas').run();

  for (const venda of lista) {
    inserir.run(venda);
  }
});

importar(vendas);

const total = db.prepare('SELECT COUNT(*) AS total FROM vendas').get();

console.log(`\n✅ Importação concluída!`);
console.log(`📊 Registros no banco: ${total.total}`);
