const chartVendedoresTeste = null;
let chartProdutos=null;
let chartCategorias=null;
let chartPagamentos=null;

let vendasTabela=[];
let vendasFiltradas=[];
let vendasOriginais=[];

let paginaAtual=1;

const itensPorPagina=8;

/* =========================================================
CONFIGURAÇÕES
========================================================= */

const META_FATURAMENTO=150000;

const $=id=>document.getElementById(id);

const money=v=>
Number(v||0).toLocaleString(
"pt-BR",
{
style:"currency",
currency:"BRL"
}
);

/* =========================================================
API
========================================================= */

async function api(path){

const r=await fetch(
path,
{
headers:{
Authorization:`Bearer ${token}`
}
}
);

if(!r.ok){

let erro="Erro ao consultar API.";

try{
erro=(await r.json()).erro||erro;
}catch{}

throw new Error(erro);
}

return r.json();
}

/* =========================================================
LOGIN
========================================================= */

async function entrar(){

const email=$("email");
const senha=$("senha");
const erro=$("erro");
const msg=$("loginMessage");
const btn=$("loginButton");

erro.textContent="";
msg.classList.remove("show");

if(!email.value.trim()||!email.checkValidity()){

erro.textContent="Digite um e-mail válido.";
return;
}

if(!senha.value){

erro.textContent="Digite sua senha.";
return;
}

btn.classList.add("loading");

try{

const r=await fetch(
"/api/login",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
email:email.value.trim(),
senha:senha.value
})
}
);

const data=await r.json();

if(!r.ok){

throw new Error(
data.erro||"Não foi possível entrar."
);

}

localStorage.setItem(
"token",
data.token
);

token=data.token;

await showDash();

}catch(e){

erro.textContent=e.message;

}finally{

btn.classList.remove("loading");

}

}

function sair(){

localStorage.removeItem("token");

token=null;

location.reload();

}

function alternarSenha(){

const s=$("senha");

const b=document.querySelector(
".password-toggle"
);

if(s.type==="password"){

s.type="text";
b.textContent="Ocultar";

}else{

s.type="password";
b.textContent="Mostrar";

}

}

/* =========================================================
UTILITÁRIOS
========================================================= */

function formatarData(d){

if(!d)return "";

const p=String(d).split("-");

return p.length===3
?`${p[2]}/${p[1]}/${p[0]}`
:d;

}

function escaparHtml(v){

return String(v??"")
.replace(/&/g,"&amp;")
.replace(/</g,"&lt;")
.replace(/>/g,"&gt;")
.replace(/"/g,"&quot;")
.replace(/'/g,"&#039;");

}

function formatarPercentual(v){

const n=Number(v||0);

return `${n>=0?"+":""}${n.toFixed(1).replace(".",",")}%`;

}

function diferencaPercentual(atual,anterior){

const a=Number(atual||0);
const b=Number(anterior||0);

if(b===0){

if(a===0)return 0;

return 100;

}

return ((a-b)/Math.abs(b))*100;

}

function criarQuery(params){

const p=new URLSearchParams();

Object.entries(params||{}).forEach(([key,value])=>{

if(
value!==undefined&&
value!==null&&
String(value)!==""
){

p.set(key,value);

}

});

return p.toString()
?`?${p.toString()}`
:"";

}

/* =========================================================
IMPORTAÇÃO EXCEL
========================================================= */

async function abrirImportacaoExcel(){

const input=
document.getElementById("arquivoExcel");

if(!input){

alert("Campo de importação não encontrado.");
return;

}

input.click();

}

async function importarExcel(input){

  const arquivo =
    input.files && input.files[0];

  if(!arquivo) return;

  const token =
    localStorage.getItem("token");

  if(!token){

    alert(
      "Sua sessão expirou. Faça login novamente."
    );

    input.value = "";

    return;

  }

  const botao =
    document.querySelector(".update-excel-btn");

  if(botao){

    botao.disabled = true;

    botao.innerHTML =
      "<span>⏳</span> Analisando...";

  }

  try{

    /*
     * Primeiro fazemos apenas o PREVIEW.
     * Nada é gravado no banco nesta etapa.
     */

    const formData =
      new FormData();

    formData.append(
      "arquivo",
      arquivo
    );

    /*
     * Captura os campos escolhidos manualmente
     * no preview antes da importação definitiva.
     */
    const mapeamentoManual = {};

    document
      .querySelectorAll(
        "#importPreviewMapeamento .import-preview-manual-select"
      )
      .forEach(select => {

        const campo =
          select.dataset.campo;

        const coluna =
          select.value;

        if(
          campo &&
          coluna
        ){

          mapeamentoManual[campo] =
            coluna;

        }

      });

    formData.append(
      "mapeamentoManual",
      JSON.stringify(
        mapeamentoManual
      )
    );

    const resposta =
      await fetch(
        "/api/vendas/preview-importacao",
        {
          method:"POST",
          headers:{
            Authorization:`Bearer ${token}`
          },
          body:formData
        }
      );

    const resultado =
      await resposta.json();

    if(!resposta.ok){

      abrirModalImportacao(
        resultado
      );

      return;

    }

    abrirPreviewImportacao(
      resultado,
      arquivo
    );

  }catch(erro){

    console.error(
      "Erro ao analisar Excel:",
      erro
    );

    abrirModalImportacao({
      erro:
        erro.message ||
        "Não foi possível analisar o arquivo."
    });

  }finally{

    if(botao){

      botao.disabled = false;

      botao.innerHTML =
        '<span>↻</span> Atualizar dados';

    }

  }

}


/* =========================================================
FILTROS
========================================================= */

function obterQueryFiltros(){

const p=new URLSearchParams();

if($("dataInicio").value)
p.set(
"dataInicio",
$("dataInicio").value
);

if($("dataFim").value)
p.set(
"dataFim",
$("dataFim").value
);

if($("filtroVendedor").value)
p.set(
"vendedor",
$("filtroVendedor").value
);

if($("filtroProduto").value)
p.set(
"produto",
$("filtroProduto").value
);

if($("filtroCategoria").value)
p.set(
"categoria",
$("filtroCategoria").value
);

if($("filtroStatus").value)
p.set(
"status",
$("filtroStatus").value
);

if($("filtroPagamento").value)
p.set(
"pagamento",
$("filtroPagamento").value
);

return p.toString()
?`?${p.toString()}`
:"";

}

async function carregarFiltros(){

const d=await api("/api/filtros");

const vendedor=$("filtroVendedor");
const produto=$("filtroProduto");
const categoria=$("filtroCategoria");
const status=$("filtroStatus");
const pagamento=$("filtroPagamento");

vendedor.innerHTML=
'<option value="">Todos os vendedores</option>';

produto.innerHTML=
'<option value="">Todos os produtos</option>';

categoria.innerHTML=
'<option value="">Todas as categorias</option>';

status.innerHTML=
'<option value="">Todos os status</option>';

pagamento.innerHTML=
'<option value="">Todos os pagamentos</option>';

(d.vendedores||[]).forEach(x=>{

const o=document.createElement("option");

o.value=x;
o.textContent=x;

vendedor.appendChild(o);

});

(d.produtos||[]).forEach(x=>{

const o=document.createElement("option");

o.value=x;
o.textContent=x;

produto.appendChild(o);

});

(d.categorias||[]).forEach(x=>{

const o=document.createElement("option");

o.value=x;
o.textContent=x;

categoria.appendChild(o);

});

(d.status||[]).forEach(x=>{

const o=document.createElement("option");

o.value=x;
o.textContent=x;

status.appendChild(o);

});

(d.pagamentos||[]).forEach(x=>{

const o=document.createElement("option");

o.value=x;
o.textContent=x;

pagamento.appendChild(o);

});

}

function preencherSelect(
id,
valores,
primeiro
){

const select=$(id);

select.innerHTML=
`<option value="">${primeiro}</option>`;

[...valores]
.sort()
.forEach(v=>{

const option=
document.createElement("option");

option.value=v;
option.textContent=v;

select.appendChild(option);

});

}

function obterFiltrosExtras(){

return{
categoria:$("filtroCategoria").value,
status:$("filtroStatus").value,
pagamento:$("filtroPagamento").value,
canal:$("filtroCanal").value
};

}

function aplicarFiltrosExtras(dados){

return Array.isArray(dados)
? dados
: [];

}

function atualizarStatusFiltro(){

const itens=[];

if($("dataInicio").value)
itens.push(
"De "+formatarData($("dataInicio").value)
);

if($("dataFim").value)
itens.push(
"Até "+formatarData($("dataFim").value)
);

if($("filtroVendedor").value)
itens.push(
"Vendedor: "+$("filtroVendedor").value
);

if($("filtroProduto").value)
itens.push(
"Produto: "+$("filtroProduto").value
);

if($("filtroCategoria").value)
itens.push(
"Categoria: "+$("filtroCategoria").value
);

if($("filtroStatus").value)
itens.push(
"Status: "+$("filtroStatus").value
);

if($("filtroPagamento").value)
itens.push(
"Pagamento: "+$("filtroPagamento").value
);

if($("filtroCanal").value)
itens.push(
"Canal: "+$("filtroCanal").value
);

const box=$("filterStatus");

box.textContent=
itens.length
?"Filtros ativos: "+itens.join(" • ")
:"";

box.classList.toggle(
"active",
itens.length>0
);

}

async function aplicarFiltros(){

if(
$("dataInicio").value &&
$("dataFim").value &&
$("dataInicio").value>
$("dataFim").value
){

alert(
"A data inicial não pode ser maior que a data final."
);

return;

}

atualizarStatusFiltro();

await carregarDashboard();

}

async function limparFiltros(){

[
"dataInicio",
"dataFim",
"filtroVendedor",
"filtroProduto",
"filtroCategoria",
"filtroStatus",
"filtroPagamento",
"filtroCanal"
].forEach(
id=>$(id).value=""
);

$("buscaTabela").value="";

atualizarStatusFiltro();

await carregarDashboard();

}

/* =========================================================
DESTROY CHARTS
========================================================= */

function destroyCharts(){

[
chartMensal,
chartVendedores,
chartProdutos,
chartCategorias,
chartPagamentos
].forEach(c=>{

if(c)c.destroy();

});

chartMensal=null;
chartVendedores=null;
chartProdutos=null;
chartCategorias=null;
chartPagamentos=null;

}

/* =========================================================
OPÇÕES DOS GRÁFICOS
========================================================= */

function opcoesGrafico(horizontal=false){

return{

responsive:true,

maintainAspectRatio:false,

indexAxis:
horizontal?"y":"x",

plugins:{

legend:{
display:false
},

tooltip:{

callbacks:{
label:c=>` ${money(c.raw)}`
}

}

},

scales:{

x:{

grid:{
display:false
},

ticks:{
callback:
horizontal
?v=>v
:v=>money(v)
}

},

y:{

beginAtZero:true,

grid:{
color:"#eef2f7"
},

ticks:{
callback:
horizontal
?v=>money(v)
:v=>v
}

}

}

};

}

/* =========================================================
PLUGIN LINHA
========================================================= */

const faturamentoRevealPlugin={

id:"faturamentoReveal",

beforeDatasetsDraw(chart){

if(!chart.chartArea)return;

const progress=
typeof chart.$revealProgress==="number"
?chart.$revealProgress
:1;

if(progress>=1)return;

const{
ctx,
chartArea
}=chart;

const largura=
chartArea.right-chartArea.left;

ctx.save();

ctx.beginPath();

ctx.rect(
chartArea.left,
chartArea.top-5,
largura*progress,
chartArea.bottom-chartArea.top+10
);

ctx.clip();

chart.$revealClipAtivo=true;

},

afterDatasetsDraw(chart){

if(chart.$revealClipAtivo){

chart.ctx.restore();

chart.$revealClipAtivo=false;

}

}

};

if(window.Chart){
Chart.register(faturamentoRevealPlugin);
}

/* =========================================================
PLUGIN DOUGHNUT
========================================================= */

const centroDoughnutPlugin={

id:"centroDoughnut",

afterDraw(chart){

if(
chart.config.type!=="doughnut"||
!chart.chartArea
)return;

const dataset=
chart.data.datasets?.[0];

if(!dataset||!dataset.data?.length)
return;

const total=
dataset.data.reduce(
(a,b)=>a+Number(b||0),
0
);

const quantidade=
chart.data.labels?.length||0;

const meta=
chart.getDatasetMeta(0);

if(!meta?.data?.length)return;

const primeiro=
meta.data[0];

const x=primeiro.x;
const y=primeiro.y;

const ctx=chart.ctx;

ctx.save();

ctx.textAlign="center";
ctx.textBaseline="middle";

ctx.fillStyle="#94a3b8";
ctx.font="700 9px Inter, Arial, sans-serif";

ctx.fillText(
"FATURAMENTO",
x,
y-22
);

ctx.fillStyle="#0f172a";
ctx.font="800 18px Inter, Arial, sans-serif";

ctx.fillText(
money(total),
x,
y+1
);

ctx.fillStyle="#64748b";
ctx.font="600 9px Inter, Arial, sans-serif";

ctx.fillText(
`${quantidade} categorias`,
x,
y+21
);

ctx.restore();

}

};

if(window.Chart){
Chart.register(centroDoughnutPlugin);
}

/* =========================================================
ANIMAÇÃO LINHA
========================================================= */

function animarLinhaFaturamento(){

if(!chartMensal)return;

if(chartMensal.$revealFrame){

cancelAnimationFrame(
chartMensal.$revealFrame
);

chartMensal.$revealFrame=null;

}

chartMensal.$revealStarted=false;
chartMensal.$revealProgress=0;

const inicio=performance.now();
const duracao=3200;

function frame(agora){

if(!chartMensal)return;

const decorrido=
agora-inicio;

const progresso=
Math.min(
1,
decorrido/duracao
);

const ease=
1-Math.pow(
1-progresso,
3
);

chartMensal.$revealProgress=ease;

chartMensal.draw();

if(progresso<1){

chartMensal.$revealFrame=
requestAnimationFrame(frame);

}else{

chartMensal.$revealFrame=null;
chartMensal.$revealProgress=1;
chartMensal.draw();

}

}

chartMensal.$revealFrame=
requestAnimationFrame(frame);

chartMensal.$revealStarted=true;

}

let faturamentoObserver=null;

function iniciarAnimacaoGraficos(){

const alvo=
document.getElementById("chartVisaoGeral");

if(!alvo||!chartMensal)return;

if(faturamentoObserver){

faturamentoObserver.disconnect();
faturamentoObserver=null;

}

if(!("IntersectionObserver" in window)){

animarLinhaFaturamento();
return;

}

faturamentoObserver=
new IntersectionObserver(
entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

if(!chartMensal.$revealStarted){

animarLinhaFaturamento();

}

}

});

},
{threshold:.25}
);

faturamentoObserver.observe(alvo);

}

/* =========================================================
PALETAS
========================================================= */

const paletaRankingClean=[
"#d4af37",
"#94a3b8",
"#64748b",
"#334155",
"#2563eb",
"#3b82f6",
"#475569",
"#0f172a",
"#7c8798",
"#5b6b82"
];

const paletaRankingCleanBorda=[
"#b08c1f",
"#7c8794",
"#475569",
"#1e293b",
"#1d4ed8",
"#2563eb",
"#334155",
"#020617",
"#64748b",
"#475569"
];

function coresRanking(lista){

return lista.map(
(_,i)=>
paletaRankingClean[
i%paletaRankingClean.length
]
);

}

function bordasRanking(lista){

return lista.map(
(_,i)=>
paletaRankingCleanBorda[
i%paletaRankingCleanBorda.length
]
);

}

/* =========================================================
COMPARAÇÃO DE PERÍODOS
========================================================= */

function obterIntervaloAtual(){

let inicio=$("dataInicio").value;
let fim=$("dataFim").value;

const datas=
vendasOriginais
.map(v=>v.data)
.filter(Boolean)
.sort();

if(!inicio&&datas.length)
inicio=datas[0];

if(!fim&&datas.length)
fim=datas[datas.length-1];

if(!inicio&&!fim)
return null;

if(!inicio)inicio=fim;
if(!fim)fim=inicio;

return{
inicio,
fim
};

}

function adicionarDias(dataString,dias){

const d=
new Date(`${dataString}T12:00:00`);

d.setDate(d.getDate()+dias);

return d.toISOString().slice(0,10);

}

function calcularPeriodoAnterior(intervalo){

if(!intervalo)return null;

const inicio=
new Date(`${intervalo.inicio}T12:00:00`);

const fim=
new Date(`${intervalo.fim}T12:00:00`);

const dias=
Math.max(
1,
Math.round(
(fim-inicio)/86400000
)+1
);

const anteriorFim=
adicionarDias(
intervalo.inicio,
-1
);

const anteriorInicio=
adicionarDias(
anteriorFim,
-(dias-1)
);

return{
inicio:anteriorInicio,
fim:anteriorFim,
dias
};

}

function obterQueryComparacao(){

const intervalo=
obterIntervaloAtual();

if(!intervalo)return null;

const anterior=
calcularPeriodoAnterior(intervalo);

if(!anterior)return null;

return criarQuery({

dataInicio:anterior.inicio,
dataFim:anterior.fim,
vendedor:$("filtroVendedor").value,
produto:$("filtroProduto").value

});

}

async function carregarComparacao(){

try{

const intervalo =
obterIntervaloAtual();

if(!intervalo){

limparComparacoes();

return null;

}

const query =
obterQueryFiltros();

const comparacao =
await api(
`/api/comparacao-periodos${query}`
);

if(!comparacao || !comparacao.disponivel){

limparComparacoes();

return null;

}

return comparacao;

}catch(e){

console.warn(
"Não foi possível carregar comparação:",
e
);

limparComparacoes();

return null;

}

}

function limparComparacoes(){

[
"fatComparacao",
"vendasComparacao",
"ticketComparacao",
"itensComparacao",
"vendedoresComparacao",
"produtosComparacao"
].forEach(id=>{

const el=$(id);

if(!el)return;

el.className="kpi-comparison neutral";

el.innerHTML=
`— <span class="kpi-period">vs. período anterior</span>`;

});

}

function atualizarComparacaoElemento(
id,
atual,
anterior
){

const el=$(id);

if(!el)return;

const pct=
diferencaPercentual(
atual,
anterior
);

const classe=
pct>0.05
?"up"
:pct<-0.05
?"down"
:"neutral";

const simbolo=
pct>0.05
?"↑"
:pct<-0.05
?"↓"
:"→";

el.className=
`kpi-comparison ${classe}`;

el.innerHTML=
`${simbolo} ${formatarPercentual(pct)}
<span class="kpi-period">vs. período anterior</span>`;

}

function atualizarPainelDesempenho(
atual,
anterior
){

const fat =
Number(atual?.atual?.faturamento || 0);

const vendas =
Number(atual?.atual?.vendas || 0);

const ticket =
Number(atual?.atual?.ticket_medio || 0);

const pctFat =
Number(
atual?.variacao?.faturamento ?? 0
);

$("performanceFaturamento").textContent =
money(fat);

$("performanceVendas").textContent =
vendas.toLocaleString("pt-BR");

$("performanceTicket").textContent =
money(ticket);

return pctFat;

}

function atualizarMeta(faturamento){

const valor=
Number(faturamento||0);

const percentual=
META_FATURAMENTO>0
?(valor/META_FATURAMENTO)*100
:0;

const percentualVisual=
Math.min(
100,
Math.max(
0,
percentual
)
);

const restante=
Math.max(
0,
META_FATURAMENTO-valor
);

$("metaPercentual").textContent=
`${percentual.toFixed(1).replace(".",",")}%`;

$("metaRealizado").textContent=
money(valor);

$("metaAlvo").textContent=
`Meta: ${money(META_FATURAMENTO)}`;

$("metaFill").style.width=
`${percentualVisual}%`;

$("metaProgresso").textContent=
`${money(valor)} realizado`;

if(valor<META_FATURAMENTO){

$("metaRestante").textContent=
`Faltam ${money(restante)}`;

$("metaMensagem").textContent=
`Você está a ${money(restante)} da meta de faturamento definida para este período.`;

}else{

$("metaRestante").textContent=
`Meta superada em ${money(valor-META_FATURAMENTO)}`;

$("metaMensagem").textContent=
`Meta atingida. O faturamento ultrapassou o objetivo em ${money(valor-META_FATURAMENTO)}.`;

}

}

/* =========================================================
DASHBOARD
========================================================= */

async function carregarDashboard(){

const q=
obterQueryFiltros();

const[
k,
m,
v,
p
]=await Promise.all([

api(`/api/kpis${q}`),

api(`/api/vendas-mensais${q}`),

api(`/api/vendedores${q}`),

api(`/api/produtos${q}`)

]);

await carregarTabelaVendas();

const dadosExtras=
aplicarFiltrosExtras(
vendasOriginais
);

const kpiExtra=
calcularKpisExtras(
dadosExtras
);

$("fat").textContent=
money(k.faturamento_pago);

$("vendas").textContent=
Number(
k.vendas_pagas||0
).toLocaleString("pt-BR");

$("ticket").textContent=
money(k.ticket_medio);

$("itens").textContent=
Number(
k.itens_vendidos||0
).toLocaleString("pt-BR");

$("vendedoresAtivos").textContent=
kpiExtra.vendedores.toLocaleString("pt-BR");

$("produtosAnalisados").textContent=
kpiExtra.produtos.toLocaleString("pt-BR");

atualizarMeta(
k.faturamento_pago
);

const anterior=
await carregarComparacao();

if(anterior){

atualizarComparacaoElemento(
"fatComparacao",
anterior.atual.faturamento,
anterior.anterior.faturamento
);

atualizarComparacaoElemento(
"vendasComparacao",
anterior.atual.vendas,
anterior.anterior.vendas
);

atualizarComparacaoElemento(
"ticketComparacao",
anterior.atual.ticket_medio,
anterior.anterior.ticket_medio
);

atualizarComparacaoElemento(
"itensComparacao",
anterior.atual.itens_vendidos,
anterior.anterior.itens_vendidos
);

atualizarComparacaoElemento(
"vendedoresComparacao",
kpiExtra.vendedores,
Number(anterior.vendedores_ativos||0)
);

atualizarComparacaoElemento(
"produtosComparacao",
kpiExtra.produtos,
Number(anterior.produtos_analisados||0)
);

const pctFat=
atualizarPainelDesempenho(
k,
anterior
);

$("insightDesempenho").textContent=
`${pctFat>=0?"↑":"↓"} ${Math.abs(pctFat).toFixed(1).replace(".",",")}%`;

$("insightDesempenhoValor").textContent=
pctFat>=0
?`O faturamento cresceu ${Math.abs(pctFat).toFixed(1).replace(".",",")}% em relação ao período anterior.`
:`O faturamento caiu ${Math.abs(pctFat).toFixed(1).replace(".",",")}% em relação ao período anterior.`;

}else{

limparComparacoes();

$("performanceFaturamento").textContent=
money(k.faturamento_pago);

$("performanceVendas").textContent=
Number(k.vendas_pagas||0).toLocaleString("pt-BR");

$("performanceTicket").textContent=
money(k.ticket_medio);

$("performanceFaturamentoChange").textContent=
"Comparação indisponível";

$("performanceVendasChange").textContent=
"Comparação indisponível";

$("performanceTicketChange").textContent=
"Comparação indisponível";

$("insightDesempenho").textContent=
"Período atual";

$("insightDesempenhoValor").textContent=
"Selecione um período com dados para comparar automaticamente o desempenho.";

}

destroyCharts();

/* =========================================================
FATURAMENTO
========================================================= */

chartMensal=
new Chart(
$("mensal"),
{

type:"line",

data:{

labels:
m.map(x=>x.mes),

datasets:[{

label:"Faturamento",

data:
m.map(
x=>Number(x.faturamento)
),

borderColor:"#d4af37",

backgroundColor:
(ctx)=>{

const chart=
ctx.chart;

const area=
chart.chartArea;

if(!area)
return "rgba(196,154,50,.12)";

const g=
chart.ctx.createLinearGradient(
0,
area.top,
0,
area.bottom
);

g.addColorStop(
0,
"rgba(212,175,55,.30)"
);

g.addColorStop(
.55,
"rgba(196,154,50,.12)"
);

g.addColorStop(
1,
"rgba(196,154,50,.015)"
);

return g;

},

borderWidth:3,
tension:.35,
fill:true,
pointRadius:4,
pointHoverRadius:8,
pointBackgroundColor:"#d4af37",
pointBorderColor:"#fff",
pointBorderWidth:2,

segment:{
borderColor:"#d4af37"
}

}]

},

options:{

...opcoesGrafico(false),

animation:false,

interaction:{
intersect:false,
mode:"index"
},

plugins:{

...opcoesGrafico(false).plugins,

legend:{
display:false
},

tooltip:{

backgroundColor:"#111827",
titleColor:"#f8fafc",
bodyColor:"#f3d477",
borderColor:"#c49a32",
borderWidth:1,
padding:12,
displayColors:false,

callbacks:{
label:c=>
` Faturamento: ${money(c.raw)}`
}

}

}

}

}
);

/* =========================================================
RANKING
========================================================= */

const rankingVendedores=
[...v].sort(
(a,b)=>
Number(b.faturamento)-
Number(a.faturamento)
);

const nomesVendedores=
rankingVendedores.map(
x=>x.vendedor
);

const valoresVendedores=
rankingVendedores.map(
x=>Number(x.faturamento)
);

chartVendedores =
new Chart(
$("vendedores"),
{
type:"bar",

data:{
labels:nomesVendedores,
datasets:[{
data:valoresVendedores,
backgroundColor:coresRanking(rankingVendedores),
borderColor:bordasRanking(rankingVendedores),
borderWidth:1,
borderRadius:7,
borderSkipped:false,
barThickness:24,
maxBarThickness:28
}]
},

options:{
...opcoesGrafico(true),

layout:{
padding:{
left:4,
right:12,
top:5,
bottom:5
}
},

plugins:{
legend:{
display:false
},

tooltip:{
backgroundColor:"#111827",
titleColor:"#f8fafc",
bodyColor:"#f3d477",
borderColor:"#c49a32",
borderWidth:1,
padding:12,
displayColors:false,

callbacks:{
title:items =>
items.length
? items[0].label
: "",

label:context => {
const vendedor =
rankingVendedores[context.dataIndex];

if(!vendedor)return "";

return [
`Faturamento: ${money(Number(vendedor.faturamento||0))}`,
`Vendas: ${Number(vendedor.vendas||0).toLocaleString("pt-BR")}`,
`Itens: ${Number(vendedor.itens||0).toLocaleString("pt-BR")}`
];
}
}
},

onClick:(event,elements)=>{
if(!elements.length)return;

const indice=elements[0].index;

const vendedor =
rankingVendedores[indice]?.vendedor;

if(!vendedor)return;

const filtro=$("filtroVendedor");

if(filtro){
filtro.value=vendedor;
}

carregarDashboard();
},

scales:{
x:{
beginAtZero:true,

grid:{
color:"rgba(148,163,184,.10)"
},

ticks:{
color:"#64748b",
font:{
size:9
},
callback:value=>money(value)
}
},

y:{
grid:{
display:false
},

ticks:{
color:"#334155",
font:{
size:10,
weight:"700"
},
padding:6
}
}
}
}
}
);

