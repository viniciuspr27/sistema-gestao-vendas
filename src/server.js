require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env')
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const XLSX = require('xlsx');

const db = require('./db');
const { authRequired, roleRequired } = require('./auth');

if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET não configurado. Copie .env.example para .env.'
  );
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

app.use(express.static('public'));

/* =====================================================
   LOGIN
===================================================== */

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6).max(100)
});

/* =====================================================
   HEALTH
===================================================== */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok'
  });
});

/* =====================================================
   LOGIN
===================================================== */

app.post('/api/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      erro: 'Dados de login inválidos.'
    });
  }

  const {
    email,
    senha
  } = parsed.data;

  const user = db
    .prepare(`
      SELECT
        id,
        nome,
        email,
        senha_hash,
        perfil
      FROM usuarios
      WHERE email = ?
    `)
    .get(email.toLowerCase());

  if (
    !user ||
    !bcrypt.compareSync(
      senha,
      user.senha_hash
    )
  ) {
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
});

/* =====================================================
   FILTROS
===================================================== */

function obterFiltros(query) {
  const {
    dataInicio,
    dataFim,
    vendedor,
    produto
  } = query;

  const conditions = [];
  const params = [];

  if (dataInicio) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) {
      throw new Error(
        'Data inicial inválida.'
      );
    }

    conditions.push('data >= ?');
    params.push(dataInicio);
  }

  if (dataFim) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
      throw new Error(
        'Data final inválida.'
      );
    }

    conditions.push('data <= ?');
    params.push(dataFim);
  }

  if (
    dataInicio &&
    dataFim &&
    dataInicio > dataFim
  ) {
    throw new Error(
      'A data inicial não pode ser maior que a data final.'
    );
  }

  if (vendedor) {
    conditions.push('vendedor = ?');
    params.push(vendedor);
  }

  if (produto) {
    conditions.push('produto = ?');
    params.push(produto);
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

/* =====================================================
   OPÇÕES DOS FILTROS
===================================================== */

app.get(
  '/api/filtros',
  authRequired,
  (req, res) => {
    const vendedores = db
      .prepare(`
        SELECT DISTINCT vendedor
        FROM vendas
        ORDER BY vendedor
      `)
      .all();

    const produtos = db
      .prepare(`
        SELECT DISTINCT produto
        FROM vendas
        ORDER BY produto
      `)
      .all();

    res.json({
      vendedores,
      produtos
    });
  }
);

/* =====================================================
   KPIs
===================================================== */

app.get(
  '/api/kpis',
  authRequired,
  (req, res) => {
    try {
      const {
        where,
        params
      } = obterFiltros(req.query);

      const kpi = db
        .prepare(`
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
        `)
        .get(...params);

      res.json(kpi);
    } catch (erro) {
      res.status(400).json({
        erro: erro.message
      });
    }
  }
);

/* =====================================================
   VENDAS MENSAIS
===================================================== */

app.get(
  '/api/vendas-mensais',
  authRequired,
  (req, res) => {
    try {
      const {
        where,
        params
      } = obterFiltros(req.query);

      const rows = db
        .prepare(`
          SELECT
            substr(data, 1, 7) AS mes,

            ROUND(
              SUM(
                CASE
                  WHEN status = 'Pago'
                  THEN faturamento
                  ELSE 0
                END
              ),
              2
            ) AS faturamento

          FROM vendas
          ${where}

          GROUP BY substr(data, 1, 7)

          ORDER BY mes
        `)
        .all(...params);

      res.json(rows);
    } catch (erro) {
      res.status(400).json({
        erro: erro.message
      });
    }
  }
);

/* =====================================================
   VENDEDORES
===================================================== */

app.get(
  '/api/vendedores',
  authRequired,
  (req, res) => {
    try {
      const {
        where,
        params
      } = obterFiltros(req.query);

      const rows = db
        .prepare(`
          SELECT
            vendedor,

            ROUND(
              SUM(
                CASE
                  WHEN status = 'Pago'
                  THEN faturamento
                  ELSE 0
                END
              ),
              2
            ) AS faturamento

          FROM vendas
          ${where}

          GROUP BY vendedor

          ORDER BY faturamento DESC
        `)
        .all(...params);

      res.json(rows);
    } catch (erro) {
      res.status(400).json({
        erro: erro.message
      });
    }
  }
);

/* =====================================================
   PRODUTOS
===================================================== */

app.get(
  '/api/produtos',
  authRequired,
  (req, res) => {
    try {
      const {
        where,
        params
      } = obterFiltros(req.query);

      const rows = db
        .prepare(`
          SELECT
            produto,

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
              ),
              2
            ) AS faturamento

          FROM vendas
          ${where}

          GROUP BY produto

          ORDER BY faturamento DESC
        `)
        .all(...params);

      res.json(rows);
    } catch (erro) {
      res.status(400).json({
        erro: erro.message
      });
    }
  }
);

/* =====================================================
   LISTAGEM DE VENDAS
===================================================== */

app.get(
  '/api/vendas',
  authRequired,
  roleRequired('admin', 'analista'),
  (req, res) => {
    try {
      const limit = Math.min(
        Number(req.query.limit) || 50,
        200
      );

      const {
        where,
        params
      } = obterFiltros(req.query);

      const rows = db
        .prepare(`
          SELECT *
          FROM vendas
          ${where}
          ORDER BY data DESC
          LIMIT ?
        `)
        .all(
          ...params,
          limit
        );

      res.json(rows);
    } catch (erro) {
      res.status(400).json({
        erro: erro.message
      });
    }
  }
);

/* =====================================================
   EXPORTAÇÃO PARA EXCEL
===================================================== */

app.get(
  '/api/vendas/exportar',
  authRequired,
  roleRequired('admin', 'analista'),
  (req, res) => {
    try {
      const {
        where,
        params
      } = obterFiltros(req.query);

      const rows = db
        .prepare(`
          SELECT
            id AS ID,
            data AS Data,
            produto AS Produto,
            categoria AS Categoria,
            cliente AS Cliente,
            vendedor AS Vendedor,
            quantidade AS Quantidade,
            preco_unitario AS 'Preço Unitário',
            pagamento AS Pagamento,
            status AS Status,
            faturamento AS Faturamento
          FROM vendas
          ${where}
          ORDER BY data DESC
        `)
        .all(...params);

      const dadosExcel = rows.map((venda) => ({
        ID: venda.ID,
        Data: venda.Data,
        Produto: venda.Produto,
        Categoria: venda.Categoria,
        Cliente: venda.Cliente,
        Vendedor: venda.Vendedor,
        Quantidade: venda.Quantidade,
        'Preço Unitário': venda['Preço Unitário'],
        Pagamento: venda.Pagamento,
        Status: venda.Status,
        Faturamento: venda.Faturamento
      }));

      const worksheet = XLSX.utils.json_to_sheet(
        dadosExcel
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

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        'Vendas'
      );

      const arquivo = XLSX.write(
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
        erro: erro.message
      });
    }
  }
);

/* =====================================================
   TRATAMENTO DE ERROS
===================================================== */

app.use(
  (err, req, res, next) => {
    console.error(err);

    res.status(500).json({
      erro: 'Erro interno do servidor.'
    });
  }
);

/* =====================================================
   SERVIDOR
===================================================== */

const port =
  Number(process.env.PORT) || 3000;

app.listen(
  port,
  () => {
    console.log(
      `Sistema rodando em http://localhost:${port}`
    );
  }
);