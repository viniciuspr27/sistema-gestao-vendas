# Guia para entender o projeto

## 1. Excel
Foi usado como origem dos dados. A aba Dados_Brutos representa a situação real: dados inconsistentes. Dados_Tratados representa a padronização.

## 2. SQL
O banco SQLite transforma a planilha em estrutura de dados consultável. A tabela `vendas` guarda os registros; `usuarios` controla acesso.

## 3. API
O Express cria endpoints HTTP. O dashboard não calcula tudo sozinho: ele pede os indicadores para a API, e a API consulta o banco com SQL.

## 4. Front-end
`public/index.html` é a interface. Chart.js desenha os gráficos com os dados recebidos da API.

## 5. Segurança
- Senhas devem ser armazenadas com hash (bcrypt), nunca em texto puro.
- JWT protege as rotas privadas.
- Helmet adiciona cabeçalhos de segurança.
- Rate limit reduz abuso de requisições.
- Zod valida entrada do login.
- SQL usa parâmetros (`?`) para reduzir risco de SQL injection.
- Perfis permitem separar permissões (`admin` e `analista`).

## 6. Fluxo para explicar em entrevista
`Excel → tratamento → banco SQL → API → autenticação/autorização → dashboard`.

## 7. O que ainda seria necessário para produção
HTTPS, segredo JWT em serviço seguro, banco gerenciado, logs/monitoramento, backup, testes automatizados, política de CORS restritiva, gestão de usuários e recuperação de senha.
