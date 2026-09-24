

function normalizarNumeroImportacao(valor) {

  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
  ) {
    return null;
  }

  if (typeof valor === 'number') {
    return Number.isFinite(valor)
      ? valor
      : null;
  }

  let texto =
    String(valor)
      .trim()
      .replace(/\s/g, '')
      .replace(/R\$/gi, '')
      .replace(/[^\d,.\-]/g, '');

  if (!texto) {
    return null;
  }

  const ultimaVirgula =
    texto.lastIndexOf(',');

  const ultimoPonto =
    texto.lastIndexOf('.');

  /*
   * Quando existem vírgula e ponto,
   * usamos o último separador como decimal.
   *
   * 1.250,50  -> 1250.50
   * 1,250.50  -> 1250.50
   */
  if (
    ultimaVirgula !== -1 &&
    ultimoPonto !== -1
  ) {

    if (ultimaVirgula > ultimoPonto) {
      texto =
        texto
          .replace(/\./g, '')
          .replace(',', '.');
    } else {
      texto =
        texto
          .replace(/,/g, '');
    }

  } else if (
    ultimaVirgula !== -1
  ) {

    const casasDecimais =
      texto.length -
      ultimaVirgula -
      1;

    if (
      casasDecimais >= 1 &&
      casasDecimais <= 2
    ) {
      texto =
        texto.replace(',', '.');
    } else {
      texto =
        texto.replace(/,/g, '');
    }

  } else if (
    (texto.match(/\./g) || []).length > 1
  ) {

    texto =
      texto.replace(/\./g, '');

  } else if (
    ultimoPonto !== -1
  ) {

    const casasDecimais =
      texto.length -
      ultimoPonto -
      1;

    if (
      casasDecimais > 2
    ) {
      texto =
        texto.replace(/\./g, '');
    }
  }

  const numero =
    Number(texto);

  return Number.isFinite(numero)
    ? numero
    : null;
}


function normalizarDataImportacao(valor) {

  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
  ) {
    return null;
  }

  /*
   * Excel pode entregar a data como objeto Date.
   */
  if (
    valor instanceof Date &&
    !Number.isNaN(valor.getTime())
  ) {
    return valor;
  }

  /*
   * Datas numéricas do Excel.
   * O Excel normalmente usa 25569 como referência
   * para 01/01/1970 no sistema de datas 1900.
   */
  if (
    typeof valor === 'number' &&
    Number.isFinite(valor)
  ) {

    if (
      valor > 20000 &&
      valor < 100000
    ) {

      const data =
        new Date(
          Date.UTC(
            1899,
            11,
            30
          ) +
          valor * 86400000
        );

      if (
        !Number.isNaN(
          data.getTime()
        )
      ) {
        return data;
      }
    }

    return null;
  }

  const texto =
    String(valor)
      .trim();

  /*
   * ISO:
   * 2026-09-23
   * 2026-09-23T10:30:00
   */
  if (
    /^\d{4}-\d{2}-\d{2}/.test(texto)
  ) {

    const data =
      new Date(texto);

    if (
      !Number.isNaN(
        data.getTime()
      )
    ) {
      return data;
    }
  }

  /*
   * Brasil:
   * 23/09/2026
   * 23-09-2026
   * 23.09.2026
   */
  const partes =
    texto.match(
      /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/
    );

  if (partes) {

    const dia =
      Number(partes[1]);

    const mes =
      Number(partes[2]);

    const ano =
      Number(partes[3]);

    const data =
      new Date(
        ano,
        mes - 1,
        dia
      );

    if (
      data.getFullYear() === ano &&
      data.getMonth() === mes - 1 &&
      data.getDate() === dia
    ) {
      return data;
    }
  }

  /*
   * Última tentativa:
   * datas reconhecidas nativamente pelo JavaScript.
   */
  const data =
    new Date(texto);

  return Number.isNaN(
    data.getTime()
  )
    ? null
    : data;
}


function prepararLinhaParaImportacao(linha) {

  const novaLinha = {
    ...linha
  };


  if (
    Object.prototype.hasOwnProperty.call(
      novaLinha,
      'Quantidade'
    )
  ) {
    const quantidade =
      normalizarNumeroImportacao(
        novaLinha.Quantidade
      );

    if (
      quantidade !== null
    ) {
      novaLinha.Quantidade =
        quantidade;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      novaLinha,
      'Preço Unitário'
    )
  ) {
    const preco =
      normalizarNumeroImportacao(
        novaLinha['Preço Unitário']
      );

    if (
      preco !== null
    ) {
      novaLinha['Preço Unitário'] =
        preco;
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(
      novaLinha,
      'Valor Líquido'
    )
  ) {
    const valor =
      normalizarNumeroImportacao(
        novaLinha['Valor Líquido']
      );

    if (
      valor !== null
    ) {
      novaLinha['Valor Líquido'] =
        valor;
    }
  }

  /*
   * CAMPOS OPCIONAIS
   *
   * Não criamos campos que não existem no Excel.
   * Assim, a validação consegue diferenciar:
   * - coluna ausente = campo realmente opcional
   * - coluna presente e inválida = erro de validação
   */

  /*
   * Se a coluna Preço Unitário existir no Excel,
   * normalizamos seu valor. Se não existir,
   * ela permanece ausente.
   */
  if (
    Object.prototype.hasOwnProperty.call(
      novaLinha,
      'Preço Unitário'
    )
  ) {
    const precoExistente =
      normalizarNumeroImportacao(
        novaLinha['Preço Unitário']
      );

    if (
      precoExistente !== null
    ) {
      novaLinha['Preço Unitário'] =
        precoExistente;
    }
  }

  return novaLinha;
}

const path = require('path');

const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '../.env.development.local')
});

dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

const express = require('express');




const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const XLSX = require('xlsx');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

const sql = require('./db');
const { authRequired, roleRequired } = require('./auth');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado.');
}

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin: true
  })
);

app.use(
  express.json({
    limit: '100kb'
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true
  })
);

/* ================================
   FRONTEND
================================ */

const publicPath = path.join(__dirname, '../public');

app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

/* ================================
   LOGIN
================================ */

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6).max(100)
});

app.get('/api/health', async (req, res) => {
  try {
    await sql`SELECT 1`;

    res.json({
      status: 'ok',
      banco: 'neon'
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      status: 'erro'
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        erro: 'Dados de login inválidos.'
      });
    }

    const { email, senha } = parsed.data;

    const rows = await sql`
      SELECT
        id,
        nome,
        email,
        senha_hash,
        perfil
      FROM usuarios
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `;

    const user = rows[0];

    if (!user || !bcrypt.compareSync(senha, user.senha_hash)) {
      return res.status(401).json({
        erro: 'E-mail ou senha inválidos.'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '2h'
      }
    );

    res.json({
      token,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil
      }
    });
  } catch (erro) {
    console.error('Erro no login:', erro);

    res.status(500).json({
      erro: 'Erro interno no login.'
    });
  }
});

/* ================================
   FILTROS
================================ */

function obterFiltros(query) {
  const {
    dataInicio,
    dataFim,
    vendedor,
    produto,
    categoria,
    pagamento,
    status
  } = query;

  const conditions = [];
  const params = [];

  if (dataInicio) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) {
      throw new Error('Data inicial inválida.');
    }

    conditions.push(`data >= $${params.length + 1}`);
    params.push(dataInicio);
  }

  if (dataFim) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
      throw new Error('Data final inválida.');
    }

    conditions.push(`data <= $${params.length + 1}`);
    params.push(dataFim);
  }

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new Error(
      'A data inicial não pode ser maior que a data final.'
    );
  }

  if (vendedor) {
    conditions.push(`vendedor = $${params.length + 1}`);
    params.push(vendedor);
  }

  if (produto) {
    conditions.push(`produto = $${params.length + 1}`);
    params.push(produto);
  }

  if (categoria) {
    conditions.push(`categoria = $${params.length + 1}`);
    params.push(categoria);
  }

  if (pagamento) {
    conditions.push(`pagamento = $${params.length + 1}`);
    params.push(pagamento);
  }

  if (status) {
    conditions.push(`status = $${params.length + 1}`);
    params.push(status);
  }

  const where =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  return {
    where,
    params
  };
}

/* ================================
   OPÇÕES DOS FILTROS
================================ */

app.get('/api/filtros', authRequired, async (req, res) => {
  try {
    const vendedores = await sql`
      SELECT DISTINCT vendedor
      FROM vendas
      ORDER BY vendedor
    `;

    const produtos = await sql`
      SELECT DISTINCT produto
      FROM vendas
      ORDER BY produto
    `;

    const categorias = await sql`
      SELECT DISTINCT categoria
      FROM vendas
      WHERE categoria IS NOT NULL
      ORDER BY categoria
    `;

    const pagamentos = await sql`
      SELECT DISTINCT pagamento
      FROM vendas
      WHERE pagamento IS NOT NULL
      ORDER BY pagamento
    `;

    const status = await sql`
      SELECT DISTINCT status
      FROM vendas
      WHERE status IS NOT NULL
      ORDER BY status
    `;

    res.json({
      vendedores: vendedores.map(item => item.vendedor),
      produtos: produtos.map(item => item.produto),
      categorias: categorias.map(item => item.categoria),
      pagamentos: pagamentos.map(item => item.pagamento),
      status: status.map(item => item.status)
    });
  } catch (error) {
    console.error('Erro ao carregar filtros:', error);
    res.status(500).json({
      error: 'Erro ao carregar opções dos filtros.'
    });
  }
});

/* ================================
   KPIs
================================ */

app.get('/api/kpis', authRequired, async (req, res) => {
  try {
    const { where, params } =
      obterFiltros(req.query);

    const query = `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN faturamento
              ELSE 0
            END
          ),
          0
        ) AS faturamento_pago,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS vendas_pagas,
        COALESCE(
          AVG(
            CASE
              WHEN status = 'Pago'
              THEN faturamento
            END
          ),
          0
        ) AS ticket_medio,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN quantidade
              ELSE 0
            END
          ),
          0
        ) AS itens_vendidos
      FROM vendas
      ${where}
    `;

    const rows = await sql.query(
      query,
      params
    );

    res.json(rows[0]);
  } catch (erro) {
    console.error(erro);

    res.status(400).json({
      erro: erro.message
    });
  }
});


/* ================================
   COMPARAÇÃO DE PERÍODOS
================================ */

app.get('/api/comparacao-periodos', authRequired, async (req, res) => {
  try {
    const dataInicio = String(req.query.dataInicio || '').trim();
    const dataFim = String(req.query.dataFim || '').trim();

    if (!dataInicio || !dataFim) {
      return res.json({
        disponivel: false,
        motivo: 'Informe dataInicio e dataFim para comparar períodos.'
      });
    }

    const inicio = new Date(`${dataInicio}T00:00:00`);
    const fim = new Date(`${dataFim}T00:00:00`);

    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fim.getTime()) ||
      inicio > fim
    ) {
      return res.status(400).json({
        erro: 'Período informado inválido.'
      });
    }

    const diferencaMs = fim.getTime() - inicio.getTime();
    const quantidadeDias =
      Math.floor(diferencaMs / 86400000) + 1;

    const inicioAnterior = new Date(
      inicio.getTime() - quantidadeDias * 86400000
    );

    const fimAnterior = new Date(
      inicio.getTime() - 86400000
    );

    const formatarData = (data) =>
      data.toISOString().slice(0, 10);

    const filtrosAtuais = { ...req.query };
    delete filtrosAtuais.dataInicio;
    delete filtrosAtuais.dataFim;

    const filtrosComparacao =
      obterFiltros(filtrosAtuais);

    const whereComparacao =
      filtrosComparacao.where.replace(
        /\$(\d+)/g,
        (_, numero) =>
          `$${Number(numero) + 4}`
      );

    const paramsComparacao =
      filtrosComparacao.params;

    const inicioAtualParam = formatarData(inicio);
    const fimAtualParam = formatarData(fim);
    const inicioAnteriorParam = formatarData(inicioAnterior);
    const fimAnteriorParam = formatarData(fimAnterior);

    const query = `
      SELECT
        periodo,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN faturamento
              ELSE 0
            END
          ),
          0
        ) AS faturamento,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS vendas,
        COALESCE(
          AVG(
            CASE
              WHEN status = 'Pago'
              THEN faturamento
            END
          ),
          0
        ) AS ticket_medio,
        COALESCE(
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN quantidade
              ELSE 0
            END
          ),
          0
        ) AS itens_vendidos
      FROM (
        SELECT
          'atual' AS periodo,
          faturamento,
          status,
          quantidade,
          vendedor,
          produto,
          categoria,
          pagamento
        FROM vendas
        WHERE data::date BETWEEN $1::date AND $2::date

        UNION ALL

        SELECT
          'anterior' AS periodo,
          faturamento,
          status,
          quantidade,
          vendedor,
          produto,
          categoria,
          pagamento
        FROM vendas
        WHERE data::date BETWEEN $3::date AND $4::date
      ) base
      ${whereComparacao}
      GROUP BY periodo
      ORDER BY periodo;
    `;

    const parametros = [
      inicioAtualParam,
      fimAtualParam,
      inicioAnteriorParam,
      fimAnteriorParam,
      ...paramsComparacao
    ];

    const rows = await sql.query(
      query,
      parametros
    );

    const atual =
      rows.find(row => row.periodo === 'atual') || {
        faturamento: 0,
        vendas: 0,
        ticket_medio: 0,
        itens_vendidos: 0
      };

    const anterior =
      rows.find(row => row.periodo === 'anterior') || {
        faturamento: 0,
        vendas: 0,
        ticket_medio: 0,
        itens_vendidos: 0
      };

    const numero = valor =>
      Number(valor || 0);

    const variacao = (atual, anterior) => {
      const a = numero(atual);
      const b = numero(anterior);

      if (b === 0) {
        return a === 0 ? 0 : null;
      }

      return ((a - b) / Math.abs(b)) * 100;
    };

    res.json({
      disponivel: true,
      periodoAtual: {
        inicio: inicioAtualParam,
        fim: fimAtualParam
      },
      periodoAnterior: {
        inicio: inicioAnteriorParam,
        fim: fimAnteriorParam
      },
      atual: {
        faturamento: numero(atual.faturamento),
        vendas: numero(atual.vendas),
        ticket_medio: numero(atual.ticket_medio),
        itens_vendidos: numero(atual.itens_vendidos)
      },
      anterior: {
        faturamento: numero(anterior.faturamento),
        vendas: numero(anterior.vendas),
        ticket_medio: numero(anterior.ticket_medio),
        itens_vendidos: numero(anterior.itens_vendidos)
      },
      variacao: {
        faturamento: variacao(
          atual.faturamento,
          anterior.faturamento
        ),
        vendas: variacao(
          atual.vendas,
          anterior.vendas
        ),
        ticket_medio: variacao(
          atual.ticket_medio,
          anterior.ticket_medio
        ),
        itens_vendidos: variacao(
          atual.itens_vendidos,
          anterior.itens_vendidos
        )
      }
    });

  } catch (erro) {
    console.error(erro);

    res.status(400).json({
      erro: erro.message
    });
  }
});

/* ================================
   VENDAS MENSAIS
================================ */

app.get(
  '/api/vendas-mensais',
  authRequired,
  async (req, res) => {
    try {
      const { where, params } =
        obterFiltros(req.query);

      const query = `
        SELECT
          TO_CHAR(
            data::date,
            'YYYY-MM'
          ) AS mes,
          ROUND(
            SUM(
              CASE
                WHEN status = 'Pago'
                THEN faturamento
                ELSE 0
              END
            )::numeric,
            2
          ) AS faturamento
        FROM vendas
        ${where}
        GROUP BY
          TO_CHAR(data::date, 'YYYY-MM')
        ORDER BY mes
      `;

      const rows = await sql.query(
        query,
        params
      );

      res.json(rows);
    } catch (erro) {
      console.error(erro);

      res.status(400).json({
        erro: erro.message
      });
    }
  }
);

/* ================================
   VENDEDORES
================================ */

app.get(
  '/api/vendedores',
  authRequired,
  async (req, res) => {
    try {
      const { where, params } =
        obterFiltros(req.query);

      const query = `
        SELECT
          vendedor,
          ROUND(
            SUM(
              CASE
                WHEN status = 'Pago'
                THEN faturamento
                ELSE 0
              END
            )::numeric,
            2
          ) AS faturamento,
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN 1
              ELSE 0
            END
          ) AS vendas,
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN quantidade
              ELSE 0
            END
          ) AS itens
        FROM vendas
        ${where}
        GROUP BY vendedor
        ORDER BY faturamento DESC
      `;

      const rows = await sql.query(
        query,
        params
      );

      res.json(rows);
    } catch (erro) {
      console.error(erro);

      res.status(400).json({
        erro: erro.message
      });
    }
  }
);

/* ================================
   PRODUTOS
================================ */

app.get(
  '/api/produtos',
  authRequired,
  async (req, res) => {
    try {
      const { where, params } =
        obterFiltros(req.query);

      const query = `
        SELECT
          produto,
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN 1
              ELSE 0
            END
          ) AS vendas,
          SUM(
            CASE
              WHEN status = 'Pago'
              THEN quantidade
              ELSE 0
            END
          ) AS itens,
          ROUND(
            SUM(
              CASE
                WHEN status = 'Pago'
                THEN faturamento
                ELSE 0
              END
            )::numeric,
            2
          ) AS faturamento
        FROM vendas
        ${where}
        GROUP BY produto
        ORDER BY faturamento DESC
      `;

      const rows = await sql.query(
        query,
        params
      );

      res.json(rows);
    } catch (erro) {
      console.error(erro);

      res.status(400).json({
        erro: erro.message
      });
    }
  }
);

/* ================================
   CATEGORIAS
================================ */

app.get(
  '/api/categorias',
  authRequired,
  async (req, res) => {
    try {
      const { where, params } = obterFiltros(req.query);

      const rows = await sql.query(
        `
        SELECT
          COALESCE(categoria, 'Não informado') AS categoria,
          ROUND(SUM(CASE WHEN status = 'Pago' THEN faturamento ELSE 0 END)::numeric, 2) AS faturamento,
          SUM(CASE WHEN status = 'Pago' THEN 1 ELSE 0 END) AS vendas
        FROM vendas
        ${where}
        GROUP BY COALESCE(categoria, 'Não informado')
        ORDER BY faturamento DESC
        `,
        params
      );

      res.json(rows);
    } catch (erro) {
      console.error(erro);
      res.status(400).json({ erro: erro.message });
    }
  }
);

/* ================================
   FORMAS DE PAGAMENTO
================================ */

app.get(
  '/api/pagamentos',
  authRequired,
  async (req, res) => {
    try {
      const { where, params } = obterFiltros(req.query);

      const rows = await sql.query(
        `
        SELECT
          COALESCE(pagamento, 'Não informado') AS pagamento,
          SUM(CASE WHEN status = 'Pago' THEN 1 ELSE 0 END) AS vendas,
          ROUND(SUM(CASE WHEN status = 'Pago' THEN faturamento ELSE 0 END)::numeric, 2) AS faturamento
        FROM vendas
        ${where}
        GROUP BY COALESCE(pagamento, 'Não informado')
        ORDER BY vendas DESC
        `,
        params
      );

      res.json(rows);
    } catch (erro) {
      console.error(erro);
      res.status(400).json({ erro: erro.message });
    }
  }
);

/* ================================
   LISTAGEM DE VENDAS
================================ */

app.get(
  '/api/vendas',
  authRequired,
  roleRequired('admin', 'analista'),
  async (req, res) => {
    try {
      const limit = Math.min(
        Number(req.query.limit) || 50,
        200
      );

      const { where, params } =
        obterFiltros(req.query);

      const query = `
        SELECT *
        FROM vendas
        ${where}
        ORDER BY data DESC
        LIMIT $${params.length + 1}
      `;

      const rows = await sql.query(
        query,
        [...params, limit]
      );

      res.json(rows);
    } catch (erro) {
      console.error(erro);

      res.status(400).json({
        erro: erro.message
      });
    }
  }
);

/* ================================
   IMPORTAÇÃO DE EXCEL
================================ */

function formatarDataExcel(valorData) {
  if (
    valorData instanceof Date &&
    !Number.isNaN(valorData.getTime())
  ) {
    return `${valorData.getFullYear()}-${String(
      valorData.getMonth() + 1
    ).padStart(2, '0')}-${String(
      valorData.getDate()
    ).padStart(2, '0')}`;
  }

  if (typeof valorData === 'number') {
    const dataExcel =
      XLSX.SSF.parse_date_code(valorData);

    if (!dataExcel) {
      throw new Error('Data inválida.');
    }

    return `${dataExcel.y}-${String(
      dataExcel.m
    ).padStart(2, '0')}-${String(
      dataExcel.d
    ).padStart(2, '0')}`;
  }

  const textoData =
    String(valorData ?? '').trim();

  if (!textoData) {
    throw new Error('Data não informada.');
  }

  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(
      textoData
    )
  ) {
    const [
      dia,
      mes,
      ano
    ] = textoData.split('/').map(Number);

    const data =
      new Date(
        ano,
        mes - 1,
        dia
      );

    if (
      data.getFullYear() !== ano ||
      data.getMonth() !== mes - 1 ||
      data.getDate() !== dia
    ) {
      throw new Error('Data inválida.');
    }

    return `${ano}-${String(
      mes
    ).padStart(2, '0')}-${String(
      dia
    ).padStart(2, '0')}`;
  }

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      textoData
    )
  ) {
    const [
      ano,
      mes,
      dia
    ] = textoData.split('-').map(Number);

    const data =
      new Date(
        ano,
        mes - 1,
        dia
      );

    if (
      data.getFullYear() !== ano ||
      data.getMonth() !== mes - 1 ||
      data.getDate() !== dia
    ) {
      throw new Error('Data inválida.');
    }

    return textoData;
  }

  const data =
    new Date(textoData);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    throw new Error('Data inválida.');
  }

  return `${data.getFullYear()}-${String(
    data.getMonth() + 1
  ).padStart(2, '0')}-${String(
    data.getDate()
  ).padStart(2, '0')}`;
}


/*
 * =========================================================
 * PRÉ-VISUALIZAÇÃO DO IMPORTADOR UNIVERSAL
 * =========================================================
 *
 * Analisa a planilha sem gravar nada no banco.
 */

app.post(
  '/api/vendas/preview-importacao',
  authRequired,
  roleRequired('admin'),
  upload.single('arquivo'),
  async (req, res) => {

    try {

      if (!req.file) {
        return res.status(400).json({
          erro: 'Nenhum arquivo Excel foi enviado.'
        });
      }

      const extensao =
        path
          .extname(req.file.originalname)
          .toLowerCase();

      if (!['.xlsx', '.xls', '.csv'].includes(extensao)) {
        return res.status(400).json({
          erro:
            'Formato inválido. Envie um arquivo Excel (.xlsx, .xls) ou CSV (.csv).'
        });
      }

      const workbook =
        XLSX.read(
          req.file.buffer,
          {
            type: 'buffer',
            cellDates: true,
            FS: extensao === '.csv' ? ';' : undefined
          }
        );

      let nomeAbaSelecionada = 'Vendas';

      let sheet =
        workbook.Sheets[nomeAbaSelecionada];

      if (!sheet) {

        const abasComDados =
          workbook.SheetNames.filter(nome => {

            const aba =
              workbook.Sheets[nome];

            if (!aba) return false;

            const range =
              XLSX.utils.decode_range(
                aba['!ref'] || 'A1'
              );

            return (
              range.e.r > range.s.r ||
              range.e.c > range.s.c
            );

          });

        if (!abasComDados.length) {

          return res.status(400).json({
            erro:
              'O arquivo Excel não possui nenhuma aba com dados.'
          });

        }

        nomeAbaSelecionada =
          abasComDados[0];

        sheet =
          workbook.Sheets[nomeAbaSelecionada];

      }

      const dados =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: null,
            raw: true
          }
        );

      if (!dados.length) {

        return res.status(400).json({
          erro:
            'O arquivo não possui registros.'
        });

      }

      








const normalizarColuna = valor =>
        String(valor ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');

      const aliasesColunas = {

        'ID Venda': [
          'id venda',
          'idvenda',
          'id',
          'codigo venda',
          'codigo da venda',
          'cod venda',
          'numero venda',
          'numero da venda',
          'pedido',
          'numero pedido'
        ],

        'Data': [
          'data',
          'data venda',
          'data da venda',
          'dt venda',
          'dt da venda',
          'dtvenda',
          'data pedido',
          'data da compra',
          'data compra'
        ],

        'Cliente': [
          'cliente',
          'nome cliente',
          'nome do cliente',
          'cliente nome',
          'razao social',
          'razao social cliente',
          'comprador',
          'nome comprador'
        ],

        'Vendedor': [
          'vendedor',
          'nome vendedor',
          'nome do vendedor',
          'consultor',
          'consultora',
          'representante',
          'representante comercial',
          'responsavel',
          'responsavel venda',
          'atendente'
        ],

        'Produto': [
          'produto',
          'nome produto',
          'nome do produto',
          'produto vendido',
          'item',
          'descricao produto',
          'descricao do produto',
          'mercadoria'
        ],

        'Categoria': [
          'categoria',
          'categoria produto',
          'grupo',
          'departamento',
          'linha',
          'segmento',
          'tipo produto'
        ],

        'Quantidade': [
          'quantidade',
          'qtd',
          'qtde',
          'qde',
          'quant',
          'volume',
          'unidades',
          'qtd vendida',
          'quantidade vendida'
        ],

        'Preço Unitário': [
          'preco unitario',
          'preco',
          'valor unitario',
          'valor por unidade',
          'preco por unidade',
          'preco venda',
          'preco de venda',
          'valor unidade'
        ],

        'Forma de Pagamento': [
          'forma de pagamento',
          'forma pagamento',
          'pagamento',
          'meio de pagamento',
          'meio pagamento',
          'metodo pagamento',
          'metodo de pagamento',
          'condicao pagamento',
          'condicao de pagamento'
        ],

        'Status': [
          'status',
          'situacao',
          'situacao venda',
          'estado',
          'status pedido',
          'situacao pedido'
        ],

        'Valor Líquido': [
          'valor liquido',
          'valor',
          'valor total',
          'valor venda',
          'valor da venda',
          'total',
          'faturamento',
          'faturamento liquido',
          'receita',
          'receita liquida',
          'total venda',
          'total da venda'
        ]

      };

      const colunasEncontradas =
        Object.keys(dados[0]);

      const mapaColunas = {};

      for (
        const colunaPadrao
        of Object.keys(aliasesColunas)
      ) {

        const candidatos = [
          colunaPadrao,
          ...aliasesColunas[colunaPadrao]
        ];

        const encontrada =
          colunasEncontradas.find(
            colunaExcel => {

              const normalizadaExcel =
                normalizarColuna(
                  colunaExcel
                );

              return candidatos.some(
                candidato =>
                  normalizarColuna(
                    candidato
                  ) === normalizadaExcel
              );

            }
          );

        if (encontrada) {

          mapaColunas[colunaPadrao] =
            encontrada;

        }

      }

      const colunasObrigatorias = [
        'ID Venda',
        'Data',
        'Cliente',
        'Vendedor',
        'Produto',
        'Quantidade',
        'Valor Líquido'
      ];

      const colunasOpcionais = [
        'Categoria',
        'Preço Unitário',
        'Forma de Pagamento',
        'Status'
      ];

      const colunasAusentes =
        colunasObrigatorias.filter(
          coluna =>
            !mapaColunas[coluna]
        );

      const mapeamento =
        colunasObrigatorias.map(
          coluna => ({
            campo: coluna,
            colunaExcel:
              mapaColunas[coluna] || null,
            encontrada:
              Boolean(mapaColunas[coluna])
          })
        );

      return res.json({

        sucesso: true,

        arquivo:
          req.file.originalname,

        aba:
          nomeAbaSelecionada,

        registros:
          dados.length,

        colunasEncontradas,

        mapeamento,

        colunasAusentes,

        prontoParaImportar:
          colunasAusentes.length === 0,

        /*
         * PRÉVIA DOS PRIMEIROS REGISTROS
         *
         * Envia somente uma pequena amostra para o frontend.
         * Isso permite conferir a planilha antes da importação
         * sem carregar todos os registros no modal.
         */
        previaLinhas:
          dados
            .slice(0, 5)
            .map(linha => {

              const linhaPrevia = {};

              for (
                const coluna of colunasEncontradas
              ) {

                linhaPrevia[coluna] =
                  linha[coluna];

              }

              return linhaPrevia;

            }),

        /*
         * QUALIDADE DOS DADOS
         *
         * Analisa os campos obrigatórios antes
         * da importação definitiva.
         */
        duplicidades:
          (() => {

            const mapaIds =
              new Map();

            for (
              const linha of dados
            ) {

              const colunaId =
                mapaColunas['ID Venda'];

              const valorId =
                colunaId
                  ? linha[colunaId]
                  : null;

              if(
                valorId === null ||
                valorId === undefined ||
                String(valorId).trim() === ''
              ){
                continue;
              }

              const id =
                String(valorId)
                  .trim();

              mapaIds.set(
                id,
                (mapaIds.get(id) || 0) + 1
              );

            }

            const idsDuplicados =
              Array.from(
                mapaIds.entries()
              )
              .filter(
                ([id, quantidade]) =>
                  quantidade > 1
              )
              .map(
                ([id, quantidade]) => ({
                  id,
                  quantidade
                })
              );

            const registrosDuplicados =
              idsDuplicados.reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  item.quantidade,
                0
              );

            return {

              possuiDuplicidades:
                idsDuplicados.length > 0,

              idsDuplicados:
                idsDuplicados.length,

              registrosDuplicados,

              detalhes:
                idsDuplicados
                  .slice(0, 20)

            };

          })(),

        qualidadeDados:
          (() => {

            let camposVazios = 0;
            let registrosComProblema = 0;
            let valoresInvalidos = 0;

            const camposAnalisados =
              colunasObrigatorias.length;

            for (
              const linhaOriginal of dados
            ) {

              const linha = {};

              for (
                const campo of colunasObrigatorias
              ) {

                const colunaExcel =
                  mapaColunas[campo];

                linha[campo] =
                  colunaExcel
                    ? linhaOriginal[colunaExcel]
                    : null;

              }

              let problemaNaLinha =
                false;

              for (
                const campo of colunasObrigatorias
              ) {

                const valor =
                  linha[campo];

                if(
                  valor === null ||
                  valor === undefined ||
                  String(valor).trim() === ''
                ){

                  camposVazios++;
                  problemaNaLinha = true;

                }

              }

              /*
               * Validação básica de quantidade,
               * preço e valor líquido.
               */
              const numeros = [
                'Quantidade',
                'Preço Unitário',
                'Valor Líquido'
              ];

              for(
                const campo of numeros
              ){

                const valor =
                  linha[campo];

                if(
                  valor !== null &&
                  valor !== undefined &&
                  String(valor).trim() !== ''
                ){

                  const numero =
                    Number(
                      String(valor)
                        .replace('R$', '')
                        .replace(/\s/g, '')
                        .replace(/\./g, '')
                        .replace(',', '.')
                    );

                  if(
                    !Number.isFinite(numero)
                  ){

                    valoresInvalidos++;
                    problemaNaLinha = true;

                  }

                }

              }

              if(
                problemaNaLinha
              ){

                registrosComProblema++;

              }

            }

            const totalPossiveis =
              dados.length *
              camposAnalisados;

            const totalProblemas =
              camposVazios +
              valoresInvalidos;

            const percentual =
              totalPossiveis > 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        (
                          1 -
                          (
                            totalProblemas /
                            totalPossiveis
                          )
                        ) *
                        100
                      )
                    )
                  )
                : 0;

            return {

              percentual,

              totalRegistros:
                dados.length,

              registrosComProblema,

              registrosValidos:
                Math.max(
                  0,
                  dados.length -
                  registrosComProblema
                ),

              camposVazios,

              valoresInvalidos

            };

          })()

      });

    } catch (erro) {

      console.error(
        'Erro no preview da importação:',
        erro
      );

      return res.status(500).json({
        erro:
          'Não foi possível analisar o arquivo Excel.',
        detalhe:
          erro.message
      });

    }

  }
);


app.post(
  '/api/vendas/importar',
  authRequired,
  roleRequired('admin'),
  upload.single('arquivo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          erro:
            'Nenhum arquivo Excel foi enviado.'
        });
      }

      const extensao =
        path
          .extname(
            req.file.originalname
          )
          .toLowerCase();

      if (
        !['.xlsx', '.xls'].includes(
          extensao
        )
      ) {
        return res.status(400).json({
          erro:
            'Formato inválido. Envie um arquivo Excel (.xlsx ou .xls).'
        });
      }

      const workbook =
        XLSX.read(
          req.file.buffer,
          {
            type: 'buffer',
            cellDates: true
          }
        );

      /*
       * IMPORTADOR UNIVERSAL
       *
       * Prioridade:
       * 1. Aba "Vendas", quando existir.
       * 2. Primeira aba que possuir dados.
       */

      let nomeAbaSelecionada = 'Vendas';

      let sheet =
        workbook.Sheets[nomeAbaSelecionada];

      if (!sheet) {

        const abasComDados =
          workbook.SheetNames.filter(nome => {

            const aba =
              workbook.Sheets[nome];

            if (!aba) {
              return false;
            }

            const range =
              XLSX.utils.decode_range(
                aba['!ref'] || 'A1'
              );

            return (
              range.e.r > range.s.r ||
              range.e.c > range.s.c
            );
          });

        if (!abasComDados.length) {
          return res.status(400).json({
            erro:
              'O arquivo Excel não possui nenhuma aba com dados.'
          });
        }

        nomeAbaSelecionada =
          abasComDados[0];

        sheet =
          workbook.Sheets[nomeAbaSelecionada];
      }

      const dados =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            defval: null,
            raw: true
          }
        );

      if (!dados.length) {
        return res.status(400).json({
          erro:
            'O arquivo não possui registros.'
        });
      }

      /*
       * MAPEAMENTO UNIVERSAL DE COLUNAS
       *
       * O sistema aceita diferentes nomes para a
       * mesma informação.
       */

      const normalizarColuna = valor =>
        String(valor ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');

      const aliasesColunas = {

        'ID Venda': [
          'id venda',
          'idvenda',
          'id',
          'codigo venda',
          'codigo da venda',
          'cod venda',
          'numero venda',
          'numero da venda',
          'pedido',
          'numero pedido'
        ],

        'Data': [
          'data',
          'data venda',
          'data da venda',
          'dt venda',
          'dt da venda',
          'dtvenda',
          'data pedido',
          'data da compra',
          'data compra'
        ],

        'Cliente': [
          'cliente',
          'nome cliente',
          'nome do cliente',
          'cliente nome',
          'razao social',
          'razao social cliente',
          'comprador',
          'nome comprador'
        ],

        'Vendedor': [
          'vendedor',
          'nome vendedor',
          'nome do vendedor',
          'consultor',
          'consultora',
          'representante',
          'representante comercial',
          'responsavel',
          'responsavel venda',
          'atendente'
        ],

        'Produto': [
          'produto',
          'nome produto',
          'nome do produto',
          'produto vendido',
          'item',
          'descricao produto',
          'descricao do produto',
          'mercadoria'
        ],

        'Categoria': [
          'categoria',
          'categoria produto',
          'grupo',
          'departamento',
          'linha',
          'segmento',
          'tipo produto'
        ],

        'Quantidade': [
          'quantidade',
          'qtd',
          'qtde',
          'qde',
          'quant',
          'volume',
          'unidades',
          'qtd vendida',
          'quantidade vendida'
        ],

        'Preço Unitário': [
          'preco unitario',
          'preco',
          'valor unitario',
          'valor por unidade',
          'preco por unidade',
          'preco venda',
          'preco de venda',
          'valor unidade'
        ],

        'Forma de Pagamento': [
          'forma de pagamento',
          'forma pagamento',
          'pagamento',
          'meio de pagamento',
          'meio pagamento',
          'metodo pagamento',
          'metodo de pagamento',
          'condicao pagamento',
          'condicao de pagamento'
        ],

        'Status': [
          'status',
          'situacao',
          'situacao venda',
          'estado',
          'status pedido',
          'situacao pedido'
        ],

        'Valor Líquido': [
          'valor liquido',
          'valor',
          'valor total',
          'valor venda',
          'valor da venda',
          'total',
          'faturamento',
          'faturamento liquido',
          'receita',
          'receita liquida',
          'total venda',
          'total da venda'
        ]

      };

      const colunasEncontradas =
        Object.keys(dados[0]);

      const mapaColunas = {};

      for (
        const colunaPadrao
        of Object.keys(aliasesColunas)
      ) {

        const candidatos = [
          colunaPadrao,
          ...aliasesColunas[colunaPadrao]
        ];

        const encontrada =
          colunasEncontradas.find(
            colunaExcel => {

              const normalizadaExcel =
                normalizarColuna(
                  colunaExcel
                );

              return candidatos.some(
                candidato =>
                  normalizarColuna(
                    candidato
                  ) === normalizadaExcel
              );

            }
          );

        if (encontrada) {

          mapaColunas[colunaPadrao] =
            encontrada;

        }

      }

      /*
       * Cria uma versão padronizada dos dados.
       * O restante do sistema continua trabalhando
       * com os nomes originais do Dashboard.
       */

      const dadosNormalizados =
        dados.map(linha => {

          const novaLinha = {
            ...linha
          };

          for (
            const colunaPadrao
            of Object.keys(mapaColunas)
          ) {

            const colunaOriginal =
              mapaColunas[colunaPadrao];

            novaLinha[colunaPadrao] =
              linha[colunaOriginal];

          }

          return prepararLinhaParaImportacao(
            novaLinha
          );

        });

      /*
       * Por enquanto mantemos os campos essenciais
       * exigidos pelo banco.
       */

      const colunasObrigatorias = [
        'ID Venda',
        'Data',
        'Cliente',
        'Vendedor',
        'Produto',
        'Quantidade',
        'Valor Líquido'
      ];

      /*
       * MAPEAMENTO MANUAL
       *
       * O sistema primeiro tenta identificar
       * automaticamente. Caso o frontend envie
       * escolhas manuais, elas sobrescrevem
       * somente os campos selecionados.
       */
      let mapeamentoManual = {};

      try {

        if (
          req.body &&
          req.body.mapeamentoManual
        ) {

          const recebido =
            JSON.parse(
              req.body.mapeamentoManual
            );

          if (
            recebido &&
            typeof recebido === 'object' &&
            !Array.isArray(recebido)
          ) {
            mapeamentoManual =
              recebido;
          }

        }

      } catch (erroMapeamento) {

        return res.status(400).json({
          erro:
            'O mapeamento manual enviado não é válido.'
        });

      }

      for (
        const campo of colunasObrigatorias
      ) {

        const colunaManual =
          mapeamentoManual[campo];

        if (
          typeof colunaManual === 'string' &&
          colunaManual.trim() &&
          colunasEncontradas.includes(
            colunaManual
          )
        ) {

          mapaColunas[campo] =
            colunaManual;

        }

      }

      /*
       * Impede que a mesma coluna do Excel
       * seja usada para dois campos diferentes.
       */
      const colunasUsadas =
        new Map();

      const conflitos = [];

      for (
        const campo of colunasObrigatorias
      ) {

        const coluna =
          mapaColunas[campo];

        if (!coluna) {
          continue;
        }

        if (
          colunasUsadas.has(coluna)
        ) {

          conflitos.push({
            colunaExcel: coluna,
            campos: [
              colunasUsadas.get(coluna),
              campo
            ]
          });

        } else {

          colunasUsadas.set(
            coluna,
            campo
          );

        }

      }

      if (conflitos.length) {

        return res.status(400).json({
          erro:
            'Uma mesma coluna do Excel foi vinculada a mais de um campo.',
          conflitos,
          sugestao:
            'Escolha uma coluna diferente para cada campo obrigatório.'
        });

      }

      /*
       * O mapeamento manual é aplicado antes
       * da validação definitiva dos registros.
       */
      const colunasAusentes =
        colunasObrigatorias.filter(
          coluna =>
            !mapaColunas[coluna]
        );

      if (
        colunasAusentes.length
      ) {

        return res.status(400).json({
          erro:
            'Não foi possível identificar todas as informações necessárias na planilha.',
          colunasAusentes,
          colunasEncontradas,
          sugestao:
            'Verifique os nomes das colunas ou utilize o mapeamento manual.'
        });

      }

      /*
       * A partir daqui usamos os dados
       * normalizados.
       */

      dados.splice(
        0,
        dados.length,
        ...dadosNormalizados
      );

      const vendas = [];
      const ids = new Set();
      const erros = [];

      for (
        let i = 0;
        i < dados.length;
        i++
      ) {
        const venda =
          dados[i];

        const linha =
          i + 2;

        try {
          const idExcel =
            String(
              venda['ID Venda'] ?? ''
            ).trim();

          if (!idExcel) {
            throw new Error(
              'ID da venda não informado.'
            );
          }

          if (
            ids.has(idExcel)
          ) {
            throw new Error(
              `ID da venda duplicado: ${idExcel}.`
            );
          }

          ids.add(idExcel);

          const dataFormatada =
            formatarDataExcel(
              venda['Data']
            );

          const produto =
            String(
              venda['Produto'] ?? ''
            ).trim();

          let categoria = null;

          if (
            Object.prototype.hasOwnProperty.call(
              venda,
              'Categoria'
            )
          ) {
            categoria =
              String(
                venda['Categoria'] ?? ''
              ).trim();

            if (!categoria) {
              throw new Error(
                'Categoria não informada.'
              );
            }
          }

          const cliente =
            String(
              venda['Cliente'] ?? ''
            ).trim();

          const vendedor =
            String(
              venda['Vendedor'] ?? ''
            ).trim();

          if (!produto) {
            throw new Error(
              'Produto não informado.'
            );
          }

          if (!cliente) {
            throw new Error(
              'Cliente não informado.'
            );
          }

          if (!vendedor) {
            throw new Error(
              'Vendedor não informado.'
            );
          }

          const quantidade =
            Number(
              venda['Quantidade']
            );

          if (
            !Number.isFinite(
              quantidade
            ) ||
            !Number.isInteger(
              quantidade
            ) ||
            quantidade <= 0
          ) {
            throw new Error(
              'Quantidade inválida.'
            );
          }

          let precoUnitario = null;

          if (
            Object.prototype.hasOwnProperty.call(
              venda,
              'Preço Unitário'
            )
          ) {
            precoUnitario =
              Number(
                venda['Preço Unitário']
              );

            if (
              !Number.isFinite(
                precoUnitario
              ) ||
              precoUnitario < 0
            ) {
              throw new Error(
                'Preço unitário inválido.'
              );
            }
          }

          const faturamento =
            Number(
              venda['Valor Líquido']
            );

          if (
            !Number.isFinite(
              faturamento
            ) ||
            faturamento < 0
          ) {
            throw new Error(
              'Valor líquido inválido.'
            );
          }

          let pagamento = null;

          if (
            Object.prototype.hasOwnProperty.call(
              venda,
              'Forma de Pagamento'
            )
          ) {
            pagamento =
              String(
                venda[
                  'Forma de Pagamento'
                ] ?? ''
              ).trim();

            if (
              pagamento ===
              'Cartão de Crédito'
            ) {
              pagamento =
                'Cartão';
            } else if (
              pagamento ===
                'Transferência' ||
              pagamento ===
                'Pix'
            ) {
              pagamento =
                'Pix';
            } else if (
              pagamento ===
              'Boleto'
            ) {
              pagamento =
                'Boleto';
            }

            if (
              ![
                'Pix',
                'Cartão',
                'Boleto'
              ].includes(
                pagamento
              )
            ) {
              throw new Error(
                'Forma de pagamento inválida.'
              );
            }
          }

          let status = null;

          if (
            Object.prototype.hasOwnProperty.call(
              venda,
              'Status'
            )
          ) {
            status =
              String(
                venda['Status'] ?? ''
              ).trim();

            if (
              status ===
              'Concluída'
            ) {
              status =
                'Pago';
            } else if (
              status ===
              'Cancelada'
            ) {
              status =
                'Cancelado';
            }

            if (
              ![
                'Pago',
                'Pendente',
                'Cancelado'
              ].includes(
                status
              )
            ) {
              throw new Error(
                'Status inválido.'
              );
            }
          }

          vendas.push({
            id:
              i + 1,
            data:
              dataFormatada,
            produto,
            categoria,
            cliente,
            vendedor,
            quantidade,
            preco_unitario:
              precoUnitario,
            pagamento,
            status,
            faturamento
          });
        } catch (
          erroLinha
        ) {
          erros.push({
            linha,
            id:
              venda[
                'ID Venda'
              ] || null,
            erro:
              erroLinha.message
          });
        }
      }

      if (
        erros.length > 0
      ) {
        return res.status(400).json({
          erro:
            'O arquivo possui registros inválidos e não foi importado.',
          totalRegistros:
            dados.length,
          registrosValidos:
            vendas.length,
          registrosComErro:
            erros.length,
          detalhes:
            erros.slice(
              0,
              50
            )
        });
      }

      await sql.transaction([
        sql`
          DELETE FROM vendas
        `,
        sql`
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
          SELECT
            x.id,
            x.data::date,
            x.produto,
            COALESCE(NULLIF(TRIM(x.categoria), ''), 'Não informado'),
            x.cliente,
            x.vendedor,
            x.quantidade,
            COALESCE(x.preco_unitario, 0),
            COALESCE(NULLIF(TRIM(x.pagamento), ''), 'Pix'),
            COALESCE(NULLIF(TRIM(x.status), ''), 'Pago'),
            x.faturamento
          FROM json_to_recordset(
            ${JSON.stringify(vendas)}
          ) AS x(
            id integer,
            data text,
            produto text,
            categoria text,
            cliente text,
            vendedor text,
            quantidade integer,
            preco_unitario numeric,
            pagamento text,
            status text,
            faturamento numeric
          )
        `
      ]);

      res.json({
        sucesso: true,
        mensagem:
          'Dados validados e atualizados com sucesso.',
        registros:
          vendas.length,
        arquivo:
          req.file.originalname
      });
    } catch (erro) {
      console.error(
        'Erro ao importar vendas:',
        erro
      );

      res.status(400).json({
        erro:
          erro.message ||
          'Erro ao processar o arquivo Excel.'
      });
    }
  }
);

/* ================================
   EXPORTAÇÃO PARA EXCEL
================================ */

app.get(
  '/api/vendas/exportar',
  authRequired,
  roleRequired('admin', 'analista'),
  async (req, res) => {
    try {
      const { where, params } =
        obterFiltros(req.query);

      const query = `
        SELECT
          id AS "ID",
          data AS "Data",
          produto AS "Produto",
          categoria AS "Categoria",
          cliente AS "Cliente",
          vendedor AS "Vendedor",
          quantidade AS "Quantidade",
          preco_unitario AS "Preço Unitário",
          pagamento AS "Pagamento",
          status AS "Status",
          faturamento AS "Faturamento"
        FROM vendas
        ${where}
        ORDER BY data DESC
      `;

      const rows =
        await sql.query(
          query,
          params
        );

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows
        );

      worksheet['!cols'] = [
        { wch: 8 },
        { wch: 14 },
        { wch: 24 },
        { wch: 18 },
        { wch: 22 },
        { wch: 16 },
        { wch: 12 },
        { wch: 18 },
        { wch: 14 },
        { wch: 14 },
        { wch: 18 }
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Vendas'
      );

      const arquivo =
        XLSX.write(
          workbook,
          {
            type: 'buffer',
            bookType: 'xlsx'
          }
        );

      const nomeArquivo =
        `relatorio-vendas-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${nomeArquivo}"`
      );

      res.send(arquivo);
    } catch (erro) {
      console.error(
        'Erro ao exportar vendas:',
        erro
      );

      res.status(400).json({
        erro:
          erro.message
      });
    }
  }
);

/* ================================
   TRATAMENTO DE ERROS
================================ */

app.use(
  (err, req, res, next) => {
    console.error(err);

    res.status(500).json({
      erro:
        'Erro interno do servidor.'
    });
  }
);

/* ================================
   SERVIDOR
================================ */

const port =
  Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(
    `Sistema rodando em http://localhost:${port}`
  );
});
