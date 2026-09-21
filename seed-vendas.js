const db = require('./src/db');

const vendas = [
  ['2026-01-05','Notebook Dell','Informática','Empresa Alpha','Carlos',2,3500,'Pix','Pago'],
  ['2026-01-08','Mouse Logitech','Informática','Cliente Silva','Ana',5,120,'Cartão','Pago'],
  ['2026-01-12','Teclado Mecânico','Informática','Tech Solutions','Carlos',3,280,'Pix','Pago'],
  ['2026-01-18','Monitor LG 24"','Monitores','Empresa Beta','Marcos',2,950,'Cartão','Pago'],
  ['2026-01-25','Headset Gamer','Acessórios','Cliente Souza','Ana',4,320,'Pix','Pago'],

  ['2026-02-03','Notebook Dell','Informática','Empresa Gamma','Carlos',1,3500,'Cartão','Pago'],
  ['2026-02-09','Mouse Logitech','Informática','Cliente Santos','Ana',8,120,'Pix','Pago'],
  ['2026-02-14','Monitor LG 24"','Monitores','Empresa Alpha','Marcos',3,950,'Boleto','Pago'],
  ['2026-02-20','Teclado Mecânico','Informática','Cliente Lima','Carlos',5,280,'Cartão','Pago'],
  ['2026-02-27','Headset Gamer','Acessórios','Tech Solutions','Ana',2,320,'Pix','Pendente'],

  ['2026-03-04','Notebook Dell','Informática','Empresa Beta','Marcos',2,3500,'Pix','Pago'],
  ['2026-03-10','Mouse Logitech','Informática','Cliente Silva','Ana',10,120,'Cartão','Pago'],
  ['2026-03-15','Monitor LG 24"','Monitores','Empresa Gamma','Carlos',2,950,'Boleto','Pago'],
  ['2026-03-21','Teclado Mecânico','Informática','Empresa Alpha','Marcos',4,280,'Pix','Pago'],
  ['2026-03-28','Headset Gamer','Acessórios','Cliente Souza','Ana',6,320,'Cartão','Cancelado'],

  ['2026-04-02','Notebook Dell','Informática','Empresa Delta','Carlos',3,3500,'Boleto','Pago'],
  ['2026-04-08','Mouse Logitech','Informática','Cliente Lima','Ana',7,120,'Pix','Pago'],
  ['2026-04-13','Monitor LG 24"','Monitores','Tech Solutions','Marcos',4,950,'Cartão','Pago'],
  ['2026-04-19','Teclado Mecânico','Informática','Empresa Beta','Carlos',6,280,'Pix','Pago'],
  ['2026-04-26','Headset Gamer','Acessórios','Cliente Santos','Ana',3,320,'Boleto','Pendente'],

  ['2026-05-03','Notebook Dell','Informática','Empresa Alpha','Marcos',1,3500,'Cartão','Pago'],
  ['2026-05-09','Mouse Logitech','Informática','Cliente Souza','Ana',12,120,'Pix','Pago'],
  ['2026-05-16','Monitor LG 24"','Monitores','Empresa Gamma','Carlos',3,950,'Cartão','Pago'],
  ['2026-05-22','Teclado Mecânico','Informática','Tech Solutions','Marcos',5,280,'Boleto','Pago'],
  ['2026-05-29','Headset Gamer','Acessórios','Cliente Silva','Ana',4,320,'Pix','Pago'],

  ['2026-06-04','Notebook Dell','Informática','Empresa Beta','Carlos',2,3500,'Pix','Pago'],
  ['2026-06-11','Mouse Logitech','Informática','Cliente Lima','Ana',9,120,'Cartão','Pago'],
  ['2026-06-17','Monitor LG 24"','Monitores','Empresa Delta','Marcos',2,950,'Boleto','Pago'],
  ['2026-06-23','Teclado Mecânico','Informática','Empresa Alpha','Carlos',7,280,'Pix','Pago'],
  ['2026-06-29','Headset Gamer','Acessórios','Cliente Souza','Ana',5,320,'Cartão','Pago']
];

const insert = db.prepare(`
  INSERT INTO vendas (
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
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const inserirTudo = db.transaction(() => {
  for (const venda of vendas) {
    const [
      data,
      produto,
      categoria,
      cliente,
      vendedor,
      quantidade,
      preco_unitario,
      pagamento,
      status
    ] = venda;

    const faturamento = quantidade * preco_unitario;

    insert.run(
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
    );
  }
});

inserirTudo();

console.log(`✅ ${vendas.length} vendas inseridas com sucesso.`);
