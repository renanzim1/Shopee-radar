// ======================================================
// SHOPEE RADAR — APP.JS
//
// MOMENTUM + TREND SCORE
// RANQUEAR SEUS VÍDEOS — ZERO VENDAS
// CATEGORIAS INTELIGENTES
// BUSCA AUTOMÁTICA EM MAIS PÁGINAS
// SCROLL INFINITO
// FAVORITOS
// ======================================================


// ======================================================
// APIS
// ======================================================

const MOMENTUM_API =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-momentum";

const ZERO_API =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-zero";

const RANKING_API =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-ranking";


// ======================================================
// CONFIG
// ======================================================

const LIMITE_POR_PAGINA = 20;

// Quando selecionar nicho, tenta encontrar pelo menos isso.
const ALVO_PRODUTOS_NICHO = 24;

// Limite de páginas automáticas para não sobrecarregar.
const MAX_PAGINAS_NICHO = 25;


// ======================================================
// ESTADO
// ======================================================

let produtos = [];

let paginaAtual = 1;

let temProximaPagina = true;

let carregando = false;

let carregandoCategoria = false;

let filtroAtual = "radar";

let ordenacaoAtual = "relevance";

let modoFavoritos = false;

let buscaDigitada = "";

let nichoAtual = "all";

let totalServidor = 0;

let resumoServidor = {};


// ======================================================
// TOKEN
// ======================================================

function obterTokenRadar() {
  return (
    localStorage.getItem(
      "shopeeRadarAccessToken"
    ) || ""
  );
}


function limparSessaoRadarApp() {
  localStorage.removeItem(
    "shopeeRadarAccessToken"
  );

  localStorage.removeItem(
    "shopeeRadarRefreshToken"
  );

  localStorage.removeItem(
    "shopeeRadarUser"
  );
}


function redirecionarLogin() {
  limparSessaoRadarApp();

  window.location.replace(
    "login.html"
  );
}


function criarHeadersAPI() {
  const token =
    obterTokenRadar();

  return {
    Accept: "application/json",

    Authorization:
      `Bearer ${token}`
  };
}


// ======================================================
// ELEMENTOS
// ======================================================

const productsGrid =
  document.getElementById(
    "productsGrid"
  );

const emptyState =
  document.getElementById(
    "emptyState"
  );

const totalProdutos =
  document.getElementById(
    "totalProdutos"
  );

const totalOportunidades =
  document.getElementById(
    "totalOportunidades"
  );

const totalVideos =
  document.getElementById(
    "totalVideos"
  );

const totalProdutosLabel =
  document.getElementById(
    "totalProdutosLabel"
  );

const totalOportunidadesLabel =
  document.getElementById(
    "totalOportunidadesLabel"
  );

const searchInput =
  document.getElementById(
    "searchInput"
  );

const categoryFilter =
  document.getElementById(
    "categoryFilter"
  );

const resultsTitle =
  document.getElementById(
    "resultsTitle"
  );

const heroDescription =
  document.getElementById(
    "heroDescription"
  );

const zeroStrategyBox =
  document.getElementById(
    "zeroStrategyBox"
  );

const infiniteLoader =
  document.getElementById(
    "infiniteLoader"
  );

const productModal =
  document.getElementById(
    "productModal"
  );

const modalBody =
  document.getElementById(
    "modalBody"
  );

const closeModal =
  document.getElementById(
    "closeModal"
  );


// ======================================================
// FAVORITOS
// ======================================================

let favoritos = [];

try {
  favoritos =
    JSON.parse(
      localStorage.getItem(
        "shopeeRadarFavoritos"
      )
    ) || [];

  if (
    !Array.isArray(
      favoritos
    )
  ) {
    favoritos = [];
  }

} catch {
  favoritos = [];
}


function salvarFavoritos() {
  localStorage.setItem(
    "shopeeRadarFavoritos",
    JSON.stringify(
      favoritos
    )
  );
}


function estaFavoritado(id) {
  return favoritos.some(
    produto =>
      String(produto.id) ===
      String(id)
  );
}


function encontrarProduto(id) {
  return (
    produtos.find(
      produto =>
        String(produto.id) ===
        String(id)
    ) ||
    favoritos.find(
      produto =>
        String(produto.id) ===
        String(id)
    )
  );
}


function alternarFavorito(id) {
  const produto =
    encontrarProduto(id);

  if (!produto) {
    return;
  }

  if (
    estaFavoritado(id)
  ) {
    favoritos =
      favoritos.filter(
        item =>
          String(item.id) !==
          String(id)
      );

  } else {
    favoritos.unshift({
      ...produto
    });
  }

  salvarFavoritos();

  if (
    modoFavoritos
  ) {
    renderizarProdutos(
      favoritos
    );

  } else {
    aplicarOrdenacao();
  }
}


// ======================================================
// NÚMEROS
// ======================================================

function numeroSeguro(valor) {
  const numero =
    Number(
      valor ?? 0
    );

  return Number.isFinite(
    numero
  )
    ? numero
    : 0;
}


// ======================================================
// TEXTO
// ======================================================

function escapar(valor) {
  return String(
    valor ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function normalizarTexto(valor) {
  return String(
    valor ?? ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


// ======================================================
// FORMATAÇÃO
// ======================================================

function dinheiro(valor) {
  return numeroSeguro(
    valor
  ).toLocaleString(
    "pt-BR",
    {
      style:
        "currency",

      currency:
        "BRL"
    }
  );
}


function formatarNumero(valor) {
  const numero =
    numeroSeguro(
      valor
    );

  if (
    numero >= 1000000
  ) {
    return (
      (
        numero /
        1000000
      )
        .toFixed(1)
        .replace(
          ".",
          ","
        ) +
      " mi"
    );
  }

  if (
    numero >= 1000
  ) {
    return (
      (
        numero /
        1000
      )
        .toFixed(
          numero >= 10000
            ? 0
            : 1
        )
        .replace(
          ".",
          ","
        ) +
      " mil"
    );
  }

  return numero.toLocaleString(
    "pt-BR"
  );
}


function formatarDecimal(
  valor,
  casas = 1
) {
  return numeroSeguro(
    valor
  )
    .toFixed(
      casas
    )
    .replace(
      ".",
      ","
    );
}


function formatarData(valor) {
  if (!valor) {
    return "";
  }

  try {
    return new Date(
      valor
    ).toLocaleString(
      "pt-BR",
      {
        day:
          "2-digit",

        month:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    );

  } catch {
    return "";
  }
}


function formatarFaixaPercentil(
  valor
) {
  let numero =
    numeroSeguro(
      valor
    );

  numero =
    Math.max(
      1,
      numero
    );

  if (
    numero < 10
  ) {
    return (
      formatarDecimal(
        numero,
        1
      ) +
      "%"
    );
  }

  return (
    Math.round(
      numero
    ) +
    "%"
  );
}


// ======================================================
// MAPA INTELIGENTE DE NICHOS
// ======================================================

const MAPA_NICHOS = {

  moda: [
    "vestido",
    "blusa",
    "camisa",
    "camiseta",
    "regata",
    "cropped",
    "calca",
    "jeans",
    "legging",
    "short",
    "bermuda",
    "saia",
    "macacao",
    "conjunto",
    "moda feminina",
    "moda masculina",
    "roupa",
    "look",
    "tenis",
    "sapato",
    "sandalia",
    "chinelo",
    "sapatilha",
    "bolsa",
    "mochila",
    "carteira",
    "cinto",
    "oculos",
    "bone",
    "cueca",
    "calcinha",
    "sutia",
    "pijama",
    "meia"
  ],

  casa: [
    "casa",
    "lar",
    "decoracao",
    "decorativo",
    "organizador",
    "prateleira",
    "toalha",
    "lencol",
    "fronha",
    "cama",
    "sofa",
    "manta",
    "tapete",
    "cortina",
    "almofada",
    "travesseiro",
    "banheiro",
    "cabide",
    "cesto",
    "lixeira",
    "limpeza",
    "mop",
    "vassoura",
    "esfregao",
    "rodo",
    "escova limpeza",
    "varal",
    "porta objetos",
    "suporte parede"
  ],

  cozinha: [
    "panela",
    "frigideira",
    "caldeirao",
    "assadeira",
    "forma",
    "talher",
    "garfo",
    "faca",
    "colher",
    "prato",
    "copo",
    "xicar",
    "caneca",
    "garrafa",
    "jarra",
    "pote",
    "marmita",
    "cozinha",
    "escorredor",
    "ralador",
    "cortador",
    "batedor",
    "mixer",
    "liquidificador",
    "air fryer",
    "airfryer",
    "cafeteira",
    "chaleira",
    "termica",
    "termico",
    "tampa",
    "tabua",
    "peneira",
    "espumadeira"
  ],

  beleza: [
    "beleza",
    "maquiagem",
    "batom",
    "rimel",
    "mascara de cilios",
    "base facial",
    "corretivo",
    "blush",
    "sombra",
    "delineador",
    "skincare",
    "skin care",
    "hidratante",
    "creme",
    "locao",
    "serum",
    "sabonete",
    "shampoo",
    "condicionador",
    "mascara capilar",
    "cabelo",
    "perfume",
    "colonia",
    "desodorante",
    "body splash",
    "protetor solar",
    "unha",
    "esmalte",
    "pincel maquiagem",
    "depilacao",
    "depilador",
    "natura",
    "avon",
    "boticario"
  ],

  eletronicos: [
    "eletronico",
    "eletronica",
    "smartwatch",
    "relogio inteligente",
    "fone",
    "fone bluetooth",
    "headphone",
    "earbuds",
    "caixa de som",
    "bluetooth",
    "carregador",
    "cabo usb",
    "usb",
    "power bank",
    "camera",
    "webcam",
    "microfone",
    "projetor",
    "controle remoto",
    "led",
    "lampada",
    "luminaria",
    "adaptador",
    "tomada",
    "extensao",
    "pilha",
    "bateria"
  ],

  informatica: [
    "computador",
    "pc",
    "notebook",
    "laptop",
    "monitor",
    "teclado",
    "mouse",
    "mousepad",
    "ssd",
    "hd",
    "memoria ram",
    "ram",
    "placa mae",
    "placa de video",
    "processador",
    "cooler",
    "gabinete",
    "impressora",
    "roteador",
    "wifi",
    "ethernet",
    "pendrive",
    "hub usb",
    "informatica"
  ],

  celular: [
    "celular",
    "smartphone",
    "iphone",
    "android",
    "samsung galaxy",
    "xiaomi",
    "motorola",
    "redmi",
    "poco",
    "capa celular",
    "pelicula",
    "carregador celular",
    "suporte celular",
    "tripé celular",
    "tripe celular"
  ],

  games: [
    "gamer",
    "gaming",
    "game",
    "jogo",
    "joystick",
    "controle gamer",
    "controle ps",
    "controle xbox",
    "playstation",
    "ps4",
    "ps5",
    "xbox",
    "nintendo",
    "switch",
    "console",
    "headset gamer",
    "teclado gamer",
    "mouse gamer",
    "cadeira gamer",
    "rgb"
  ],

  fitness: [
    "fitness",
    "academia",
    "musculacao",
    "halter",
    "peso academia",
    "elastico exercicio",
    "faixa elastica",
    "treino",
    "yoga",
    "pilates",
    "crossfit",
    "corrida",
    "esporte",
    "esportivo",
    "squeeze",
    "garrafa academia",
    "tapete yoga",
    "luva academia",
    "cinta abdominal"
  ],

  pet: [
    "pet",
    "cachorro",
    "cao",
    "caes",
    "gato",
    "gatos",
    "racao",
    "petisco",
    "coleira",
    "peitoral",
    "guia cachorro",
    "comedouro",
    "bebedouro pet",
    "areia gato",
    "areia sanitaria",
    "brinquedo cachorro",
    "brinquedo gato",
    "casinha pet",
    "cama pet",
    "arranhador",
    "aquario"
  ],

  bebe: [
    "bebe",
    "bebê",
    "infantil",
    "crianca",
    "criancas",
    "recem nascido",
    "mamadeira",
    "chupeta",
    "fralda",
    "berco",
    "carrinho bebe",
    "cadeira alimentacao",
    "maternidade",
    "mordedor",
    "babador",
    "banheira bebe",
    "trocador",
    "body bebe",
    "roupa infantil"
  ],

  automotivo: [
    "automotivo",
    "automotiva",
    "carro",
    "veiculo",
    "moto",
    "motocicleta",
    "pneu",
    "volante",
    "retrovisor",
    "capacete",
    "farol",
    "lampada carro",
    "limpa para brisa",
    "limpador para brisa",
    "tapete carro",
    "capa banco",
    "suporte celular carro",
    "carregador veicular",
    "lavagem automotiva",
    "polimento",
    "chave catraca",
    "kit chave"
  ],

  ferramentas: [
    "ferramenta",
    "furadeira",
    "parafusadeira",
    "serra",
    "martelo",
    "alicate",
    "chave philips",
    "chave fenda",
    "chave catraca",
    "soquete",
    "broca",
    "trena",
    "nivel",
    "solda",
    "ferro de solda",
    "compressor",
    "esmerilhadeira",
    "lixadeira",
    "multimetro",
    "caixa ferramentas"
  ],

  papelaria: [
    "papelaria",
    "caneta",
    "lapis",
    "lapiseira",
    "borracha",
    "caderno",
    "agenda",
    "planner",
    "estojo",
    "marca texto",
    "marcador",
    "papel",
    "adesivo",
    "etiqueta",
    "tesoura",
    "grampeador",
    "cola",
    "escolar",
    "material escolar"
  ]

};


// ======================================================
// IDENTIFICAR NICHO
// ======================================================

function textoProdutoParaNicho(
  produto
) {
  return normalizarTexto(
    [
      produto.name,
      produto.shop_name
    ].join(" ")
  );
}


function produtoPertenceNicho(
  produto,
  nicho
) {
  if (
    !nicho ||
    nicho === "all"
  ) {
    return true;
  }

  const palavras =
    MAPA_NICHOS[
      nicho
    ] || [];

  if (
    !palavras.length
  ) {
    return true;
  }

  const texto =
    textoProdutoParaNicho(
      produto
    );

  return palavras.some(
    palavra =>
      texto.includes(
        normalizarTexto(
          palavra
        )
      )
  );
}


// ======================================================
// NORMALIZAÇÃO MOMENTUM
// ======================================================

function normalizarMomentum(p) {
  return {
    id:
      String(
        p.product_id ??
        p.id ??
        ""
      ),

    tipo:
      "momentum",

    name:
      p.product_name ??
      "Produto Shopee",

    image_url:
      p.image_url ??
      "",

    product_url:
      p.product_url ??
      "",

    affiliate_url:
      p.affiliate_url ??
      p.product_url ??
      "",

    shop_name:
      p.shop_name ??
      "Shopee",

    price:
      numeroSeguro(
        p.price
      ),

    sold_count:
      numeroSeguro(
        p.sold_count
      ),

    rating:
      numeroSeguro(
        p.rating
      ),

    momentum_score:
      numeroSeguro(
        p.momentum_score
      ),

    momentum_posicao:
      numeroSeguro(
        p.momentum_posicao
      ),

    percentil_top:
      Math.max(
        1,
        numeroSeguro(
          p.percentil_top
        )
      ),

    momentum_nivel:
      p.momentum_nivel ??
      "observar",

    momentum_rotulo:
      p.momentum_rotulo ??
      "👀 OBSERVAR",

    trend_score:
      numeroSeguro(
        p.trend_score
      ),

    trend_nivel:
      p.trend_nivel ??
      "⚪ Presença baixa",

    capturas_24h:
      numeroSeguro(
        p.capturas_24h
      ),

    vendas_confirmadas_24h:
      numeroSeguro(
        p.vendas_confirmadas_24h
      ),

    rank_atual:
      numeroSeguro(
        p.rank_atual
      ),

    rank_anterior:
      numeroSeguro(
        p.rank_anterior
      ),

    rank_change:
      numeroSeguro(
        p.rank_change
      ),

    ultima_captura:
      p.ultima_captura ??
      p.captured_at ??
      null,

    sinais_reais:
      numeroSeguro(
        p.sinais_reais
      )
  };
}


// ======================================================
// NORMALIZAÇÃO ZERO
// ======================================================

function normalizarZero(p) {
  return {
    id:
      String(
        p.product_id ??
        p.id ??
        ""
      ),

    tipo:
      "zero",

    name:
      p.product_name ??
      "Produto Shopee",

    image_url:
      p.image_url ??
      "",

    product_url:
      p.product_url ??
      "",

    affiliate_url:
      p.affiliate_url ??
      p.product_url ??
      "",

    shop_name:
      p.shop_name ??
      "Shopee",

    price:
      numeroSeguro(
        p.price
      ),

    sold_count:
      0,

    rating:
      numeroSeguro(
        p.rating
      ),

    times_seen:
      numeroSeguro(
        p.times_seen
      ),

    rank_atual:
      numeroSeguro(
        p.current_rank
      ),

    rank_change:
      numeroSeguro(
        p.rank_change
      ),

    ultima_captura:
      p.last_seen_at ??
      null,

    estrategia_rotulo:
      p.estrategia_rotulo ??
      "🎯 Ranquear seus vídeos",

    motivo:
      p.motivo ??
      "Produto com 0 vendas totais registradas."
  };
}


// ======================================================
// NORMALIZAÇÃO RANKING
// ======================================================

function normalizarRanking(p) {
  return {
    id:
      String(
        p.product_id ??
        p.id ??
        ""
      ),

    tipo:
      "ranking",

    name:
      p.product_name ??
      p.name ??
      "Produto Shopee",

    image_url:
      p.image_url ??
      "",

    product_url:
      p.product_url ??
      "",

    affiliate_url:
      p.affiliate_url ??
      p.product_url ??
      "",

    shop_name:
      p.shop_name ??
      "Shopee",

    price:
      numeroSeguro(
        p.price
      ),

    sold_count:
      numeroSeguro(
        p.sold_count
      ),

    rating:
      numeroSeguro(
        p.rating
      ),

    ultima_captura:
      p.captured_at ??
      p.last_seen_at ??
      null
  };
}


// ======================================================
// DUPLICADOS
// ======================================================

function removerDuplicados(lista) {
  const mapa =
    new Map();

  for (
    const produto
    of lista
  ) {
    if (!produto.id) {
      continue;
    }

    if (
      !mapa.has(
        String(
          produto.id
        )
      )
    ) {
      mapa.set(
        String(
          produto.id
        ),
        produto
      );
    }
  }

  return [
    ...mapa.values()
  ];
}


// ======================================================
// MONTAR URL
// ======================================================

function montarURL(
  pagina
) {
  if (
    filtroAtual ===
    "zero"
  ) {
    const url =
      new URL(
        ZERO_API
      );

    url.searchParams.set(
      "page",
      String(
        pagina
      )
    );

    url.searchParams.set(
      "limit",
      String(
        LIMITE_POR_PAGINA
      )
    );

    if (
      buscaDigitada
    ) {
      url.searchParams.set(
        "q",
        buscaDigitada
      );
    }

    let sort =
      "recent";

    if (
      ordenacaoAtual ===
      "rating"
    ) {
      sort =
        "rating";
    }

    if (
      ordenacaoAtual ===
      "trend"
    ) {
      sort =
        "seen";
    }

    url.searchParams.set(
      "sort",
      sort
    );

    return {
      url:
        url.toString(),

      tipo:
        "zero"
    };
  }


  if (
    filtroAtual ===
      "hot" ||
    filtroAtual ===
      "rating"
  ) {
    const url =
      new URL(
        RANKING_API
      );

    url.searchParams.set(
      "page",
      String(
        pagina
      )
    );

    url.searchParams.set(
      "limit",
      String(
        LIMITE_POR_PAGINA
      )
    );

    url.searchParams.set(
      "mode",
      filtroAtual ===
        "hot"
          ? "sales"
          : "rating"
    );

    return {
      url:
        url.toString(),

      tipo:
        "ranking"
    };
  }


  const url =
    new URL(
      MOMENTUM_API
    );

  url.searchParams.set(
    "page",
    String(
      pagina
    )
  );

  url.searchParams.set(
    "limit",
    String(
      LIMITE_POR_PAGINA
    )
  );

  return {
    url:
      url.toString(),

    tipo:
      "momentum"
  };
}


// ======================================================
// BUSCAR UMA PÁGINA
// ======================================================

async function buscarPaginaAPI(
  pagina
) {
  const token =
    obterTokenRadar();

  if (!token) {
    redirecionarLogin();

    throw new Error(
      "Sessão expirada."
    );
  }

  const config =
    montarURL(
      pagina
    );

  const resposta =
    await fetch(
      config.url,
      {
        headers:
          criarHeadersAPI(),

        cache:
          "no-store"
      }
    );

  if (
    resposta.status === 401 ||
    resposta.status === 403
  ) {
    redirecionarLogin();

    throw new Error(
      "Acesso expirado."
    );
  }

  let dados;

  try {
    dados =
      await resposta.json();

  } catch {
    throw new Error(
      "Resposta inválida da API."
    );
  }

  if (
    !resposta.ok ||
    dados.ok === false
  ) {
    throw new Error(
      dados.erro ||
      dados.message ||
      "Não foi possível carregar os produtos."
    );
  }

  let lista =
    [];

  if (
    config.tipo ===
    "momentum"
  ) {
    lista =
      (
        dados.produtos ||
        []
      ).map(
        normalizarMomentum
      );
  }

  if (
    config.tipo ===
    "zero"
  ) {
    lista =
      (
        dados.produtos ||
        []
      ).map(
        normalizarZero
      );
  }

  if (
    config.tipo ===
    "ranking"
  ) {
    lista =
      (
        dados.produtos ||
        []
      ).map(
        normalizarRanking
      );
  }

  return {
    produtos:
      removerDuplicados(
        lista
      ),

    paginaAtual:
      numeroSeguro(
        dados.paginaAtual ??
        pagina
      ),

    temProximaPagina:
      Boolean(
        dados.temProximaPagina
      ),

    total:
      numeroSeguro(
        dados.total
      ),

    resumo:
      dados.resumo ||
      {}
  };
}


// ======================================================
// FILTRAR LISTA
// ======================================================

function obterListaFiltrada(
  origem = produtos
) {
  let lista =
    removerDuplicados(
      [
        ...origem
      ]
    );

  const busca =
    normalizarTexto(
      buscaDigitada
    );

  if (
    busca
  ) {
    lista =
      lista.filter(
        produto => {
          const texto =
            normalizarTexto(
              [
                produto.name,
                produto.shop_name
              ].join(" ")
            );

          return texto.includes(
            busca
          );
        }
      );
  }

  if (
    nichoAtual !==
    "all"
  ) {
    lista =
      lista.filter(
        produto =>
          produtoPertenceNicho(
            produto,
            nichoAtual
          )
      );
  }

  return lista;
}


// ======================================================
// ORDENAÇÃO
// ======================================================

function ordenarLista(
  lista
) {
  const resultado =
    [
      ...lista
    ];

  if (
    ordenacaoAtual ===
    "relevance"
  ) {
    if (
      filtroAtual ===
      "radar"
    ) {
      resultado.sort(
        (
          a,
          b
        ) =>
          numeroSeguro(
            b.momentum_score
          ) -
          numeroSeguro(
            a.momentum_score
          )
      );
    }
  }


  if (
    ordenacaoAtual ===
    "trend"
  ) {
    resultado.sort(
      (
        a,
        b
      ) =>
        numeroSeguro(
          b.trend_score ??
          b.times_seen
        ) -
        numeroSeguro(
          a.trend_score ??
          a.times_seen
        )
    );
  }


  if (
    ordenacaoAtual ===
    "sales"
  ) {
    resultado.sort(
      (
        a,
        b
      ) =>
        numeroSeguro(
          b.sold_count
        ) -
        numeroSeguro(
          a.sold_count
        )
    );
  }


  if (
    ordenacaoAtual ===
    "rating"
  ) {
    resultado.sort(
      (
        a,
        b
      ) =>
        numeroSeguro(
          b.rating
        ) -
        numeroSeguro(
          a.rating
        )
    );
  }


  if (
    ordenacaoAtual ===
    "recent"
  ) {
    resultado.sort(
      (
        a,
        b
      ) =>
        new Date(
          b.ultima_captura ||
          0
        ).getTime() -
        new Date(
          a.ultima_captura ||
          0
        ).getTime()
    );
  }

  return resultado;
}


function aplicarOrdenacao() {
  const lista =
    ordenarLista(
      obterListaFiltrada()
    );

  atualizarContadores();

  renderizarProdutos(
    lista
  );
}


// ======================================================
// COMPLETAR NICHO AUTOMATICAMENTE
// ======================================================

async function completarNicho() {
  if (
    nichoAtual === "all" ||
    carregandoCategoria ||
    modoFavoritos
  ) {
    return;
  }

  let encontrados =
    obterListaFiltrada()
      .length;

  if (
    encontrados >=
    ALVO_PRODUTOS_NICHO
  ) {
    return;
  }

  carregandoCategoria =
    true;

  if (
    infiniteLoader
  ) {
    infiniteLoader.hidden =
      false;

    const texto =
      infiniteLoader.querySelector(
        "span"
      );

    if (texto) {
      texto.textContent =
        "Buscando mais produtos deste nicho...";
    }
  }

  try {
    while (
      encontrados <
        ALVO_PRODUTOS_NICHO &&
      temProximaPagina &&
      paginaAtual <
        MAX_PAGINAS_NICHO
    ) {
      const proxima =
        paginaAtual + 1;

      const dados =
        await buscarPaginaAPI(
          proxima
        );

      produtos =
        removerDuplicados(
          [
            ...produtos,
            ...dados.produtos
          ]
        );

      paginaAtual =
        dados.paginaAtual;

      temProximaPagina =
        dados.temProximaPagina;

      if (
        dados.total > 0
      ) {
        totalServidor =
          dados.total;
      }

      if (
        dados.resumo &&
        Object.keys(
          dados.resumo
        ).length
      ) {
        resumoServidor =
          dados.resumo;
      }

      encontrados =
        obterListaFiltrada()
          .length;

      aplicarOrdenacao();
    }

  } catch (erro) {
    console.error(
      "Erro ao completar nicho:",
      erro
    );

  } finally {
    carregandoCategoria =
      false;

    if (
      infiniteLoader
    ) {
      infiniteLoader.hidden =
        true;

      const texto =
        infiniteLoader.querySelector(
          "span"
        );

      if (texto) {
        texto.textContent =
          "Buscando mais produtos...";
      }
    }
  }
}


// ======================================================
// CARREGAR
// ======================================================

async function carregarProdutos(
  pagina = 1,
  adicionar = false
) {
  if (
    carregando ||
    modoFavoritos
  ) {
    return;
  }

  if (
    adicionar &&
    !temProximaPagina
  ) {
    return;
  }

  carregando =
    true;

  if (
    adicionar
  ) {
    if (
      infiniteLoader
    ) {
      infiniteLoader.hidden =
        false;
    }

  } else {
    mostrarLoading();
  }

  try {
    const dados =
      await buscarPaginaAPI(
        pagina
      );

    if (
      adicionar
    ) {
      produtos =
        removerDuplicados(
          [
            ...produtos,
            ...dados.produtos
          ]
        );

    } else {
      produtos =
        dados.produtos;
    }

    paginaAtual =
      dados.paginaAtual;

    temProximaPagina =
      dados.temProximaPagina;

    totalServidor =
      dados.total;

    resumoServidor =
      dados.resumo;

    atualizarInterfaceModo();

    aplicarOrdenacao();

  } catch (erro) {
    console.error(
      "Erro Shopee Radar:",
      erro
    );

    if (
      !adicionar
    ) {
      mostrarErro(
        erro instanceof Error
          ? erro.message
          : String(
              erro
            )
      );
    }

  } finally {
    carregando =
      false;

    if (
      infiniteLoader
    ) {
      infiniteLoader.hidden =
        true;
    }
  }

  if (
    !adicionar &&
    nichoAtual !== "all"
  ) {
    await completarNicho();
  }
}


// ======================================================
// CONTADORES
// ======================================================

function atualizarContadores() {
  const listaVisivel =
    obterListaFiltrada();

  const usandoFiltro =
    nichoAtual !==
      "all" ||
    Boolean(
      buscaDigitada
    );

  if (
    totalProdutos
  ) {
    totalProdutos.textContent =
      usandoFiltro
        ? listaVisivel.length
        : (
            totalServidor ||
            produtos.length
          );
  }


  if (
    totalVideos
  ) {
    totalVideos.textContent =
      listaVisivel.length;
  }


  if (
    !totalOportunidades
  ) {
    return;
  }


  if (
    filtroAtual ===
    "zero"
  ) {
    totalOportunidades.textContent =
      listaVisivel.filter(
        produto =>
          numeroSeguro(
            produto.times_seen
          ) >= 2
      ).length;

    return;
  }


  if (
    filtroAtual ===
    "radar"
  ) {
    if (
      usandoFiltro
    ) {
      totalOportunidades.textContent =
        listaVisivel.filter(
          produto =>
            produto.momentum_nivel ===
              "em_alta" ||
            produto.momentum_nivel ===
              "ganhando_forca"
        ).length;

    } else {
      totalOportunidades.textContent =
        numeroSeguro(
          resumoServidor
            .postar_agora
        ) +
        numeroSeguro(
          resumoServidor
            .forte_candidato
        );
    }

    return;
  }


  totalOportunidades.textContent =
    listaVisivel.length;
}


// ======================================================
// INTERFACE
// ======================================================

function atualizarInterfaceModo() {
  const zero =
    filtroAtual ===
    "zero";


  if (
    zeroStrategyBox
  ) {
    zeroStrategyBox.classList.toggle(
      "active",
      zero
    );
  }


  if (
    totalProdutosLabel
  ) {
    totalProdutosLabel.textContent =
      zero
        ? "PRODUTOS 0 VENDAS"
        : "NO RADAR";
  }


  if (
    totalOportunidadesLabel
  ) {
    totalOportunidadesLabel.textContent =
      zero
        ? "RECORRENTES"
        : "DESTAQUES";
  }


  if (
    heroDescription
  ) {
    heroDescription.textContent =
      zero
        ? "Encontre produtos ainda sem nenhuma venda e tente posicionar seu vídeo antes da concorrência."
        : "Acompanhe momentum, tendência, ranking e movimento dos produtos em um único Radar.";
  }


  if (
    resultsTitle
  ) {
    if (
      filtroAtual ===
      "zero"
    ) {
      resultsTitle.textContent =
        "🎯 Ranquear seus vídeos";

    } else if (
      filtroAtual ===
      "hot"
    ) {
      resultsTitle.textContent =
        "🔥 Mais vendidos";

    } else if (
      filtroAtual ===
      "rating"
    ) {
      resultsTitle.textContent =
        "⭐ Melhor avaliação";

    } else {
      resultsTitle.textContent =
        "🔥 O que está ganhando força";
    }
  }
}


// ======================================================
// COR MOMENTUM
// ======================================================

function obterCorMomentum(
  produto
) {
  if (
    produto.momentum_nivel ===
    "em_alta"
  ) {
    return "#ff4d4d";
  }

  if (
    produto.momentum_nivel ===
    "ganhando_forca"
  ) {
    return "#ff8a3d";
  }

  if (
    produto.momentum_nivel ===
    "acompanhar"
  ) {
    return "#32d583";
  }

  return "#9299a8";
}


// ======================================================
// CARD MOMENTUM
// ======================================================

function criarCardMomentum(
  produto
) {
  const favoritado =
    estaFavoritado(
      produto.id
    );

  const cor =
    obterCorMomentum(
      produto
    );

  const vendas =
    numeroSeguro(
      produto
        .vendas_confirmadas_24h
    );

  const rankChange =
    numeroSeguro(
      produto.rank_change
    );

  return `
    <article
      class="product-card"
      data-id="${escapar(
        produto.id
      )}"
      style="position:relative;"
    >

      <button
        class="favorite-btn"
        data-favorite-id="${escapar(
          produto.id
        )}"
        style="
          position:absolute;
          top:10px;
          right:10px;
          z-index:20;
          width:40px;
          height:40px;
          border:1px solid rgba(255,255,255,.12);
          border-radius:50%;
          background:rgba(10,12,18,.88);
          color:${
            favoritado
              ? "#ff5a1f"
              : "#fff"
          };
          font-size:24px;
        "
      >
        ${
          favoritado
            ? "♥"
            : "♡"
        }
      </button>


      ${
        produto.image_url
          ? `
            <img
              class="product-image"
              src="${escapar(
                produto.image_url
              )}"
              alt="${escapar(
                produto.name
              )}"
              loading="lazy"
            >
          `
          : ""
      }


      <div
        class="product-card-content"
      >

        <div
          class="product-card-top"
        >

          <span
            class="opportunity-badge"
            style="
              color:${cor};
              background:${cor}18;
            "
          >
            ${escapar(
              produto.momentum_rotulo
            )}
          </span>


          <span
            class="score-badge"
          >
            ${Math.round(
              produto.momentum_score
            )}
          </span>

        </div>


        <h3
          class="product-name"
        >
          ${escapar(
            produto.name
          )}
        </h3>


        <div
          class="product-shop"
        >
          🏪 ${escapar(
            produto.shop_name
          )}
        </div>


        <div
          style="
            margin:9px 0;
            padding:9px;
            border-radius:10px;
            background:#0b0e14;
          "
        >

          <strong
            style="
              color:#ff7a1a;
              font-size:11px;
            "
          >
            ${escapar(
              produto.trend_nivel
            )}
          </strong>

          <div
            style="
              margin-top:5px;
              color:#9299a8;
              font-size:9px;
            "
          >
            Trend Score
            ${Math.round(
              produto.trend_score
            )}
          </div>

        </div>


        <div
          class="product-stats"
        >

          <div
            class="product-stat"
          >
            <span>
              VENDIDOS
            </span>

            <strong>
              ${formatarNumero(
                produto.sold_count
              )}
            </strong>
          </div>


          <div
            class="product-stat"
          >
            <span>
              + VENDAS 24H
            </span>

            <strong>
              ${
                vendas > 0
                  ? "+"
                  : ""
              }${formatarNumero(
                vendas
              )}
            </strong>
          </div>


          <div
            class="product-stat"
          >
            <span>
              CAPTURAS
            </span>

            <strong>
              ${formatarNumero(
                produto.capturas_24h
              )}
            </strong>
          </div>


          <div
            class="product-stat"
          >
            <span>
              RANKING
            </span>

            <strong>
              ${
                produto.rank_atual > 0
                  ? `#${produto.rank_atual}`
                  : "—"
              }
            </strong>
          </div>

        </div>


        <div
          style="
            display:grid;
            grid-template-columns:
              repeat(2,minmax(0,1fr));
            gap:7px;
            margin-top:9px;
          "
        >

          <div
            style="
              padding:8px;
              border-radius:9px;
              background:#0b0e14;
            "
          >

           
