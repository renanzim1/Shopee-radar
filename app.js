// ======================================================
// SHOPEE RADAR — APP.JS
// VERSÃO AJUSTADA — CARDS MOBILE + TOP NUMÉRICO
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


// ======================================================
// ESTADO
// ======================================================

let produtos = [];
let paginaAtual = 1;
let temProximaPagina = true;
let carregando = false;
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
// CORREÇÃO VISUAL DOS QUADRADOS
// ======================================================

(function aplicarAjustesCards() {

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "radar-card-fixes";

  style.textContent = `

    .product-stats {
      display: grid !important;
      grid-template-columns:
        repeat(2, minmax(0, 1fr)) !important;
      gap: 8px !important;
      width: 100% !important;
    }

    .product-stat {
      min-width: 0 !important;
      width: 100% !important;
      height: auto !important;
      min-height: 68px !important;
      padding: 10px 8px !important;
      box-sizing: border-box !important;

      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: flex-start !important;

      overflow: visible !important;
    }

    .product-stat span {
      display: block !important;

      width: 100% !important;

      white-space: normal !important;

      overflow: visible !important;

      text-overflow: clip !important;

      word-break: normal !important;

      overflow-wrap: normal !important;

      line-height: 1.15 !important;

      font-size: 8px !important;

      letter-spacing: 0 !important;

      margin-bottom: 5px !important;
    }

    .product-stat strong {
      display: block !important;

      width: 100% !important;

      white-space: normal !important;

      overflow: visible !important;

      text-overflow: clip !important;

      line-height: 1.1 !important;
    }


    .radar-mini-grid {
      display: grid;

      grid-template-columns:
        repeat(2, minmax(0, 1fr));

      gap: 8px;

      margin-top: 9px;

      width: 100%;
    }


    .radar-mini-box {
      min-width: 0;

      min-height: 72px;

      padding: 9px;

      box-sizing: border-box;

      border-radius: 9px;

      background: #0b0e14;

      display: flex;

      flex-direction: column;

      justify-content: center;

      align-items: flex-start;

      overflow: visible;
    }


    .radar-mini-box small {
      display: block;

      width: 100%;

      color: #737b8b;

      font-size: 8px;

      line-height: 1.2;

      white-space: normal;

      overflow: visible;

      text-overflow: clip;
    }


    .radar-mini-box strong {
      display: block;

      width: 100%;

      margin-top: 4px;

      font-size: 20px;

      line-height: 1.05;

      white-space: normal;

      overflow: visible;
    }


    @media (max-width: 420px) {

      .product-stat {
        padding: 9px 7px !important;

        min-height: 66px !important;
      }

      .product-stat span {
        font-size: 7.5px !important;
      }

      .product-stat strong {
        font-size: 16px !important;
      }

      .radar-mini-box {
        padding: 8px;

        min-height: 68px;
      }

      .radar-mini-box small {
        font-size: 7.5px;
      }

      .radar-mini-box strong {
        font-size: 19px;
      }

    }

  `;

  document.head.appendChild(
    style
  );

})();


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

  try {

    localStorage.setItem(
      "shopeeRadarFavoritos",
      JSON.stringify(
        favoritos
      )
    );

  } catch (erro) {

    console.error(
      "Erro ao salvar favoritos:",
      erro
    );

  }

}


function estaFavoritado(id) {

  return favoritos.some(
    produto =>
      String(
        produto.id
      ) ===
      String(
        id
      )
  );

}


function encontrarProduto(id) {

  return (
    produtos.find(
      produto =>
        String(
          produto.id
        ) ===
        String(
          id
        )
    ) ||

    favoritos.find(
      produto =>
        String(
          produto.id
        ) ===
        String(
          id
        )
    )
  );

}


function alternarFavorito(id) {

  const produto =
    encontrarProduto(
      id
    );

  if (!produto) {
    return;
  }


  if (
    estaFavoritado(
      id
    )
  ) {

    favoritos =
      favoritos.filter(
        item =>
          String(
            item.id
          ) !==
          String(
            id
          )
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
// UTILIDADES
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

    .normalize(
      "NFD"
    )

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
    numero >=
    1000000
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
    numero >=
    1000
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


// ======================================================
// NICHOS
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
    "conjunto feminino",
    "roupa feminina",
    "roupa masculina",
    "tenis",
    "sapato",
    "sandalia",
    "chinelo",
    "bolsa",
    "mochila",
    "calcinha",
    "sutia",
    "pijama"
  ],


  casa: [
    "casa",
    "cozinha",
    "panela",
    "frigideira",
    "talher",
    "prato",
    "copo",
    "caneca",
    "garrafa",
    "jarra",
    "pote",
    "marmita",
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
    "mop",
    "vassoura",
    "rodo",
    "limpeza",
    "escorredor",
    "peneira",
    "batedor",
    "mixer"
  ],


  cozinha: [
    "panela",
    "frigideira",
    "talher",
    "prato",
    "copo",
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
    "air fryer",
    "airfryer",
    "cafeteira",
    "chaleira",
    "tabua",
    "peneira"
  ],


  beleza: [
    "maquiagem",
    "batom",
    "rimel",
    "mascara cilios",
    "base facial",
    "corretivo",
    "blush",
    "sombra",
    "delineador",
    "skincare",
    "hidratante",
    "creme corporal",
    "locao",
    "serum",
    "sabonete",
    "shampoo",
    "condicionador",
    "mascara capilar",
    "perfume",
    "colonia",
    "desodorante",
    "body splash",
    "protetor solar",
    "esmalte",
    "depilador",
    "natura",
    "avon",
    "boticario"
  ],


  eletronicos: [
    "eletronico",
    "smartwatch",
    "relogio inteligente",
    "fone",
    "headphone",
    "earbuds",
    "caixa de som",
    "bluetooth",
    "carregador",
    "cabo usb",
    "power bank",
    "camera",
    "webcam",
    "microfone",
    "projetor",
    "led",
    "lampada",
    "adaptador",
    "celular",
    "smartphone",
    "iphone",
    "android",
    "samsung",
    "xiaomi",
    "motorola",
    "redmi",
    "notebook",
    "computador",
    "monitor",
    "teclado",
    "mouse",
    "ssd",
    "pendrive",
    "roteador"
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
    "comedouro",
    "bebedouro",
    "areia gato",
    "areia sanitaria",
    "casinha pet",
    "cama pet",
    "arranhador"
  ],


  fitness: [
    "fitness",
    "academia",
    "musculacao",
    "halter",
    "peso academia",
    "elastico exercicio",
    "treino",
    "yoga",
    "pilates",
    "crossfit",
    "corrida",
    "esporte",
    "squeeze",
    "tapete yoga",
    "luva academia"
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
    "limpa para brisa",
    "tapete carro",
    "capa banco",
    "carregador veicular",
    "lavagem automotiva",
    "polimento"
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
    "solda",
    "ferro de solda",
    "compressor",
    "esmerilhadeira",
    "lixadeira",
    "multimetro",
    "caixa ferramentas"
  ]

};


// ======================================================
// IDENTIFICAR NICHO
// ======================================================

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
    ];


  if (
    !Array.isArray(
      palavras
    ) ||
    !palavras.length
  ) {
    return true;
  }


  const texto =
    normalizarTexto(
      [
        produto.name,
        produto.shop_name
      ].join(" ")
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

    if (
      !produto ||
      !produto.id
    ) {
      continue;
    }


    const id =
      String(
        produto.id
      );


    if (
      !mapa.has(
        id
      )
    ) {

      mapa.set(
        id,
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


  const token =
    obterTokenRadar();


  if (!token) {

    redirecionarLogin();

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

    const config =
      montarURL(
        pagina
      );


    const resposta =
      await fetch(
        config.url,
        {

          method:
            "GET",

          headers:
            criarHeadersAPI(),

          cache:
            "no-store"

        }
      );


    if (
      resposta.status ===
        401 ||
      resposta.status ===
        403
    ) {

      redirecionarLogin();

      return;

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


    let novos =
      [];


    if (
      config.tipo ===
      "momentum"
    ) {

      novos =
        (
          Array.isArray(
            dados.produtos
          )
            ? dados.produtos
            : []
        ).map(
          normalizarMomentum
        );

    }


    if (
      config.tipo ===
      "zero"
    ) {

      novos =
        (
          Array.isArray(
            dados.produtos
          )
            ? dados.produtos
            : []
        ).map(
          normalizarZero
        );

    }


    if (
      config.tipo ===
      "ranking"
    ) {

      novos =
        (
          Array.isArray(
            dados.produtos
          )
            ? dados.produtos
            : []
        ).map(
          normalizarRanking
        );

    }


    novos =
      removerDuplicados(
        novos
      );


    if (
      adicionar
    ) {

      produtos =
        removerDuplicados(
          [
            ...produtos,
            ...novos
          ]
        );

    } else {

      produtos =
        novos;

    }


    paginaAtual =
      numeroSeguro(
        dados.paginaAtual ??
        pagina
      );


    temProximaPagina =
      Boolean(
        dados.temProximaPagina
      );


    totalServidor =
      numeroSeguro(
        dados.total
      );


    resumoServidor =
      dados.resumo ||
      {};


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

}


// ======================================================
// FILTRAGEM
// ======================================================

function obterListaFiltrada() {

  let lista =
    removerDuplicados(
      [
        ...produtos
      ]
    );


  const busca =
    normalizarTexto(
      buscaDigitada
    );


  if (
    busca &&
    filtroAtual !==
      "zero"
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
// CONTADORES
// ======================================================

function atualizarContadores(
  listaVisivel = null
) {

  const lista =
    Array.isArray(
      listaVisivel
    )
      ? listaVisivel
      : obterListaFiltrada();


  const filtrando =
    nichoAtual !==
      "all" ||
    Boolean(
      buscaDigitada
    );


  if (
    totalProdutos
  ) {

    totalProdutos.textContent =
      filtrando
        ? lista.length
        : (
            totalServidor ||
            produtos.length
          );

  }


  if (
    totalVideos
  ) {

    totalVideos.textContent =
      produtos.length;

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
      lista.filter(
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
      filtrando
    ) {

      totalOportunidades.textContent =
        lista.filter(
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
    lista.length;

}


// ======================================================
// INTERFACE POR MODO
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
        : "Acompanhe a força, tendência, posição e movimento dos produtos em um único Radar.";

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
// ORDENAÇÃO
// ======================================================

function aplicarOrdenacao() {

  let lista =
    obterListaFiltrada();


  if (
    ordenacaoAtual ===
    "relevance"
  ) {

    lista.sort(
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


  if (
    ordenacaoAtual ===
    "trend"
  ) {

    lista.sort(
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

    lista.sort(
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

    lista.sort(
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

    lista.sort(
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


  atualizarContadores(
    lista
  );


  renderizarProdutos(
    lista
  );

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
// COMPONENTES DOS CARDS
// ======================================================

function botaoFavorito(
  produto
) {

  const favoritado =
    estaFavoritado(
      produto.id
    );


  return `

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

  `;

}


function imagemProduto(
  produto
) {

  if (
    !produto.image_url
  ) {
    return "";
  }


  return `

    <img
      class="product-image"
      src="${escapar(
        produto.image_url
      )}"
      alt="${escapar(
        produto.name
      )}"
      loading="lazy"
      decoding="async"
    >

  `;

}


// ======================================================
// CARD MOMENTUM
// ======================================================

function criarCardMomentum(
  produto
) {

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


  // IMPORTANTE:
  // O destaque agora é NUMÉRICO.
  // momentum_posicao 1 = TOP 1
  // momentum_posicao 2 = TOP 2
  // momentum_posicao 3 = TOP 3...

  const topNumerico =
    produto.momentum_posicao > 0
      ? Math.round(
          produto.momentum_posicao
        )
      : null;


  return `

    <article
      class="product-card"
      data-id="${escapar(
        produto.id
      )}"
      style="
        position:relative;
      "
    >

      ${botaoFavorito(
        produto
      )}


      ${imagemProduto(
        produto
      )}


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
            📈 Tendência:
            ${Math.round(
              produto.trend_score
            )}/100
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
              🛒 VENDAS AGORA
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
              👀 VISTO NO RADAR
            </span>

            <strong>
              ${formatarNumero(
                produto.capturas_24h
              )}x
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              📊 RANKING ATUAL
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
          class="radar-mini-grid"
        >

          <div
            class="radar-mini-box"
          >

            <small>
              📍 POSIÇÃO RADAR
            </small>

            <strong>
              ${
                topNumerico
                  ? `#${topNumerico}`
                  : "—"
              }
            </strong>

          </div>


          <div
            class="radar-mini-box"
          >

            <small>
              🏆 DESTAQUE
            </small>

            <strong>
              ${
                topNumerico
                  ? `TOP ${topNumerico}`
                  : "—"
              }
            </strong>

          </div>

        </div>


        ${
          rankChange > 0
            ? `

              <div
                style="
                  margin-top:8px;
                  color:#32d583;
                  font-size:10px;
                  font-weight:800;
                "
              >
                🚀 Subiu ${Math.round(
                  rankChange
                )} posições
              </div>

            `
            : ""
        }


        <div
          class="product-footer"
        >

          <div>

            <small>
              🔥 FORÇA AGORA
            </small>

            <strong>
              ${Math.round(
                produto.momentum_score
              )}/100
            </strong>

          </div>


          <div
            class="product-price"
          >

            <small>
              PREÇO
            </small>

            <strong>
              ${dinheiro(
                produto.price
              )}
            </strong>

          </div>

        </div>

      </div>

    </article>

  `;

}


// ======================================================
// CARD ZERO
// ======================================================

function criarCardZero(
  produto
) {

  return `

    <article
      class="product-card"
      data-id="${escapar(
        produto.id
      )}"
      style="
        position:relative;
      "
    >

      ${botaoFavorito(
        produto
      )}


      ${imagemProduto(
        produto
      )}


      <div
        class="product-card-content"
      >

        <div
          class="product-card-top"
        >

          <span
            class="opportunity-badge"
            style="
              color:#c084fc;
              background:rgba(192,132,252,.10);
            "
          >
            🎯 0 VENDAS
          </span>


          <span
            class="score-badge"
          >
            ENTRAR CEDO
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
            background:rgba(192,132,252,.06);
            border:1px solid rgba(192,132,252,.12);
            color:#c9ced8;
            font-size:9px;
            line-height:1.45;
          "
        >
          Produto ainda sem venda registrada.
          Estratégia: publicar o vídeo antes
          da concorrência.
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
              0
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              DETECÇÕES
            </span>

            <strong>
              ${formatarNumero(
                produto.times_seen
              )}
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              AVALIAÇÃO
            </span>

            <strong>
              ⭐ ${numeroSeguro(
                produto.rating
              ).toFixed(1)}
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              ÚLTIMA VEZ
            </span>

            <strong
              style="
                font-size:9px;
              "
            >
              ${escapar(
                formatarData(
                  produto.ultima_captura
                )
              )}
            </strong>

          </div>

        </div>


        <div
          class="product-footer"
        >

          <div>

            <small>
              ESTRATÉGIA
            </small>

            <strong>
              ENTRAR CEDO
            </strong>

          </div>


          <div
            class="product-price"
          >

            <small>
              PREÇO
            </small>

            <strong>
              ${dinheiro(
                produto.price
              )}
            </strong>

          </div>

        </div>

      </div>

    </article>

  `;

}


// ======================================================
// CARD RANKING
// ======================================================

function criarCardRanking(
  produto
) {

  return `

    <article
      class="product-card"
      data-id="${escapar(
        produto.id
      )}"
      style="
        position:relative;
      "
    >

      ${botaoFavorito(
        produto
      )}


      ${imagemProduto(
        produto
      )}


      <div
        class="product-card-content"
      >

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
              AVALIAÇÃO
            </span>

            <strong>
              ⭐ ${numeroSeguro(
                produto.rating
              ).toFixed(1)}
            </strong>

          </div>

        </div>


        <div
          class="product-footer"
        >

          <div>

            <small>
              PRODUTO
            </small>

            <strong>
              SHOPEE
            </strong>

          </div>


          <div
            class="product-price"
          >

            <small>
              PREÇO
            </small>

            <strong>
              ${dinheiro(
                produto.price
              )}
            </strong>

          </div>

        </div>

      </div>

    </article>

  `;

}


// ======================================================
// RENDER
// ======================================================

function renderizarProdutos(
  lista
) {

  if (
    !productsGrid
  ) {
    return;
  }


  const listaUnica =
    removerDuplicados(
      lista
    );


  if (
    !listaUnica.length
  ) {

    productsGrid.innerHTML =
      "";


    if (
      emptyState
    ) {

      emptyState.hidden =
        false;


      const titulo =
        emptyState.querySelector(
          "h3"
        );


      const texto =
        emptyState.querySelector(
          "p"
        );


      if (
        titulo
      ) {

        titulo.textContent =
          "Nenhum produto encontrado";

      }


      if (
        texto
      ) {

        texto.textContent =
          nichoAtual !==
            "all"
            ? "Role a página para carregar mais produtos ou escolha outro nicho."
            : "Tente mudar sua pesquisa.";

      }

    }


    return;

  }


  if (
    emptyState
  ) {

    emptyState.hidden =
      true;

  }


  productsGrid.innerHTML =
    listaUnica.map(
      produto => {

        if (
          produto.tipo ===
          "zero"
        ) {

          return criarCardZero(
            produto
          );

        }


        if (
          produto.tipo ===
          "momentum"
        ) {

          return criarCardMomentum(
            produto
          );

        }


        return criarCardRanking(
          produto
        );

      }
    ).join(
      ""
    );


  ativarEventosCards();

}


// ======================================================
// EVENTOS DOS CARDS
// ======================================================

function ativarEventosCards() {

  document
    .querySelectorAll(
      ".product-card"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            const produto =
              encontrarProduto(
                card.dataset.id
              );


            if (
              produto
            ) {

              abrirModal(
                produto
              );

            }

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".favorite-btn"
    )
    .forEach(
      botao => {

        botao.addEventListener(
          "click",
          event => {

            event.preventDefault();

            event.stopPropagation();


            alternarFavorito(
              botao.dataset
                .favoriteId
            );

          }
        );

      }
    );

}


// ======================================================
// MODAL
// ======================================================

function abrirModal(
  produto
) {

  if (
    !productModal ||
    !modalBody
  ) {
    return;
  }


  const link =
    produto.affiliate_url ||
    produto.product_url ||
    "";


  let extra =
    "";


  if (
    produto.tipo ===
    "momentum"
  ) {

    const topNumerico =
      produto.momentum_posicao > 0
        ? Math.round(
            produto.momentum_posicao
          )
        : null;


    extra = `

      <div
        style="
          margin-top:16px;
          padding:14px;
          background:#11151f;
          border-radius:12px;
        "
      >

        <strong>
          📊 Inteligência do Radar
        </strong>


        <p>
          🔥 Força agora:

          <strong>
            ${Math.round(
              produto.momentum_score
            )}/100
          </strong>
        </p>


        <p>
          📈 Tendência:

          <strong>
            ${escapar(
              produto.trend_nivel
            )}
          </strong>
        </p>


        <p>
          📈 Força da tendência:

          <strong>
            ${Math.round(
              produto.trend_score
            )}/100
          </strong>
        </p>


        <p>
          🛒 Vendas detectadas:

          <strong>
            ${
              numeroSeguro(
                produto.vendas_confirmadas_24h
              ) > 0
                ? "+"
                : ""
            }${formatarNumero(
              produto.vendas_confirmadas_24h
            )}
          </strong>
        </p>


        <p>
          👀 Visto pelo Radar:

          <strong>
            ${formatarNumero(
              produto.capturas_24h
            )}
            vezes
          </strong>
        </p>


        <p>
          📊 Posição encontrada:

          <strong>
            ${
              produto.rank_atual > 0
                ? "#" +
                  produto.rank_atual
                : "Sem posição"
            }
          </strong>
        </p>


        <p>
          📍 Posição no Radar:

          <strong>
            ${
              topNumerico
                ? "#" +
                  topNumerico
                : "Sem posição"
            }
          </strong>
        </p>


        <p>
          🏆 Destaque:

          <strong>
            ${
              topNumerico
                ? "TOP " +
                  topNumerico
                : "Sem posição"
            }
          </strong>
        </p>

      </div>

    `;

  }


  if (
    produto.tipo ===
    "zero"
  ) {

    extra = `

      <div
        style="
          margin-top:16px;
          padding:14px;
          background:rgba(192,132,252,.07);
          border:1px solid rgba(192,132,252,.18);
          border-radius:12px;
        "
      >

        <strong>
          🎯 Estratégia de ranqueamento
        </strong>


        <p
          style="
            margin-top:8px;
            color:#b5bac5;
            line-height:1.5;
          "
        >
          Este produto está com 0 vendas totais
          registradas. A estratégia é publicar
          conteúdo cedo para tentar posicionar
          o vídeo antes de outros afiliados.
        </p>


        <p>
          Detectado pelo Radar:
          ${formatarNumero(
            produto.times_seen
          )}
          vezes.
        </p>

      </div>

    `;

  }


  modalBody.innerHTML = `

    ${
      produto.image_url
        ? `

          <img
            src="${escapar(
              produto.image_url
            )}"
            alt="${escapar(
              produto.name
            )}"
            style="
              width:100%;
              max-height:300px;
              object-fit:contain;
              border-radius:14px;
              margin-bottom:16px;
            "
          >

        `
        : ""
    }


    <h2>
      ${escapar(
        produto.name
      )}
    </h2>


    <p
      style="
        margin-top:8px;
      "
    >
      🏪 ${escapar(
        produto.shop_name
      )}
    </p>


    <p
      style="
        margin-top:15px;
      "
    >
      <strong>
        Preço:
      </strong>

      ${dinheiro(
        produto.price
      )}
    </p>


    <p>
      <strong>
        Vendidos:
      </strong>

      ${formatarNumero(
        produto.sold_count
      )}
    </p>


    <p>
      <strong>
        Avaliação:
      </strong>

      ⭐ ${numeroSeguro(
        produto.rating
      ).toFixed(1)}
    </p>


    ${extra}


    <button
      id="modalFavoriteButton"
      data-id="${escapar(
        produto.id
      )}"
      style="
        width:100%;
        margin-top:18px;
        padding:14px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.15);
        background:#151821;
        color:#fff;
        font-weight:800;
      "
    >

      ${
        estaFavoritado(
          produto.id
        )
          ? "♥ Remover dos favoritos"
          : "♡ Salvar nos favoritos"
      }

    </button>


    ${
      link
        ? `

          <a
            href="${escapar(
              link
            )}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:block;
              margin-top:12px;
              padding:15px;
              text-align:center;
              background:#ff5a1f;
              color:#fff;
              border-radius:12px;
              text-decoration:none;
              font-weight:800;
            "
          >
            🛒 Abrir na Shopee
          </a>

        `
        : ""
    }

  `;


  document
    .getElementById(
      "modalFavoriteButton"
    )
    ?.addEventListener(
      "click",
      event => {

        const id =
          event.currentTarget
            .dataset.id;


        alternarFavorito(
          id
        );


        const atualizado =
          encontrarProduto(
            id
          );


        if (
          atualizado
        ) {

          abrirModal(
            atualizado
          );

        }

      }
    );


  productModal.hidden =
    false;

}


function fecharModal() {

  if (
    productModal
  ) {

    productModal.hidden =
      true;

  }

}


// ======================================================
// LOADING
// ======================================================

function mostrarLoading() {

  if (
    emptyState
  ) {

    emptyState.hidden =
      true;

  }


  if (
    !productsGrid
  ) {
    return;
  }


  productsGrid.innerHTML = `

    <div
      class="loading"
      style="
        grid-column:1/-1;
      "
    >

      <div
        class="loader"
      ></div>


      <p>
        Analisando produtos...
      </p>

    </div>

  `;

}


// ======================================================
// ERRO
// ======================================================

function mostrarErro(
  mensagem
) {

  if (
    !productsGrid
  ) {
    return;
  }


  productsGrid.innerHTML = `

    <div
      class="empty-state"
      style="
        display:block;
        grid-column:1/-1;
      "
    >

      <div>
        ⚠️
      </div>


      <h3>
        Não foi possível carregar
      </h3>


      <p>
        ${escapar(
          mensagem
        )}
      </p>


      <button
        id="retryRadarButton"
        type="button"
        style="
          margin-top:14px;
          padding:12px 16px;
          border:0;
          border-radius:10px;
          background:#ff5a1f;
          color:#fff;
          font-weight:800;
        "
      >
        Tentar novamente
      </button>

    </div>

  `;


  document
    .getElementById(
      "retryRadarButton"
    )
    ?.addEventListener(
      "click",
      () => {

        reiniciarRadar();

      }
    );

}


// ======================================================
// REINICIAR
// ======================================================

function reiniciarRadar() {

  produtos =
    [];


  paginaAtual =
    1;


  totalServidor =
    0;


  resumoServidor =
    {};


  temProximaPagina =
    true;


  carregando =
    false;


  modoFavoritos =
    false;


  atualizarInterfaceModo();


  atualizarContadores(
    []
  );


  carregarProdutos(
    1,
    false
  );

}


// ======================================================
// TROCAR FILTRO
// ======================================================

function trocarFiltro(
  filtro
) {

  if (
    filtro ===
    "all"
  ) {

    filtro =
      "radar";

  }


  filtroAtual =
    filtro;


  if (
    filtroAtual ===
    "hot"
  ) {

    ordenacaoAtual =
      "sales";

  } else if (
    filtroAtual ===
    "rating"
  ) {

    ordenacaoAtual =
      "rating";

  } else if (
    filtroAtual ===
    "zero"
  ) {

    ordenacaoAtual =
      "recent";

  } else {

    ordenacaoAtual =
      "relevance";

  }


  document
    .querySelectorAll(
      "[data-filter]:not(.bottom-item)"
    )
    .forEach(
      botao => {

        botao.classList.toggle(
          "active",
          botao.dataset.filter ===
            filtroAtual
        );

      }
    );


  document
    .querySelectorAll(
      ".bottom-item"
    )
    .forEach(
      botao => {

        const valor =
          botao.dataset.filter;


        const ativo =
          (
            filtroAtual ===
              "radar" &&
            valor ===
              "all"
          ) ||
          valor ===
            filtroAtual;


        botao.classList.toggle(
          "active",
          ativo
        );

      }
    );


  document
    .querySelectorAll(
      "[data-sort]"
    )
    .forEach(
      botao => {

        botao.classList.toggle(
          "active",
          botao.dataset.sort ===
            ordenacaoAtual
        );

      }
    );


  reiniciarRadar();


  window.scrollTo({

    top:
      0,

    behavior:
      "smooth"

  });

}


// ======================================================
// FILTROS PRINCIPAIS
// ======================================================

document
  .querySelectorAll(
    "[data-filter]"
  )
  .forEach(
    botao => {

      botao.addEventListener(
        "click",
        event => {

          const filtro =
            botao.dataset.filter;


          if (
            filtro ===
            "favorites"
          ) {

            event.preventDefault();


            modoFavoritos =
              true;


            document
              .querySelectorAll(
                ".bottom-item"
              )
              .forEach(
                item => {

                  item.classList.toggle(
                    "active",
                    item.dataset.filter ===
                      "favorites"
                  );

                }
              );


            if (
              resultsTitle
            ) {

              resultsTitle.textContent =
                `♡ Favoritos (${favoritos.length})`;

            }


            renderizarProdutos(
              favoritos
            );


            return;

          }


          trocarFiltro(
            filtro
          );

        }
      );

    }
  );


// ======================================================
// ORDENAÇÃO
// ======================================================

document
  .querySelectorAll(
    "[data-sort]"
  )
  .forEach(
    botao => {

      botao.addEventListener(
        "click",
        () => {

          ordenacaoAtual =
            botao.dataset.sort ||
            "relevance";


          document
            .querySelectorAll(
              "[data-sort]"
            )
            .forEach(
              item => {

                item.classList.toggle(
                  "active",
                  item ===
                    botao
                );

              }
            );


          if (
            filtroAtual ===
            "zero"
          ) {

            reiniciarRadar();

          } else {

            aplicarOrdenacao();

          }

        }
      );

    }
  );


// ======================================================
// PESQUISA
// ======================================================

if (
  searchInput
) {

  searchInput.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        buscaDigitada =
          searchInput
            .value
            .trim();


        if (
          filtroAtual ===
          "zero"
        ) {

          reiniciarRadar();

        } else {

          aplicarOrdenacao();

        }

      }

    }
  );


  searchInput.addEventListener(
    "search",
    () => {

      if (
        !searchInput.value
      ) {

        buscaDigitada =
          "";


        if (
          filtroAtual ===
          "zero"
        ) {

          reiniciarRadar();

        } else {

          aplicarOrdenacao();

        }

      }

    }
  );

}


// ======================================================
// NICHO
// ======================================================

if (
  categoryFilter
) {

  categoryFilter.addEventListener(
    "change",
    () => {

      nichoAtual =
        categoryFilter.value;


      aplicarOrdenacao();

    }
  );

}


// ======================================================
// PRÓXIMA PÁGINA
// ======================================================

async function carregarProximaPagina() {

  if (
    carregando ||
    modoFavoritos ||
    !temProximaPagina
  ) {
    return;
  }


  await carregarProdutos(
    paginaAtual + 1,
    true
  );

}


// ======================================================
// SCROLL INFINITO
// ======================================================

window.addEventListener(
  "scroll",
  () => {

    if (
      carregando ||
      modoFavoritos ||
      !temProximaPagina
    ) {
      return;
    }


    const posicao =
      window.innerHeight +
      window.scrollY;


    const altura =
      document
        .documentElement
        .scrollHeight;


    if (
      posicao >=
      altura - 900
    ) {

      carregarProximaPagina();

    }

  },

  {
    passive:
      true
  }
);


// ======================================================
// ATUALIZAÇÃO SILENCIOSA
// ======================================================

setInterval(
  () => {

    if (
      document.visibilityState ===
        "visible" &&
      !modoFavoritos &&
      paginaAtual ===
        1 &&
      !carregando
    ) {

      carregarProdutos(
        1,
        false
      );

    }

  },

  2 * 60 * 1000
);


// ======================================================
// MODAL
// ======================================================

if (
  closeModal
) {

  closeModal.addEventListener(
    "click",
    fecharModal
  );

}


if (
  productModal
) {

  productModal
    .querySelector(
      ".modal-overlay"
    )
    ?.addEventListener(
      "click",
      fecharModal
    );

}


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
        "Escape" &&
      productModal &&
      !productModal.hidden
    ) {

      fecharModal();

    }

  }
);


// ======================================================
// INICIALIZAÇÃO
// ======================================================

filtroAtual =
  "radar";

ordenacaoAtual =
  "relevance";

reiniciarRadar();
