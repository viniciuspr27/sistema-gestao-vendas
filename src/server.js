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
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
    produto
  } = query;

  const conditions = [];
  const params = [];

  if (dataInicio) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio)) {
      throw new Error('Data inicial inválida.');
    }

    conditions.push(
      `data >= $${params.length + 1}`
    );

    params.push(dataInicio);
  }

  if (dataFim) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
      throw new Error('Data final inválida.');
    }

    conditions.push(
      `data <= $${params.length + 1}`
    );

    params.push(dataFim);
  }

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw new Error(
      'A data inicial não pode ser maior que a data final.'
    );
  }

  if (vendedor) {
    conditions.push(
      `vendedor = $${params.length + 1}`
    );

    params.push(vendedor);
  }

  if (produto) {
    conditions.push(
      `produto = $${params.length + 1}`
    );

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

    res.json({
      vendedores,
      produtos
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      erro: 'Erro ao carregar filtros.'
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
          ) AS faturamento

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

app.post(
  '/api/vendas/importar',
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

      const workbook = XLSX.read(req.file.buffer, {
        type: 'buffer'
      });

      const sheet = workbook.Sheets['Vendas'];

      if (!sheet) {
        return res.status(400).json({
          erro: 'A aba "Vendas" não foi encontrada no arquivo.'
        });
      }

      const dados = XLSX.utils.sheet_to_json(sheet);

      if (!dados.length) {
        return res.status(400).json({
          erro: 'O arquivo não possui registros.'
        });
      }

      const vendas = [];
      const ids = new Set();

      for (let i = 0; i < dados.length; i++) {
        const venda = dados[i];
        const linha = i + 2;

        const id = i + 1;

        const valorData = venda['Data'];
        let dataFormatada;

        if (typeof valorData === 'number') {
          const dataExcel = XLSX.SSF.parse_date_code(valorData);

          if (!dataExcel) {
            throw new Error(`Data inválida na linha ${linha}.`);
          }

          dataFormatada =
            `${dataExcel.y}-${String(dataExcel.m).padStart(2, '0')}-${String(dataExcel.d).padStart(2, '0')}`;
        } else {
          const data = new Date(valorData);

          if (Number.isNaN(data.getTime())) {
            throw new Error(`Data inválida na linha ${linha}.`);
          }

          dataFormatada =
            `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
        }

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

        if (!['Pix', 'Cartão', 'Boleto'].includes(pagamento)) {
          throw new Error(`Forma de pagamento inválida na linha ${linha}.`);
        }

        let status = venda['Status'];

        if (status === 'Concluída') {
          status = 'Pago';
        } else if (status === 'Cancelada') {
          status = 'Cancelado';
        }

        if (!['Pago', 'Pendente', 'Cancelado'].includes(status)) {
          throw new Error(`Status inválido na linha ${linha}.`);
        }

        vendas.push({
          id,
          data: dataFormatada,
          produto: venda['Produto'],
          categoria: venda['Categoria'],
          cliente: venda['Cliente'],
          vendedor: venda['Vendedor'],
          quantidade: Number(venda['Quantidade']),
          preco_unitario: Number(venda['Preço Unitário']),
          pagamento,
          status,
          faturamento: Number(venda['Valor Líquido'])
        });
      }

      /*
        Monta todos os valores antes de alterar o banco.
      */
      /*
        Uma única operação para apagar e inserir os dados.
      */
      await sql.transaction([
        sql`DELETE FROM vendas`,
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
            x.categoria,
            x.cliente,
            x.vendedor,
            x.quantidade,
            x.preco_unitario,
            x.pagamento,
            x.status,
            x.faturamento
          FROM json_to_recordset(${JSON.stringify(vendas)}) AS x(
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
        mensagem: 'Dados atualizados com sucesso.',
        registros: vendas.length
      });
    } catch (erro) {
      console.error('Erro ao importar vendas:', erro);

      res.status(400).json({
        erro: erro.message
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

      const rows = await sql.query(
        query,
        params
      );

      const worksheet =
        XLSX.utils.json_to_sheet(rows);

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

/* ================================
   TRATAMENTO DE ERROS
================================ */

app.use(
  (err, req, res, next) => {
    console.error(err);

    res.status(500).json({
      erro: 'Erro interno do servidor.'
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