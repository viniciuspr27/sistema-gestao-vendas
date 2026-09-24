const chartVendedoresTeste = 
new Chart(
$("vendedores"),
{

type:"bar",

data:{

labels:nomesVendedores,

datasets:[{

data:valoresVendedores,

backgroundColor:
coresRanking(rankingVendedores),

borderColor:
bordasRanking(rankingVendedores),

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

const vendedor=
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

);

