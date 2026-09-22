const XLSX = require('xlsx');

const arquivo = './data/base_vendas.xlsx';

const workbook = XLSX.readFile(arquivo);

console.log('Abas encontradas:');
console.log(workbook.SheetNames);

const planilha = workbook.Sheets[workbook.SheetNames[0]];

const dados = XLSX.utils.sheet_to_json(planilha, { defval: null });

console.log('\nTotal de registros encontrados:', dados.length);

console.log('\nPrimeiro registro:');
console.log(dados[0]);

console.log('\nColunas:');
console.log(Object.keys(dados[0] || {}));
