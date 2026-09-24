


let token=localStorage.getItem("token");

let chartMensal=null;
let chartVendedores=null;
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

/* =========================================================
TOP PRODUTOS
========================================================= */

const topProdutos=
[...p]
.sort(
(a,b)=>
Number(b.faturamento)-
Number(a.faturamento)
)
.slice(0,8);

chartProdutos=
new Chart(
$("produtos"),
{

type:"bar",

data:{

labels:
topProdutos.map(
x=>x.produto
),

datasets:[{

data:
topProdutos.map(
x=>Number(x.faturamento)
),

backgroundColor:
coresRanking(topProdutos),

borderColor:
bordasRanking(topProdutos),

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

legend:{display:false},

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

const produto =
topProdutos[context.dataIndex];

if(!produto)return "";

return [
`Faturamento: ${money(Number(produto.faturamento||0))}`,
`Vendas: ${Number(produto.vendas||0).toLocaleString("pt-BR")}`,
`Itens: ${Number(produto.itens||0).toLocaleString("pt-BR")}`
];

}

}

},

scales:{

x:{

beginAtZero:true,

grid:{
color:"rgba(148,163,184,.10)"
},

ticks:{
color:"#64748b",
font:{size:9},
callback:value=>money(value)
}

},

y:{

grid:{display:false},

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

/* =========================================================
CATEGORIAS
========================================================= */

const categorias=
agruparPorCampo(
dadosExtras,
"categoria",
"faturamento"
);

const coresCategorias=[
"#d4af37",
"#2563eb",
"#64748b",
"#0f172a",
"#94a3b8",
"#3b82f6",
"#475569",
"#c5a43d"
];

chartCategorias=
new Chart(
$("categorias"),
{

type:"doughnut",

data:{

labels:
categorias.labels,

datasets:[{

data:
categorias.valores,

backgroundColor:
categorias.labels.map(
(_,i)=>
coresCategorias[
i%coresCategorias.length
]
),

borderColor:"#ffffff",
borderWidth:3,
hoverBorderColor:"#f3d477",
hoverBorderWidth:4,
hoverOffset:14,
spacing:4,
borderRadius:6

}]

},

options:{

responsive:true,
maintainAspectRatio:false,
cutout:"64%",
rotation:-90,
circumference:360,

animation:{
animateRotate:true,
animateScale:true,
duration:1700,
easing:"easeOutCubic"
},

interaction:{
intersect:true,
mode:"nearest"
},

plugins:{

legend:{

position:"right",
align:"center",

labels:{

usePointStyle:true,
pointStyle:"circle",
padding:13,
color:"#475569",

font:{
size:10,
weight:"600"
},

generateLabels(chart){

const data=chart.data;

if(!data.labels?.length)
return [];

const dataset=data.datasets[0];

const total=
dataset.data.reduce(
(a,b)=>a+Number(b||0),
0
);

return data.labels.map(
(label,i)=>{

const valor=
Number(dataset.data[i]||0);

const percentual=
total
?(valor/total*100)
:0;

return{

text:
`${label} · ${percentual.toFixed(1)}%`,

fillStyle:
dataset.backgroundColor[i],

strokeStyle:
dataset.backgroundColor[i],

lineWidth:0,
pointStyle:"circle",

hidden:
!chart.getDataVisibility(i),

index:i

};

});

}

}

},

tooltip:{

backgroundColor:"#0f172a",
titleColor:"#fff",
bodyColor:"#e2e8f0",
borderColor:"#d4af37",
borderWidth:1,
padding:13,
displayColors:true,
usePointStyle:true,
boxPadding:5,

callbacks:{

label:c=>{

const total=
c.dataset.data.reduce(
(a,b)=>a+Number(b||0),
0
);

const valor=
Number(c.raw||0);

const pct=
total
?(valor/total*100)
:0;

return[
` ${money(valor)}`,
` ${pct.toFixed(1)}% do faturamento`
];

}

}

}

}

}

}
);

/* =========================================================
PAGAMENTOS
========================================================= */

const pagamentos=
contarPorCampo(
dadosExtras,
"pagamento"
);

chartPagamentos=
new Chart(
$("pagamentos"),
{

type:"bar",

data:{

labels:
pagamentos.labels,

datasets:[{

label:"Vendas",

data:
pagamentos.valores,

backgroundColor:[
"#c49a32",
"#2563eb",
"#64748b",
"#334155"
],

borderColor:[
"#9a6b18",
"#1d4ed8",
"#475569",
"#1e293b"
],

borderWidth:1,
borderRadius:10,
borderSkipped:false,
barThickness:28,
maxBarThickness:32

}]

},

options:{

responsive:true,
maintainAspectRatio:false,
indexAxis:"y",

layout:{
padding:{
right:18
}
},

plugins:{

legend:{display:false},

tooltip:{

backgroundColor:"#111827",
titleColor:"#fff",
bodyColor:"#e5e7eb",
borderColor:"rgba(196,154,50,.45)",
borderWidth:1,
padding:12,
displayColors:true,

callbacks:{

label:c=>{

const total=
c.dataset.data.reduce(
(a,b)=>a+Number(b||0),
0
);

const pct=
total
?(Number(c.raw)/total*100)
:0;

return `${Number(c.raw).toLocaleString("pt-BR")} vendas · ${pct.toFixed(1)}%`;

}

}

}

},

scales:{

x:{

beginAtZero:true,

grid:{
color:"rgba(148,163,184,.12)"
},

ticks:{
precision:0,
color:"#64748b",
font:{size:10}
}

},

y:{

grid:{display:false},

ticks:{
color:"#334155",
font:{
size:11,
weight:"700"
}
}

}

}

}

}
);

/* =========================================================
ANIMAÇÃO
========================================================= */

requestAnimationFrame(()=>{

iniciarAnimacaoGraficos();

});

gerarInsights(
dadosExtras,
topProdutos,
v
);

}

/* =========================================================
KPIS EXTRAS
========================================================= */

function calcularKpisExtras(dados){

const vendedores=new Set();
const produtos=new Set();

dados.forEach(v=>{

if(v.vendedor)
vendedores.add(v.vendedor);

if(v.produto)
produtos.add(v.produto);

});

return{

vendedores:vendedores.size,
produtos:produtos.size

};

}

/* =========================================================
AGRUPAMENTOS
========================================================= */

function agruparPorCampo(
dados,
campo,
valor
){

const mapa={};

dados.forEach(v=>{

const chave=
v[campo]||
"Não informado";

mapa[chave]=
(mapa[chave]||0)+
Number(v[valor]||0);

});

const lista=
Object.entries(mapa)
.sort(
(a,b)=>b[1]-a[1]
);

return{

labels:
lista.map(x=>x[0]),

valores:
lista.map(x=>x[1])

};

}

function contarPorCampo(
dados,
campo
){

const mapa={};

dados.forEach(v=>{

const chave=
v[campo]||
"Não informado";

mapa[chave]=
(mapa[chave]||0)+1;

});

const lista=
Object.entries(mapa)
.sort(
(a,b)=>b[1]-a[1]
);

return{

labels:
lista.map(x=>x[0]),

valores:
lista.map(x=>x[1])

};

}

/* =========================================================
INSIGHTS
========================================================= */

function gerarInsights(
dados,
topProdutos,
vendedores
){

const produtos=
agruparPorCampo(
dados,
"produto",
"faturamento"
);

const categorias=
agruparPorCampo(
dados,
"categoria",
"faturamento"
);

const vend=
agruparPorCampo(
dados,
"vendedor",
"faturamento"
);

if(produtos.labels.length){

$("insightProduto").textContent=
produtos.labels[0];

$("insightProdutoValor").textContent=
money(produtos.valores[0])+
" em faturamento.";

}else{

$("insightProduto").textContent="—";

}

if(vend.labels.length){

$("insightVendedor").textContent=
vend.labels[0];

$("insightVendedorValor").textContent=
money(vend.valores[0])+
" em faturamento.";

}else{

$("insightVendedor").textContent="—";

}

if(categorias.labels.length){

$("insightCategoria").textContent=
categorias.labels[0];

$("insightCategoriaValor").textContent=
money(categorias.valores[0])+
" em faturamento.";

}else{

$("insightCategoria").textContent="—";

}

}

/* =========================================================
TABELA
========================================================= */

async function carregarTabelaVendas(){

const tabela=$("tabelaVendas");

tabela.innerHTML=
'<tr><td colspan="11" class="table-loading">Carregando vendas...</td></tr>';

try{

const q=
obterQueryFiltros();

const dados=
await api(
`/api/vendas${q}${q?"&":"?"}limit=1000`
);

vendasOriginais=
Array.isArray(dados)
?dados
:[];


vendasTabela=
aplicarFiltrosExtras(
vendasOriginais
);

paginaAtual=1;

filtrarTabela();

}catch(e){

tabela.innerHTML=
`<tr><td colspan="11" class="table-empty">${escaparHtml(e.message)}</td></tr>`;

}

}

/* =========================================================
BUSCA ÚNICA
========================================================= */

function filtrarTabela(){

const busca=
$("buscaTabela").value
.trim()
.toLowerCase();

let dados=
aplicarFiltrosExtras(
vendasOriginais
);

if(busca){

dados=dados.filter(v=>{

const cliente=
String(v.cliente??"").toLowerCase();

const produto=
String(v.produto??"").toLowerCase();

const vendedor=
String(v.vendedor??"").toLowerCase();

return(
cliente.includes(busca)||
produto.includes(busca)||
vendedor.includes(busca)
);

});

}

vendasFiltradas=dados;

paginaAtual=1;

renderizarTabela();

}

function renderizarTabela(){

const tabela=
$("tabelaVendas");

const total=
vendasFiltradas.length;

const paginas=
Math.max(
1,
Math.ceil(
total/itensPorPagina
)
);

paginaAtual=
Math.min(
paginaAtual,
paginas
);

const inicio=
(paginaAtual-1)*
itensPorPagina;

const pagina=
vendasFiltradas.slice(
inicio,
inicio+itensPorPagina
);

if(!pagina.length){

tabela.innerHTML=
'<tr><td colspan="11" class="table-empty">Nenhuma venda encontrada.</td></tr>';

}else{

tabela.innerHTML=
pagina.map(v=>{

let classe=
"status-cancelado";

if(v.status==="Pago")
classe="status-pago";

else if(v.status==="Pendente")
classe="status-pendente";

return`

<tr>

<td>${formatarData(v.data)}</td>

<td>${escaparHtml(v.produto)}</td>

<td>${escaparHtml(v.categoria)}</td>

<td>${escaparHtml(v.cliente)}</td>

<td>${escaparHtml(v.vendedor)}</td>

<td>
${Number(v.quantidade||0).toLocaleString("pt-BR")}
</td>

<td>${money(v.preco_unitario)}</td>

<td>${money(v.faturamento)}</td>

<td>${escaparHtml(v.pagamento)}</td>

<td>${escaparHtml(v.canal)}</td>

<td>

<span class="status-badge ${classe}">
${escaparHtml(v.status)}
</span>

</td>

</tr>

`;

}).join("");

}

$("salesCount").textContent=
total
?`Exibindo ${inicio+1}–${Math.min(inicio+itensPorPagina,total)} de ${total} vendas`
:"0 vendas encontradas";

$("pageInfo").textContent=
`Página ${paginaAtual} de ${paginas}`;

$("paginaAnterior").disabled=
paginaAtual<=1;

$("paginaProxima").disabled=
paginaAtual>=paginas;

}

function mudarPagina(d){

const paginas=
Math.max(
1,
Math.ceil(
vendasFiltradas.length/
itensPorPagina
)
);

const nova=
paginaAtual+d;

if(nova<1||nova>paginas)
return;

paginaAtual=nova;

renderizarTabela();

}

/* =========================================================
EXPORTAÇÃO
========================================================= */

function exportarExcel(){

if(!vendasFiltradas.length){

alert(
"Não há dados para exportar."
);

return;

}

const headers=[
"Data",
"Produto",
"Categoria",
"Cliente",
"Vendedor",
"Quantidade",
"Preço unitário",
"Faturamento",
"Pagamento",
"Canal",
"Status"
];

const rows=
vendasFiltradas.map(v=>[

formatarData(v.data),
v.produto,
v.categoria,
v.cliente,
v.vendedor,
v.quantidade,
v.preco_unitario,
v.faturamento,
v.pagamento,
v.canal,
v.status

]);

const csv=
"\ufeff"+
[headers,...rows]
.map(row=>

row.map(v=>
`"${String(v??"").replace(/"/g,'""')}"`
).join(";")

)
.join("\n");

const blob=
new Blob(
[csv],
{
type:"text/csv;charset=utf-8;"
}
);

const url=
URL.createObjectURL(blob);

const a=
document.createElement("a");

a.href=url;

a.download=
`relatorio-vendas-${new Date().toISOString().slice(0,10)}.csv`;

document.body.appendChild(a);

a.click();

a.remove();

URL.revokeObjectURL(url);

}

/* =========================================================
LOGIN INICIALIZAÇÃO
========================================================= */

function inicializarLogin(){

const senha=$("senha");
const email=$("email");
const bar=$("passwordStrength");
const hint=$("passwordHint");

function validarSenha(){

const v=senha.value;

let pontos=0;

if(v.length>=6)pontos++;
if(v.length>=10)pontos++;
if(/[A-Z]/.test(v)&&/[a-z]/.test(v))pontos++;
if(/\d/.test(v))pontos++;
if(/[^A-Za-z0-9]/.test(v))pontos++;

bar.style.width=
[
"0%",
"20%",
"40%",
"60%",
"80%",
"100%"
][pontos];

bar.style.background=
pontos<=1
?"#ef4444"
:pontos===2
?"#f59e0b"
:"#22d3ee";

hint.textContent=
pontos<=1
?"Senha fraca."
:pontos===2
?"Senha razoável."
:pontos===3
?"Boa senha."
:"Senha forte.";

}

senha.addEventListener(
"input",
validarSenha
);

$("demoAccess").addEventListener(
"click",
()=>{

email.value="admin@demo.com";
senha.value="Admin@123";

validarSenha();

$("loginMessage").textContent=
"Acesso demonstrativo preenchido.";

$("loginMessage").classList.add("show");

}
);

document
.querySelector(".forgot-link")
.addEventListener(
"click",
e=>{

e.preventDefault();

$("loginMessage").textContent=
"A recuperação de senha deve ser feita pelo administrador.";

$("loginMessage").classList.add("show");

}
);

validarSenha();

}

/* =========================================================
CENA LOGIN
========================================================= */

function inicializarCenaLogin(){

const canvas=$("sceneCanvas");

const ctx=
canvas.getContext("2d");

const screen=$("login");
const copy=$("sceneCopy");
const cursor=$("loginCursor");

let w=0;
let h=0;

let mx=.5;
let my=.5;

let tx=.5;
let ty=.5;

let particles=[];

function resize(){

w=canvas.width=screen.clientWidth;
h=canvas.height=screen.clientHeight;

particles=
Array.from(
{
length:
innerWidth<700
?25
:55
},
()=>({

x:Math.random()*w,
y:Math.random()*h,
r:.5+Math.random()*1.8,
s:.15+Math.random()*.3

})
);

}

function animate(){

ctx.clearRect(
0,
0,
w,
h
);

mx+=(tx-mx)*.05;
my+=(ty-my)*.05;

particles.forEach(p=>{

p.y-=p.s;

if(p.y<0)
p.y=h;

const x=
p.x+(mx-.5)*20;

const y=
p.y+(my-.5)*15;

ctx.beginPath();

ctx.arc(
x,
y,
p.r,
0,
Math.PI*2
);

ctx.fillStyle=
"rgba(125,211,252,.3)";

ctx.fill();

});

requestAnimationFrame(animate);

}

screen.addEventListener(
"pointermove",
e=>{

const r=
screen.getBoundingClientRect();

tx=
(e.clientX-r.left)/
r.width;

ty=
(e.clientY-r.top)/
r.height;

cursor.style.left=
(e.clientX-r.left)+"px";

cursor.style.top=
(e.clientY-r.top)+"px";

cursor.style.opacity=1;

copy.style.transform=
`translate(${(tx-.5)*8}px,${(ty-.5)*5}px) translateY(-50%)`;

}
);

screen.addEventListener(
"pointerleave",
()=>{

tx=.5;
ty=.5;

cursor.style.opacity=0;

copy.style.transform=
"translateY(-50%)";

}
);

addEventListener(
"resize",
resize
);

resize();
animate();

}


/* =========================================================
   REVELAÇÃO DAS LINHAS DOURADAS NO SCROLL
   ========================================================= */

function iniciarGoldReveal(){

const elementos=
document.querySelectorAll(
".scroll-gold-line"
);

if(!elementos.length)
return;

if(!("IntersectionObserver" in window)){

elementos.forEach(el=>
el.classList.add("gold-visible")
);

return;

}

const observer=
new IntersectionObserver(
entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.classList.add(
"gold-visible"
);

}

});

},
{
threshold:.18,
rootMargin:"0px 0px -8% 0px"
}
);

elementos.forEach(el=>
observer.observe(el)
);

}

/* =========================================================
MOSTRAR DASHBOARD
========================================================= */

async function showDash(){

if(!token)
return;

$("login").hidden=true;

$("dashboard").hidden=false;

try{

await carregarFiltros();

await carregarDashboard();

}catch(e){

console.error(e);

$("tabelaVendas").innerHTML=
`<tr><td colspan="11" class="table-empty">${escaparHtml(e.message)}</td></tr>`;

}

}

/* =========================================================
INICIALIZAÇÃO
========================================================= */

inicializarLogin();

inicializarCenaLogin();

iniciarGoldReveal();

showDash();



// MODAL IMPORTACAO EXCEL JS

function escaparHTML(valor){
  return String(valor ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function abrirModalImportacao(resultado){

  const modal =
    document.getElementById("importErrorModal");

  const summary =
    document.getElementById("importModalSummary");

  const message =
    document.getElementById("importModalMessage");

  const errors =
    document.getElementById("importModalErrors");

  if(!modal || !summary || !message || !errors){
    alert(
      resultado.erro ||
      "Não foi possível atualizar os dados."
    );
    return;
  }

  const detalhes =
    Array.isArray(resultado.detalhes)
      ? resultado.detalhes
      : [];

  const total =
    Number(resultado.totalRegistros || 0);

  const validos =
    Number(resultado.registrosValidos || 0);

  const comErro =
    Number(
      resultado.registrosComErro ||
      detalhes.length ||
      0
    );

  summary.innerHTML = `
    <div class="import-summary-card">
      <span class="import-summary-label">Registros encontrados</span>
      <strong class="import-summary-value">
        ${total.toLocaleString("pt-BR")}
      </strong>
    </div>

    <div class="import-summary-card">
      <span class="import-summary-label">Registros válidos</span>
      <strong class="import-summary-value">
        ${validos.toLocaleString("pt-BR")}
      </strong>
    </div>

    <div class="import-summary-card">
      <span class="import-summary-label">Com erro</span>
      <strong class="import-summary-value" style="color:#fca5a5;">
        ${comErro.toLocaleString("pt-BR")}
      </strong>
    </div>
  `;

  message.textContent =
    resultado.erro ||
    "O arquivo possui registros que precisam ser corrigidos.";

  errors.innerHTML = "";

  detalhes.slice(0,50).forEach(item => {

    const div =
      document.createElement("div");

    div.className =
      "import-error-item";

    const id =
      item.id
        ? ` <span class="import-error-id">| ID: ${escaparHTML(item.id)}</span>`
        : "";

    div.innerHTML = `
      <div class="import-error-top">
        <span>🔴</span>
        <span class="import-error-line">
          Linha ${escaparHTML(item.linha)}
        </span>
        ${id}
      </div>

      <div class="import-error-message">
        ${escaparHTML(item.erro)}
      </div>
    `;

    errors.appendChild(div);
  });

  if(comErro > detalhes.length){

    const restante =
      comErro - detalhes.length;

    const div =
      document.createElement("div");

    div.style.cssText =
      "padding:12px;color:#94a3b8;font-size:12px;text-align:center;";

    div.textContent =
      `... e mais ${restante} erro(s).`;

    errors.appendChild(div);
  }

  modal.classList.add("ativo");

  document.body.style.overflow = "hidden";
}

function fecharModalImportacao(event){

  if(
    event &&
    event.target &&
    event.target.id !== "importErrorModal"
  ){
    return;
  }

  const modal =
    document.getElementById("importErrorModal");

  if(modal){
    modal.classList.remove("ativo");
  }

  document.body.style.overflow = "";
}

document.addEventListener("keydown", function(event){

  if(event.key !== "Escape"){
    return;
  }

  const modal =
    document.getElementById("importErrorModal");

  if(
    modal &&
    modal.classList.contains("ativo")
  ){
    fecharModalImportacao();
  }

});



/* =========================================================
   PREVIEW DO IMPORTADOR UNIVERSAL
   ========================================================= */

let arquivoImportacaoPendente = null;

function abrirPreviewImportacao(
  resultado,
  arquivo
){

  arquivoImportacaoPendente =
    arquivo;

  const modal =
    document.getElementById(
      "importPreviewModal"
    );

  const file =
    document.getElementById(
      "importPreviewFile"
    );

  const resumo =
    document.getElementById(
      "importPreviewResumo"
    );

  const tabela =
    document.getElementById(
      "importPreviewMapeamento"
    );

  const aviso =
    document.getElementById(
      "importPreviewAviso"
    );

  const confirmar =
    document.getElementById(
      "importPreviewConfirmar"
    );

  if(
    !modal ||
    !file ||
    !resumo ||
    !tabela
  ){

    alert(
      "Não foi possível abrir a análise da planilha."
    );

    return;

  }

  const nomeArquivo =
    escaparHTML(
      resultado.arquivo ||
      arquivo?.name ||
      "Arquivo Excel"
    );

  const aba =
    escaparHTML(
      resultado.aba ||
      "Não identificada"
    );

  const registros =
    Number(
      resultado.registros || 0
    );

  const colunas =
    Array.isArray(
      resultado.colunasEncontradas
    )
      ? resultado.colunasEncontradas
      : [];

  const ausentes =
    Array.isArray(
      resultado.colunasAusentes
    )
      ? resultado.colunasAusentes
      : [];

  const mapeamento =
    Array.isArray(
      resultado.mapeamento
    )
      ? resultado.mapeamento
      : [];

  const identificados =
    mapeamento.filter(
      item =>
        item.encontrada === true
    ).length;

  const pronto =
    ausentes.length === 0;

  file.innerHTML = `

    <div>

      <div class="import-preview-file-name">
        📄 ${nomeArquivo}
      </div>

      <div class="import-preview-file-meta">
        Aba selecionada: ${aba}
      </div>

    </div>

    <span
      class="import-preview-status ${
        pronto ? "ok" : "warning"
      }"
    >
      ${
        pronto
          ? "✓ Pronta para importar"
          : "⚠ Mapeamento necessário"
      }
    </span>

  `;

  resumo.innerHTML = `

    <div class="import-preview-card">

      <span class="import-preview-card-label">
        Registros
      </span>

      <span class="import-preview-card-value">
        ${registros.toLocaleString("pt-BR")}
      </span>

    </div>

    <div class="import-preview-card">

      <span class="import-preview-card-label">
        Colunas encontradas
      </span>

      <span class="import-preview-card-value">
        ${colunas.length}
      </span>

    </div>

    <div class="import-preview-card">

      <span class="import-preview-card-label">
        Campos identificados
      </span>

      <span
        class="import-preview-card-value"
        id="importPreviewCamposIdentificados"
      >
        ${identificados}/${mapeamento.length}
      </span>

    </div>

  `;

  tabela.innerHTML = "";

  const camposSelecionados = {};

  mapeamento.forEach(item => {

    if(
      item.encontrada &&
      item.colunaExcel
    ){

      camposSelecionados[
        item.campo
      ] =
        item.colunaExcel;

    }

  });

  function atualizarEstadoMapeamento(){

    const selects =
      tabela.querySelectorAll(
        ".import-preview-manual-select"
      );

    const usados =
      new Map();

    selects.forEach(select => {

      const valor =
        select.value;

      if(valor){

        if(
          usados.has(valor)
        ){

          select.dataset.duplicado =
            "true";

        }else{

          usados.set(
            valor,
            select.dataset.campo
          );

          select.dataset.duplicado =
            "false";

        }

      }else{

        select.dataset.duplicado =
          "false";

      }

    });

    const todasPreenchidas =
      Array.from(
        selects
      ).every(
        select =>
          Boolean(select.value)
      );

    const temDuplicidade =
      Array.from(
        selects
      ).some(
        select =>
          select.dataset.duplicado === "true"
      );

    const totalIdentificados =
      mapeamento.length -
      Array.from(
        selects
      ).filter(
        select =>
          !select.value
      ).length;

    const contador =
      document.getElementById(
        "importPreviewCamposIdentificados"
      );

    if(contador){

      contador.textContent =
        `${totalIdentificados}/${mapeamento.length}`;

    }

    if(aviso){

      if(temDuplicidade){

        aviso.style.display =
          "block";

        aviso.innerHTML = `
          <strong>
            ⚠ Uma coluna está sendo usada em mais de um campo.
          </strong>
          <br><br>
          Cada campo obrigatório precisa utilizar
          uma coluna diferente da planilha.
        `;

      }else if(!todasPreenchidas){

        aviso.style.display =
          "block";

        aviso.innerHTML = `
          <strong>
            ⚠ Mapeamento manual necessário.
          </strong>
          <br><br>
          O sistema identificou automaticamente
          ${identificados} de ${mapeamento.length}
          campos.
          <br><br>
          Selecione uma coluna do Excel para
          cada campo ainda não identificado.
        `;

      }else{

        aviso.style.display =
          "block";

        aviso.innerHTML = `
          <strong>
            ✓ Mapeamento completo.
          </strong>
          <br><br>
          Todas as informações obrigatórias
          estão vinculadas e a planilha está
          pronta para importação.
        `;

      }

    }

    if(confirmar){

      confirmar.disabled =
        !todasPreenchidas ||
        temDuplicidade;

      confirmar.textContent =
        confirmar.disabled
          ? "Complete o mapeamento"
          : "Confirmar importação";

    }

  }

  mapeamento.forEach(item => {

    const tr =
      document.createElement("tr");

    const campo =
      escaparHTML(
        item.campo || ""
      );

    const encontrada =
      Boolean(
        item.encontrada &&
        item.colunaExcel
      );

    const colunaAtual =
      item.colunaExcel || "";

    let opcoes = `
      <option value="">
        Selecione uma coluna...
      </option>
    `;

    colunas.forEach(colunaExcel => {

      const selecionada =
        colunaExcel === colunaAtual
          ? "selected"
          : "";

      opcoes += `
        <option
          value="${escaparHTML(
            colunaExcel
          )}"
          ${selecionada}
        >
          ${escaparHTML(
            colunaExcel
          )}
        </option>
      `;

    });

    tr.innerHTML = `

      <td class="import-preview-field">
        <strong>${campo}</strong>
      </td>

      <td class="import-preview-arrow">
        →
      </td>

      <td class="import-preview-source">

        ${
          encontrada
            ? `
              <span
                class="import-preview-auto-map"
              >
                ${escaparHTML(
                  colunaAtual
                )}
              </span>
            `
            : `
              <select
                class="import-preview-manual-select"
                data-campo="${escaparHTML(
                  item.campo || ""
                )}"
              >
                ${opcoes}
              </select>
            `
        }

      </td>

      <td>

        ${
          encontrada
            ? `
              <span
                class="import-preview-check"
              >
                ✓ Identificada
              </span>
            `
            : `
              <span
                class="import-preview-manual-label"
              >
                🔧 Escolha manualmente
              </span>
            `
        }

      </td>

    `;

    tabela.appendChild(tr);

    const select =
      tr.querySelector(
        ".import-preview-manual-select"
      );

    if(select){

      select.addEventListener(
        "change",
        atualizarEstadoMapeamento
      );

    }

  });

  if(ausentes.length){

    aviso.style.display =
      "block";

    aviso.innerHTML = `
      <strong>
        ⚠ Algumas informações precisam ser vinculadas.
      </strong>
      <br><br>
      O sistema não conseguiu identificar
      automaticamente:
      <br><br>
      <strong>
        ${ausentes
          .map(
            item =>
              escaparHTML(item)
          )
          .join(", ")
        }
      </strong>
      <br><br>
      Escolha a coluna correspondente
      diretamente na tabela acima.
    `;

  }else{

    aviso.style.display =
      "block";

    aviso.innerHTML = `
      <strong>
        ✓ Todas as colunas foram identificadas automaticamente.
      </strong>
      <br><br>
      Revise o mapeamento antes de confirmar
      a importação.
    `;

  }

  if(confirmar){

    confirmar.disabled =
      !pronto;

    confirmar.textContent =
      pronto
        ? "Confirmar importação"
        : "Complete o mapeamento";

  }

  atualizarEstadoMapeamento();




  /*
   * DUPLICIDADES
   */
  const duplicidades =
    resultado.duplicidades;

  const duplicidadesContainer =
    document.getElementById(
      "importPreviewDuplicidades"
    );

  if(
    duplicidades &&
    duplicidadesContainer
  ){

    const statusEl =
      document.getElementById(
        "importPreviewDuplicidadesStatus"
      );

    const iconEl =
      document.getElementById(
        "importPreviewDuplicidadesIcon"
      );

    const resumoEl =
      document.getElementById(
        "importPreviewDuplicidadesResumo"
      );

    const listaEl =
      document.getElementById(
        "importPreviewDuplicidadesLista"
      );

    if(
      duplicidades.possuiDuplicidades
    ){

      if(statusEl){
        statusEl.textContent =
          "Foram encontrados registros com o mesmo ID de venda.";
      }

      if(iconEl){
        iconEl.textContent = "!";
        iconEl.classList.add(
          "alerta"
        );
      }

      if(resumoEl){

        resumoEl.innerHTML =
          `<strong>${Number(
            duplicidades.registrosDuplicados || 0
          ).toLocaleString("pt-BR")}</strong> registros duplicados em <strong>${Number(
            duplicidades.idsDuplicados || 0
          ).toLocaleString("pt-BR")}</strong> IDs de venda.`;

      }

      if(listaEl){

        const detalhes =
          Array.isArray(
            duplicidades.detalhes
          )
            ? duplicidades.detalhes
            : [];

        listaEl.innerHTML =
          detalhes
            .map(item =>
              `<div class="import-preview-duplicidade-item">
                <span>ID ${escaparHTML(String(item.id))}</span>
                <strong>${Number(item.quantidade).toLocaleString("pt-BR")} ocorrências</strong>
              </div>`
            )
            .join("");

      }

    }else{

      if(statusEl){
        statusEl.textContent =
          "Nenhuma duplicidade encontrada.";
      }

      if(iconEl){
        iconEl.textContent = "✓";
      }

      if(resumoEl){
        resumoEl.textContent =
          "Os IDs de venda analisados são únicos.";
      }

      if(listaEl){
        listaEl.innerHTML = "";
      }

    }

    duplicidadesContainer.style.display =
      "block";

  }

  /*
   * QUALIDADE DOS DADOS
   */
  const qualidade =
    resultado.qualidadeDados;

  const qualidadeContainer =
    document.getElementById(
      "importPreviewQualidade"
    );

  if(
    qualidade &&
    qualidadeContainer
  ){

    const percentual =
      Number(
        qualidade.percentual || 0
      );

    const status =
      percentual >= 95
        ? "🟢 Excelente"
        : percentual >= 80
          ? "🟡 Atenção"
          : "🔴 Necessita revisão";

    const percentualEl =
      document.getElementById(
        "importPreviewQualidadePercentual"
      );

    const statusEl =
      document.getElementById(
        "importPreviewQualidadeStatus"
      );

    const fillEl =
      document.getElementById(
        "importPreviewQualidadeFill"
      );

    const totalEl =
      document.getElementById(
        "qualidadeTotalRegistros"
      );

    const validosEl =
      document.getElementById(
        "qualidadeRegistrosValidos"
      );

    const problemasEl =
      document.getElementById(
        "qualidadeRegistrosProblema"
      );

    const vaziosEl =
      document.getElementById(
        "qualidadeCamposVazios"
      );

    const invalidosEl =
      document.getElementById(
        "qualidadeValoresInvalidos"
      );

    if(percentualEl){
      percentualEl.textContent =
        `${percentual}%`;
    }

    if(statusEl){
      statusEl.textContent =
        status;
    }

    if(fillEl){
      fillEl.style.width =
        `${percentual}%`;
    }

    if(totalEl){
      totalEl.textContent =
        Number(
          qualidade.totalRegistros || 0
        ).toLocaleString("pt-BR");
    }

    if(validosEl){
      validosEl.textContent =
        Number(
          qualidade.registrosValidos || 0
        ).toLocaleString("pt-BR");
    }

    if(problemasEl){
      problemasEl.textContent =
        Number(
          qualidade.registrosComProblema || 0
        ).toLocaleString("pt-BR");
    }

    if(vaziosEl){
      vaziosEl.textContent =
        Number(
          qualidade.camposVazios || 0
        ).toLocaleString("pt-BR");
    }

    if(invalidosEl){
      invalidosEl.textContent =
        Number(
          qualidade.valoresInvalidos || 0
        ).toLocaleString("pt-BR");
    }

    qualidadeContainer.style.display =
      "block";

  }

  /*
   * PRÉVIA DOS PRIMEIROS REGISTROS
   */
  const previaContainer =
    document.getElementById(
      "importPreviewPrevia"
    );

  const previaTabela =
    document.getElementById(
      "importPreviewPreviaTabela"
    );

  if(
    previaContainer &&
    previaTabela
  ){

    const linhas =
      Array.isArray(
        resultado.previaLinhas
      )
        ? resultado.previaLinhas
        : [];

    if(linhas.length){

      const colunas =
        Object.keys(
          linhas[0] || {}
        );

      let html =
        '<table class="import-preview-data-table">';

      html += "<thead><tr>";

      colunas.forEach(
        coluna => {

          html +=
            `<th>${escaparHTML(coluna)}</th>`;

        }
      );

      html += "</tr></thead>";

      html += "<tbody>";

      linhas.forEach(
        linha => {

          html += "<tr>";

          colunas.forEach(
            coluna => {

              let valor =
                linha[coluna];

              if(
                valor === null ||
                valor === undefined
              ){
                valor = "";
              }

              if(
                valor instanceof Date
              ){
                valor =
                  valor.toLocaleDateString(
                    "pt-BR"
                  );
              }

              html +=
                `<td>${escaparHTML(String(valor))}</td>`;

            }
          );

          html += "</tr>";

        }
      );

      html += "</tbody></table>";

      previaTabela.innerHTML =
        html;

      previaContainer.style.display =
        "block";

    }else{

      previaTabela.innerHTML =
        '<div class="import-preview-empty">Nenhum registro disponível para prévia.</div>';

      previaContainer.style.display =
        "block";

    }

  }

  modal.classList.add(
    "ativo"
  );

  document.body.style.overflow =
    "hidden";

}
 


function fecharPreviewImportacao(event){

  /*
   * Se o clique veio do fundo do modal,
   * permite fechar.
   *
   * Se veio de dentro do conteúdo,
   * não fecha.
   */
  if(
    event &&
    event.target &&
    event.currentTarget &&
    event.target !== event.currentTarget
  ){
    return;
  }

  const modal =
    document.getElementById(
      "importPreviewModal"
    );

  if(!modal){
    return;
  }

  modal.classList.remove(
    "ativo"
  );

  document.body.style.overflow =
    "";

}

async function confirmarImportacaoPreview(){

  const arquivo =
    arquivoImportacaoPendente;

  if(!arquivo){

    fecharPreviewImportacao();

    return;

  }

  const token =
    localStorage.getItem("token");

  if(!token){

    fecharPreviewImportacao();

    alert(
      "Sua sessão expirou. Faça login novamente."
    );

    return;

  }

  const botao =
    document.getElementById(
      "importPreviewConfirmar"
    );

  if(botao){

    botao.disabled = true;

    botao.textContent =
      "Importando...";

  }

  try{

    const formData =
      new FormData();

    formData.append(
      "arquivo",
      arquivo
    );

    /*
     * MAPEAMENTO MANUAL
     * Captura todas as escolhas feitas pelo usuário
     * nos campos que precisaram de ajuste.
     */
    const mapeamentoManual = {};

    document
      .querySelectorAll(
        "#importPreviewMapeamento .import-preview-manual-select"
      )
      .forEach(select => {

        const campo =
          select.dataset.campo;

        const colunaExcel =
          select.value;

        if (
          campo &&
          colunaExcel
        ) {
          mapeamentoManual[campo] =
            colunaExcel;
        }

      });

    formData.append(
      "mapeamentoManual",
      JSON.stringify(
        mapeamentoManual
      )
    );

    console.log(
      "Mapeamento manual enviado:",
      mapeamentoManual
    );

    const resposta =
      await fetch(
        "/api/vendas/importar",
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

      fecharPreviewImportacao();

      abrirModalImportacao(
        resultado
      );

      return;

    }

    fecharPreviewImportacao();

    alert(
      `✅ Dados atualizados com sucesso!\n\n${Number(resultado.registros || 0).toLocaleString("pt-BR")} registros sincronizados.`
    );

    await carregarFiltros();

    await carregarDashboard();

  }catch(erro){

    console.error(
      "Erro ao importar Excel:",
      erro
    );

    fecharPreviewImportacao();

    abrirModalImportacao({
      erro:
        erro.message ||
        "Não foi possível importar o arquivo."
    });

  }finally{

    const input =
      document.getElementById(
        "arquivoExcel"
      );

    if(input){
      input.value = "";
    }

    arquivoImportacaoPendente =
      null;

    if(botao){

      botao.disabled = false;

      botao.textContent =
        "Confirmar importação";

    }

  }

}

document.addEventListener(
  "keydown",
  function(event){

    if(
      event.key !== "Escape"
    ){
      return;
    }

    const modal =
      document.getElementById(
        "importPreviewModal"
      );

    if(
      modal &&
      modal.classList.contains(
        "ativo"
      )
    ){

      fecharPreviewImportacao();

    }

  }
);

