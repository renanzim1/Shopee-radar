// ======================================================
// SHOPEE RADAR — APP.JS
// VERSÃO AJUSTADA — CARDS MOBILE + TOP NUMÉRICO
// ======================================================

// APIS
const MOMENTUM_API = "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-momentum";
const ZERO_API = "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-zero";
const RANKING_API = "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-ranking";
const VIDEOS_API = "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-videos";
const LIMITE_POR_PAGINA = 20;

// ESTADO
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

// TOKEN
function obterTokenRadar() {
  return localStorage.getItem("shopeeRadarAccessToken") || "";
}

function limparSessaoRadarApp() {
  localStorage.removeItem("shopeeRadarAccessToken");
  localStorage.removeItem("shopeeRadarRefreshToken");
  localStorage.removeItem("shopeeRadarUser");
}

function redirecionarLogin() {
  limparSessaoRadarApp();
  window.location.replace("login.html");
}

function criarHeadersAPI() {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${obterTokenRadar()}`
  };
}

// ELEMENTOS
const productsGrid = document.getElementById("productsGrid");
const emptyState = document.getElementById("emptyState");
const totalProdutos = document.getElementById("totalProdutos");
const totalOportunidades = document.getElementById("totalOportunidades");
const totalVideos = document.getElementById("totalVideos");
const totalProdutosLabel = document.getElementById("totalProdutosLabel");
const totalOportunidadesLabel = document.getElementById("totalOportunidadesLabel");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const resultsTitle = document.getElementById("resultsTitle");
const heroDescription = document.getElementById("heroDescription");
const zeroStrategyBox = document.getElementById("zeroStrategyBox");
const infiniteLoader = document.getElementById("infiniteLoader");
const productModal = document.getElementById("productModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

// ======================================================
// AJUSTES VISUAIS
// ======================================================

(function aplicarAjustesCards() {
  const style = document.createElement("style");
  style.id = "radar-card-fixes";

  style.textContent = `
    .product-stats{
      display:grid !important;
      grid-template-columns:repeat(2,minmax(0,1fr)) !important;
      gap:8px !important;
    }

    .product-stat{
      min-width:0 !important;
      height:auto !important;
      min-height:68px !important;
      padding:10px 8px !important;
      display:flex !important;
      flex-direction:column !important;
      justify-content:center !important;
      align-items:flex-start !important;
      overflow:visible !important;
    }

    .product-stat span{
      display:block !important;
      width:100% !important;
      white-space:normal !important;
      overflow:visible !important;
      text-overflow:clip !important;
      word-break:normal !important;
      overflow-wrap:normal !important;
      line-height:1.15 !important;
      font-size:8px !important;
      letter-spacing:0 !important;
      margin-bottom:5px !important;
    }

    .product-stat strong{
      display:block !important;
      width:100% !important;
      white-space:normal !important;
      overflow:visible !important;
      text-overflow:clip !important;
      line-height:1.1 !important;
    }

    .radar-mini-grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:8px;
      margin-top:9px;
    }

    .radar-mini-box{
      min-width:0;
      min-height:72px;
      padding:9px;
      border-radius:9px;
      background:#0b0e14;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:flex-start;
    }

    .radar-mini-box small{
      display:block;
      width:100%;
      color:#737b8b;
      font-size:8px;
      line-height:1.2;
      white-space:normal;
      overflow:visible;
    }

    .radar-mini-box strong{
      display:block;
      margin-top:4px;
      font-size:20px;
      line-height:1.05;
      white-space:normal;
    }

    @media (max-width:420px){
      .product-stat{
        padding:9px 7px !important;
        min-height:66px !important;
      }

      .product-stat span{
        font-size:7.5px !important;
      }

      .product-stat strong{
        font-size:16px !important;
      }

      .radar-mini-box{
        padding:8px;
        min-height:68px;
      }

      .radar-mini-box small{
        font-size:7.5px;
      }

      .radar-mini-box strong{
        font-size:19px;
      }
    }
  `;

  document.head.appendChild(style);
})();

// ======================================================
// FAVORITOS
// ======================================================

let favoritos = [];

try {
  favoritos =
    JSON.parse(
      localStorage.getItem("shopeeRadarFavoritos")
    ) || [];

  if (!Array.isArray(favoritos)) {
    favoritos = [];
  }
} catch {
  favoritos = [];
}

function salvarFavoritos() {
  try {
    localStorage.setItem(
      "shopeeRadarFavoritos",
      JSON.stringify(favoritos)
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
    p => String(p.id) === String(id)
  );
}

function encontrarProduto(id) {
  return (
    produtos.find(
      p => String(p.id) === String(id)
    ) ||
    favoritos.find(
      p => String(p.id) === String(id)
    )
  );
}

function alternarFavorito(id) {
  const produto = encontrarProduto(id);

  if (!produto) return;

  if (estaFavoritado(id)) {
    favoritos = favoritos.filter(
      p => String(p.id) !== String(id)
    );
  } else {
    favoritos.unshift({
      ...produto
    });
  }

  salvarFavoritos();

  if (modoFavoritos) {
    renderizarProdutos(favoritos);
  } else {
    aplicarOrdenacao();
  }
}

// ======================================================
// UTILIDADES
// ======================================================

function numeroSeguro(valor) {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dinheiro(valor) {
  return numeroSeguro(valor)
    .toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL"
      }
    );
}

function formatarNumero(valor) {
  const n = numeroSeguro(valor);

  if (n >= 1000000) {
    return (
      (n / 1000000)
        .toFixed(1)
        .replace(".", ",") +
      " mi"
    );
  }

  if (n >= 1000) {
    return (
      (n / 1000)
        .toFixed(
          n >= 10000 ? 0 : 1
        )
        .replace(".", ",") +
      " mil"
    );
  }

  return n.toLocaleString(
    "pt-BR"
  );
}

function formatarData(valor) {
  if (!valor) return "";

  try {
    return new Date(valor)
      .toLocaleString(
        "pt-BR",
        {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
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
    MAPA_NICHOS[nicho];

  if (
    !Array.isArray(palavras) ||
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
    p =>
      texto.includes(
        normalizarTexto(p)
      )
  );
}
// ======================================================
// NORMALIZAÇÃO
// ======================================================

function normalizarMomentum(p) {
  return {
    id: String(
      p.product_id ??
      p.id ??
      ""
    ),

    tipo: "momentum",

    name:
      p.product_name ??
      "Produto Shopee",

    image_url:
      p.image_url ?? "",

    product_url:
      p.product_url ?? "",

    affiliate_url:
      p.affiliate_url ??
      p.product_url ??
      "",

    shop_name:
      p.shop_name ??
      "Shopee",

    price:
      numeroSeguro(p.price),

    sold_count:
      numeroSeguro(
        p.sold_count
      ),

    rating:
      numeroSeguro(p.rating),

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

function normalizarZero(p) {
  return {
    id: String(
      p.product_id ??
      p.id ??
      ""
    ),

    tipo: "zero",

    name:
      p.product_name ??
      "Produto Shopee",

    image_url:
      p.image_url ?? "",

    product_url:
      p.product_url ?? "",

    affiliate_url:
      p.affiliate_url ??
      p.product_url ??
      "",

    shop_name:
      p.shop_name ??
      "Shopee",

    price:
      numeroSeguro(p.price),

    sold_count: 0,

    rating:
      numeroSeguro(p.rating),

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

function normalizarRanking(p) {
  return {
    id: String(
      p.product_id ??
      p.id ??
      ""
    ),

    tipo: "ranking",

    name:
      p.product_name ??
      p.name ??
      "Produto Shopee",

    image_url:
      p.image_url ?? "",

    product_url:
      p.product_url ?? "",

    affiliate_url:
      p.affiliate_url ??
      p.product_url ??
      "",

    shop_name:
      p.shop_name ??
      "Shopee",

    price:
      numeroSeguro(p.price),

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
// VÍDEOS
// ======================================================

function montarLinkTelegram(
  canal,
  postId
) {
  canal =
    String(canal ?? "")
      .replace(/^@/, "")
      .trim();

  postId =
    String(postId ?? "")
      .trim();

  if (
    !canal ||
    !postId
  ) {
    return "";
  }

  return `https://t.me/${encodeURIComponent(canal)}/${encodeURIComponent(postId)}`;
}

function extrairOrigemTelegram(v) {
  let canal =
    v.source_channel ??
    "";

  let postId =
    v.source_post_id ??
    "";

  const identificador =
    String(
      v.shopee_video_id ??
      ""
    );

  if (
    (!canal || !postId) &&
    identificador.startsWith(
      "telegram:"
    )
  ) {
    const partes =
      identificador.split(":");

    if (
      partes.length >= 3
    ) {
      canal =
        canal ||
        partes[1];

      postId =
        postId ||
        partes[2];
    }
  }

  return {
    canal,
    postId
  };
}

function normalizarVideo(v) {
  const origem =
    extrairOrigemTelegram(v);

  const telegramUrl =
    montarLinkTelegram(
      origem.canal,
      origem.postId
    );

  const plataforma =
    String(
      v.source_platform ??
      ""
    ).toLowerCase();

  /*
    IMPORTANTE:
    Para vídeos encontrados no Telegram,
    abrimos a publicação original.

    Não usamos o endereço CDN temporário
    como botão principal porque ele pode
    expirar ou não abrir corretamente no
    navegador do celular.
  */

  let watchUrl = "";

  if (
    plataforma === "telegram" ||
    telegramUrl
  ) {
    watchUrl =
      telegramUrl;
  } else {
    watchUrl =
      v.watch_url ??
      v.video_url ??
      "";
  }

  const temProduto =
    Boolean(
      v.has_product ||
      v.product_url
    );

  return {
    id: String(
      v.id ??
      v.shopee_video_id ??
      ""
    ),

    tipo: "video",

    shopee_video_id:
      v.shopee_video_id ??
      "",

    top:
      numeroSeguro(v.top),

    name:
      v.description?.trim() ||
      (
        origem.canal
          ? "Vídeo em alta"
          : "Vídeo descoberto"
      ),

    description:
      v.description ??
      "",

    image_url:
      v.thumbnail_url ??
      "",

    thumbnail_url:
      v.thumbnail_url ??
      "",

    /*
      Mantemos video_url apenas como
      informação interna. O botão usa
      watch_url.
    */
    video_url:
      v.video_url ??
      "",

    watch_url:
      watchUrl,

    product_url:
      v.product_url ??
      "",

    affiliate_url:
      v.product_url ??
      "",

    creator_name:
      v.creator_name ??
      "",

    creator_username:
      v.creator_username ??
      "",

    shop_name:
      origem.canal
        ? `@${origem.canal}`
        : (
            v.creator_username
              ? `@${v.creator_username}`
              : "Vídeo encontrado"
          ),

    trend_score:
      numeroSeguro(
        v.trend_score
      ),

    trend_tier:
      v.trend_tier ??
      "descoberto",

    trend_label:
      v.trend_label ??
      "🎬 Vídeo descoberto",

    source_platform:
      v.source_platform ??
      "",

    source_channel:
      origem.canal,

    source_post_id:
      origem.postId,

    /*
      Só tratamos métricas como verificadas
      quando existe valor MAIOR que zero.

      Assim o app não mostra:
      0 visualizações
      0 curtidas
      como se fossem dados reais.
    */
    views:
      numeroSeguro(v.views),

    likes:
      numeroSeguro(v.likes),

    comments:
      numeroSeguro(v.comments),

    metrics_verified:
      numeroSeguro(v.views) > 0 ||
      numeroSeguro(v.likes) > 0 ||
      numeroSeguro(v.comments) > 0,

    has_product:
      temProduto,

    published_at:
      v.published_at ??
      null,

    ultima_captura:
      v.created_at ??
      null,

    created_at:
      v.created_at ??
      null,

    price: 0,
    sold_count: 0,
    rating: 0
  };
}

function removerDuplicados(lista) {
  const mapa =
    new Map();

  for (
    const p of lista
  ) {
    if (
      !p ||
      !p.id
    ) {
      continue;
    }

    const chave =
      p.tipo === "video"
        ? `video:${p.id}`
        : `produto:${p.id}`;

    if (
      !mapa.has(chave)
    ) {
      mapa.set(
        chave,
        p
      );
    }
  }

  return [
    ...mapa.values()
  ];
}

// ======================================================
// URL DAS APIS
// ======================================================

function montarURL(pagina) {

  if (
    filtroAtual === "videos"
  ) {
    const url =
      new URL(
        VIDEOS_API
      );

    url.searchParams.set(
      "page",
      String(pagina)
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
        "video"
    };
  }

  if (
    filtroAtual === "zero"
  ) {
    const url =
      new URL(
        ZERO_API
      );

    url.searchParams.set(
      "page",
      String(pagina)
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
    filtroAtual === "hot" ||
    filtroAtual === "rating"
  ) {
    const url =
      new URL(
        RANKING_API
      );

    url.searchParams.set(
      "page",
      String(pagina)
    );

    url.searchParams.set(
      "limit",
      String(
        LIMITE_POR_PAGINA
      )
    );

    url.searchParams.set(
      "mode",
      filtroAtual === "hot"
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
    String(pagina)
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
// CARREGAMENTO
// ======================================================

async function carregarProdutos(
  pagina = 1,
  adicionar = false
) {
  if (
    carregando ||
    modoFavoritos ||
    (
      adicionar &&
      !temProximaPagina
    )
  ) {
    return;
  }

  if (
    !obterTokenRadar()
  ) {
    redirecionarLogin();
    return;
  }

  carregando = true;

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
          method: "GET",
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
        "Não foi possível carregar os dados."
      );
    }

    let novos = [];

    if (
      config.tipo ===
      "video"
    ) {
      novos =
        (
          Array.isArray(
            dados.videos
          )
            ? dados.videos
            : []
        ).map(
          normalizarVideo
        );
    } else {
      const lista =
        Array.isArray(
          dados.produtos
        )
          ? dados.produtos
          : [];

      novos =
        lista.map(
          config.tipo ===
            "momentum"
            ? normalizarMomentum
            : config.tipo ===
                "zero"
              ? normalizarZero
              : normalizarRanking
        );
    }

    novos =
      removerDuplicados(
        novos
      );

    produtos =
      adicionar
        ? removerDuplicados([
            ...produtos,
            ...novos
          ])
        : novos;

    paginaAtual =
      numeroSeguro(
        dados.paginaAtual ??
        dados.page ??
        pagina
      ) || pagina;

    if (
      typeof
        dados.temProximaPagina ===
      "boolean"
    ) {
      temProximaPagina =
        dados.temProximaPagina;
    } else if (
      typeof
        dados.has_more ===
      "boolean"
    ) {
      temProximaPagina =
        dados.has_more;
    } else {
      temProximaPagina =
        novos.length >=
        LIMITE_POR_PAGINA;
    }

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
          : String(erro)
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
// FILTROS LOCAIS
// ======================================================

function obterListaFiltrada() {
  let lista =
    removerDuplicados([
      ...produtos
    ]);

  const busca =
    normalizarTexto(
      buscaDigitada
    );

  if (
    busca &&
    filtroAtual !== "zero"
  ) {
    lista =
      lista.filter(
        p => {
          if (
            p.tipo ===
            "video"
          ) {
            return normalizarTexto(
              [
                p.name,
                p.description,
                p.creator_name,
                p.creator_username,
                p.source_channel
              ].join(" ")
            ).includes(
              busca
            );
          }

          return normalizarTexto(
            [
              p.name,
              p.shop_name
            ].join(" ")
          ).includes(
            busca
          );
        }
      );
  }

  /*
    Os vídeos ainda não possuem categoria
    de produto confiável em todos os registros.
    Portanto o filtro de nicho não deve
    esconder vídeos aleatoriamente.
  */
  if (
    filtroAtual !== "videos" &&
    nichoAtual !== "all"
  ) {
    lista =
      lista.filter(
        p =>
          produtoPertenceNicho(
            p,
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
    nichoAtual !== "all" ||
    Boolean(
      buscaDigitada
    );

  if (
    filtroAtual === "videos"
  ) {
    if (
      totalProdutos
    ) {
      totalProdutos.textContent =
        totalServidor ||
        produtos.length;
    }

    if (
      totalVideos
    ) {
      totalVideos.textContent =
        totalServidor ||
        produtos.length;
    }

    if (
      totalOportunidades
    ) {
      totalOportunidades.textContent =
        lista.filter(
          p =>
            p.has_product
        ).length;
    }

    return;
  }

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
    filtroAtual === "zero"
  ) {
    totalOportunidades.textContent =
      lista.filter(
        p =>
          numeroSeguro(
            p.times_seen
          ) >= 2
      ).length;

    return;
  }

  if (
    filtroAtual === "radar"
  ) {
    totalOportunidades.textContent =
      filtrando
        ? lista.filter(
            p =>
              numeroSeguro(
                p.momentum_score
              ) >= 70
          ).length
        : numeroSeguro(
            resumoServidor
              .total_oportunidades
          );

    return;
  }

  totalOportunidades.textContent =
    lista.length;
}

// ======================================================
// INTERFACE POR MODO
// ======================================================

function atualizarInterfaceModo() {

  if (
    filtroAtual === "videos"
  ) {
    if (
      resultsTitle
    ) {
      resultsTitle.textContent =
        "🎬 Vídeos em Alta";
    }

    if (
      heroDescription
    ) {
      heroDescription.textContent =
        "Vídeos encontrados automaticamente pelo Radar com acesso à publicação e ao produto associado.";
    }

    if (
      totalProdutosLabel
    ) {
      totalProdutosLabel.textContent =
        "VÍDEOS";
    }

    if (
      totalOportunidadesLabel
    ) {
      totalOportunidadesLabel.textContent =
        "COM PRODUTO";
    }

    if (
      zeroStrategyBox
    ) {
      zeroStrategyBox.hidden =
        true;
    }

    return;
  }

  if (
    filtroAtual === "zero"
  ) {
    if (
      resultsTitle
    ) {
      resultsTitle.textContent =
        "🎯 Produtos com Zero Vendas";
    }

    if (
      heroDescription
    ) {
      heroDescription.textContent =
        "Encontre produtos ainda sem vendas detectadas e tente posicionar seus vídeos antes da concorrência.";
    }

    if (
      totalProdutosLabel
    ) {
      totalProdutosLabel.textContent =
        "PRODUTOS";
    }

    if (
      totalOportunidadesLabel
    ) {
      totalOportunidadesLabel.textContent =
        "OPORTUNIDADES";
    }

    if (
      zeroStrategyBox
    ) {
      zeroStrategyBox.hidden =
        false;
    }

    return;
  }

  if (
    filtroAtual === "hot"
  ) {
    if (
      resultsTitle
    ) {
      resultsTitle.textContent =
        "🔥 Mais Vendidos";
    }

    if (
      heroDescription
    ) {
      heroDescription.textContent =
        "Produtos encontrados pelo Radar com maior força de vendas.";
    }

    if (
      zeroStrategyBox
    ) {
      zeroStrategyBox.hidden =
        true;
    }

    return;
  }

  if (
    filtroAtual === "rating"
  ) {
    if (
      resultsTitle
    ) {
      resultsTitle.textContent =
        "⭐ Melhor Avaliados";
    }

    if (
      heroDescription
    ) {
      heroDescription.textContent =
        "Produtos encontrados pelo Radar organizados por avaliação.";
    }

    if (
      zeroStrategyBox
    ) {
      zeroStrategyBox.hidden =
        true;
    }

    return;
  }

  if (
    resultsTitle
  ) {
    resultsTitle.textContent =
      "📡 Radar de Oportunidades";
  }

  if (
    heroDescription
  ) {
    heroDescription.textContent =
      "Produtos que estão ganhando força agora dentro da Shopee.";
  }

  if (
    totalProdutosLabel
  ) {
    totalProdutosLabel.textContent =
      "PRODUTOS";
  }

  if (
    totalOportunidadesLabel
  ) {
    totalOportunidadesLabel.textContent =
      "OPORTUNIDADES";
  }

  if (
    zeroStrategyBox
  ) {
    zeroStrategyBox.hidden =
      true;
  }
      }
// ======================================================
// ORDENAÇÃO
// ======================================================

function aplicarOrdenacao() {
  let lista =
    obterListaFiltrada();

  // Vídeos já chegam ranqueados pela API.
  if (
    filtroAtual === "videos"
  ) {
    lista.sort(
      (a, b) =>
        numeroSeguro(a.top) -
          numeroSeguro(b.top) ||
        numeroSeguro(
          b.trend_score
        ) -
          numeroSeguro(
            a.trend_score
          )
    );

    atualizarContadores(lista);
    renderizarProdutos(lista);
    return;
  }

  if (
    ordenacaoAtual ===
    "price_asc"
  ) {
    lista.sort(
      (a, b) =>
        numeroSeguro(a.price) -
        numeroSeguro(b.price)
    );
  }

  if (
    ordenacaoAtual ===
    "price_desc"
  ) {
    lista.sort(
      (a, b) =>
        numeroSeguro(b.price) -
        numeroSeguro(a.price)
    );
  }

  if (
    ordenacaoAtual ===
    "sales"
  ) {
    lista.sort(
      (a, b) =>
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
      (a, b) =>
        numeroSeguro(b.rating) -
        numeroSeguro(a.rating)
    );
  }

  if (
    ordenacaoAtual ===
    "trend"
  ) {
    lista.sort(
      (a, b) =>
        numeroSeguro(
          b.momentum_score ??
          b.times_seen
        ) -
        numeroSeguro(
          a.momentum_score ??
          a.times_seen
        )
    );
  }

  atualizarContadores(lista);
  renderizarProdutos(lista);
}

// ======================================================
// LOADING / ERRO
// ======================================================

function mostrarLoading() {
  if (!productsGrid) {
    return;
  }

  if (emptyState) {
    emptyState.hidden = true;
  }

  productsGrid.innerHTML =
    Array.from({
      length: 6
    })
      .map(
        () => `
          <article class="product-card loading-card">
            <div class="product-image-wrap">
              <div
                style="
                  width:100%;
                  aspect-ratio:1/1;
                  background:#171a22;
                  border-radius:12px;
                "
              ></div>
            </div>

            <div class="product-info">
              <div
                style="
                  height:15px;
                  background:#171a22;
                  border-radius:8px;
                  margin-bottom:8px;
                "
              ></div>

              <div
                style="
                  height:12px;
                  width:65%;
                  background:#171a22;
                  border-radius:8px;
                "
              ></div>
            </div>
          </article>
        `
      )
      .join("");
}

function mostrarErro(mensagem) {
  if (!productsGrid) {
    return;
  }

  productsGrid.innerHTML = "";

  if (!emptyState) {
    return;
  }

  emptyState.hidden = false;

  const titulo =
    emptyState.querySelector("h3");

  const texto =
    emptyState.querySelector("p");

  if (titulo) {
    titulo.textContent =
      "Não foi possível carregar";
  }

  if (texto) {
    texto.textContent =
      mensagem ||
      "Tente novamente em alguns segundos.";
  }
}

// ======================================================
// CARD DE VÍDEO
// ======================================================

function criarCardVideo(p) {
  const top =
    numeroSeguro(p.top) > 0
      ? `TOP ${Math.round(
          numeroSeguro(p.top)
        )}`
      : "EM ALTA";

  const score =
    Math.round(
      numeroSeguro(
        p.trend_score
      )
    );

  const canal =
    p.source_channel
      ? `@${String(
          p.source_channel
        ).replace(/^@/, "")}`
      : "Vídeo encontrado";

  const temImagem =
    Boolean(
      p.thumbnail_url ||
      p.image_url
    );

  const imagem =
    p.thumbnail_url ||
    p.image_url ||
    "";

  const assistir =
    Boolean(p.watch_url);

  const produto =
    Boolean(p.product_url);

  return `
    <article
      class="product-card video-card"
      data-id="${escapar(p.id)}"
    >
      <div class="product-image-wrap">

        ${
          temImagem
            ? `
              <img
                src="${escapar(imagem)}"
                alt="Vídeo em alta"
                loading="lazy"
                onerror="
                  this.style.display='none';
                  if(this.nextElementSibling){
                    this.nextElementSibling.style.display='flex';
                  }
                "
              >

              <div
                style="
                  display:none;
                  width:100%;
                  aspect-ratio:1/1;
                  align-items:center;
                  justify-content:center;
                  flex-direction:column;
                  gap:7px;
                  background:
                    radial-gradient(
                      circle at center,
                      #1c202b,
                      #0d1017
                    );
                "
              >
                <span
                  style="
                    font-size:40px;
                  "
                >
                  🎬
                </span>

                <small
                  style="
                    color:#777f8f;
                    font-size:9px;
                  "
                >
                  VÍDEO ENCONTRADO
                </small>
              </div>
            `
            : `
              <div
                style="
                  display:flex;
                  width:100%;
                  aspect-ratio:1/1;
                  align-items:center;
                  justify-content:center;
                  flex-direction:column;
                  gap:7px;
                  background:
                    radial-gradient(
                      circle at center,
                      #1c202b,
                      #0d1017
                    );
                "
              >
                <span
                  style="
                    font-size:40px;
                  "
                >
                  🎬
                </span>

                <small
                  style="
                    color:#777f8f;
                    font-size:9px;
                  "
                >
                  VÍDEO ENCONTRADO
                </small>
              </div>
            `
        }

        <div
          class="product-badge"
          style="
            position:absolute;
            left:9px;
            top:9px;
            z-index:3;
          "
        >
          ${escapar(top)}
        </div>

      </div>

      <div class="product-info">

        <div
          style="
            color:#ff6530;
            font-size:9px;
            font-weight:800;
            line-height:1.2;
            margin-bottom:6px;
          "
        >
          ${escapar(
            p.trend_label ||
            "📈 Vídeo descoberto"
          )}
        </div>

        <h3
          class="product-name"
          style="
            margin-bottom:5px;
          "
        >
          Vídeo em alta
        </h3>

        <div class="product-shop">
          ${escapar(canal)}
        </div>

        <div class="radar-mini-grid">

          <div class="radar-mini-box">
            <small>
              SCORE DO RADAR
            </small>

            <strong>
              ${score}/100
            </strong>
          </div>

          <div class="radar-mini-box">
            <small>
              PRODUTO
            </small>

            <strong>
              ${
                p.has_product
                  ? "✓"
                  : "—"
              }
            </strong>
          </div>

        </div>

        <div
          style="
            display:grid;
            grid-template-columns:1fr;
            gap:7px;
            margin-top:10px;
          "
        >

          ${
            assistir
              ? `
                <a
                  href="${escapar(
                    p.watch_url
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-video-action
                  style="
                    display:block;
                    width:100%;
                    box-sizing:border-box;
                    text-align:center;
                    text-decoration:none;
                    background:#ff5b25;
                    color:#fff;
                    padding:10px 8px;
                    border-radius:9px;
                    font-size:10px;
                    font-weight:900;
                  "
                >
                  ▶ VER VÍDEO
                </a>
              `
              : `
                <button
                  type="button"
                  disabled
                  style="
                    width:100%;
                    border:0;
                    background:#20232c;
                    color:#747b89;
                    padding:10px 8px;
                    border-radius:9px;
                    font-size:10px;
                    font-weight:800;
                  "
                >
                  VÍDEO INDISPONÍVEL
                </button>
              `
          }

          ${
            produto
              ? `
                <a
                  href="${escapar(
                    p.product_url
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-video-action
                  style="
                    display:block;
                    width:100%;
                    box-sizing:border-box;
                    text-align:center;
                    text-decoration:none;
                    background:#11151e;
                    color:#fff;
                    border:1px solid rgba(255,255,255,.10);
                    padding:10px 8px;
                    border-radius:9px;
                    font-size:10px;
                    font-weight:900;
                  "
                >
                  🛒 VER PRODUTO
                </a>
              `
              : ""
          }

        </div>

      </div>
    </article>
  `;
}

// ======================================================
// CARD ZERO VENDAS
// ======================================================

function criarCardZero(p) {
  const favorito =
    estaFavoritado(p.id);

  const visto =
    numeroSeguro(
      p.times_seen
    );

  const rank =
    numeroSeguro(
      p.rank_atual
    );

  return `
    <article
      class="product-card"
      data-id="${escapar(p.id)}"
    >
      <div class="product-image-wrap">

        ${
          p.image_url
            ? `
              <img
                src="${escapar(
                  p.image_url
                )}"
                alt="${escapar(
                  p.name
                )}"
                loading="lazy"
              >
            `
            : `
              <div
                style="
                  width:100%;
                  aspect-ratio:1/1;
                  background:#11151f;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:38px;
                "
              >
                🛒
              </div>
            `
        }

        <div class="product-badge">
          0 VENDAS
        </div>

        <button
          type="button"
          class="favorite-btn ${
            favorito
              ? "active"
              : ""
          }"
          data-favorite-id="${escapar(
            p.id
          )}"
        >
          ${
            favorito
              ? "♥"
              : "♡"
          }
        </button>

      </div>

      <div class="product-info">

        <h3 class="product-name">
          ${escapar(p.name)}
        </h3>

        <div class="product-shop">
          ${escapar(
            p.shop_name
          )}
        </div>

        <div class="product-stats">

          <div class="product-stat">
            <span>
              VISTO PELO RADAR
            </span>

            <strong>
              ${formatarNumero(
                visto
              )}x
            </strong>
          </div>

          <div class="product-stat">
            <span>
              POSIÇÃO
            </span>

            <strong>
              ${
                rank > 0
                  ? "#" + rank
                  : "—"
              }
            </strong>
          </div>

        </div>

        <div
          style="
            margin-top:10px;
            padding:10px;
            border-radius:9px;
            background:#11151f;
            font-size:10px;
            line-height:1.4;
          "
        >
          ${escapar(
            p.estrategia_rotulo
          )}
        </div>

        <div class="product-footer">

          <div>
            <small>
              PRODUTO
            </small>
            <strong>
              SHOPEE
            </strong>
          </div>

          <div class="product-price">
            <small>
              PREÇO
            </small>

            <strong>
              ${dinheiro(
                p.price
              )}
            </strong>
          </div>

        </div>

      </div>
    </article>
  `;
}

// ======================================================
// CARD MOMENTUM
// ======================================================

function criarCardMomentum(p) {
  const favorito =
    estaFavoritado(p.id);

  const score =
    Math.round(
      numeroSeguro(
        p.momentum_score
      )
    );

  const trend =
    Math.round(
      numeroSeguro(
        p.trend_score
      )
    );

  const vendas =
    numeroSeguro(
      p.vendas_confirmadas_24h
    );

  const posicao =
    numeroSeguro(
      p.momentum_posicao
    );

  return `
    <article
      class="product-card"
      data-id="${escapar(p.id)}"
    >

      <div class="product-image-wrap">

        ${
          p.image_url
            ? `
              <img
                src="${escapar(
                  p.image_url
                )}"
                alt="${escapar(
                  p.name
                )}"
                loading="lazy"
              >
            `
            : `
              <div
                style="
                  width:100%;
                  aspect-ratio:1/1;
                  background:#11151f;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:38px;
                "
              >
                📡
              </div>
            `
        }

        <div class="product-badge">
          ${
            posicao > 0
              ? `TOP ${Math.round(
                  posicao
                )}`
              : escapar(
                  p.momentum_rotulo
                )
          }
        </div>

        <button
          type="button"
          class="favorite-btn ${
            favorito
              ? "active"
              : ""
          }"
          data-favorite-id="${escapar(
            p.id
          )}"
        >
          ${
            favorito
              ? "♥"
              : "♡"
          }
        </button>

      </div>

      <div class="product-info">

        <h3 class="product-name">
          ${escapar(
            p.name
          )}
        </h3>

        <div class="product-shop">
          ${escapar(
            p.shop_name
          )}
        </div>

        <div class="product-stats">

          <div class="product-stat">
            <span>
              FORÇA AGORA
            </span>

            <strong>
              ${score}/100
            </strong>
          </div>

          <div class="product-stat">
            <span>
              TENDÊNCIA
            </span>

            <strong>
              ${trend}/100
            </strong>
          </div>

          <div class="product-stat">
            <span>
              VENDAS DETECTADAS
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

          <div class="product-stat">
            <span>
              VISTO PELO RADAR
            </span>

            <strong>
              ${formatarNumero(
                p.capturas_24h
              )}x
            </strong>
          </div>

        </div>

        <div class="product-footer">

          <div>
            <small>
              PRODUTO
            </small>
            <strong>
              SHOPEE
            </strong>
          </div>

          <div class="product-price">
            <small>
              PREÇO
            </small>

            <strong>
              ${dinheiro(
                p.price
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

function criarCardRanking(p) {
  const favorito =
    estaFavoritado(p.id);

  return `
    <article
      class="product-card"
      data-id="${escapar(p.id)}"
    >

      <div class="product-image-wrap">

        ${
          p.image_url
            ? `
              <img
                src="${escapar(
                  p.image_url
                )}"
                alt="${escapar(
                  p.name
                )}"
                loading="lazy"
              >
            `
            : `
              <div
                style="
                  width:100%;
                  aspect-ratio:1/1;
                  background:#11151f;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:38px;
                "
              >
                🔥
              </div>
            `
        }

        <button
          type="button"
          class="favorite-btn ${
            favorito
              ? "active"
              : ""
          }"
          data-favorite-id="${escapar(
            p.id
          )}"
        >
          ${
            favorito
              ? "♥"
              : "♡"
          }
        </button>

      </div>

      <div class="product-info">

        <h3 class="product-name">
          ${escapar(
            p.name
          )}
        </h3>

        <div class="product-shop">
          ${escapar(
            p.shop_name
          )}
        </div>

        <div class="product-stats">

          <div class="product-stat">
            <span>
              VENDAS
            </span>

            <strong>
              ${formatarNumero(
                p.sold_count
              )}
            </strong>
          </div>

          <div class="product-stat">
            <span>
              AVALIAÇÃO
            </span>

            <strong>
              ${numeroSeguro(
                p.rating
              ).toFixed(1)}
            </strong>
          </div>

        </div>

        <div class="product-footer">

          <div>
            <small>
              PRODUTO
            </small>
            <strong>
              SHOPEE
            </strong>
          </div>

          <div class="product-price">
            <small>
              PREÇO
            </small>

            <strong>
              ${dinheiro(
                p.price
              )}
            </strong>
          </div>

        </div>

      </div>
    </article>
  `;
}

// ======================================================
// RENDERIZAÇÃO
// ======================================================

function renderizarProdutos(lista) {
  if (!productsGrid) {
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

      if (titulo) {
        titulo.textContent =
          filtroAtual ===
          "videos"
            ? "Nenhum vídeo encontrado"
            : "Nenhum produto encontrado";
      }

      if (texto) {
        texto.textContent =
          filtroAtual ===
          "videos"
            ? "O Radar ainda não encontrou vídeos para esse filtro."
            : "Tente mudar sua pesquisa ou filtro.";
      }
    }

    return;
  }

  if (emptyState) {
    emptyState.hidden =
      true;
  }

  productsGrid.innerHTML =
    listaUnica
      .map(
        p => {
          if (
            p.tipo ===
            "video"
          ) {
            return criarCardVideo(
              p
            );
          }

          if (
            p.tipo ===
            "zero"
          ) {
            return criarCardZero(
              p
            );
          }

          if (
            p.tipo ===
            "momentum"
          ) {
            return criarCardMomentum(
              p
            );
          }

          return criarCardRanking(
            p
          );
        }
      )
      .join("");

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
          e => {
            if (
              e.target.closest(
                ".favorite-btn"
              ) ||
              e.target.closest(
                "[data-video-action]"
              )
            ) {
              return;
            }

            const p =
              encontrarProduto(
                card.dataset.id
              );

            if (p) {
              abrirModal(p);
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
          e => {
            e.preventDefault();
            e.stopPropagation();

            alternarFavorito(
              botao.dataset
                .favoriteId
            );
          }
        );
      }
    );

  document
    .querySelectorAll(
      "[data-video-action]"
    )
    .forEach(
      link => {
        link.addEventListener(
          "click",
          e => {
            e.stopPropagation();
          }
        );
      }
    );
}

// ======================================================
// MODAL
// ======================================================

function abrirModal(p) {
  if (
    !productModal ||
    !modalBody
  ) {
    return;
  }

  // ----------------------------
  // MODAL DE VÍDEO
  // ----------------------------

  if (
    p.tipo === "video"
  ) {
    const canal =
      p.source_channel
        ? `@${String(
            p.source_channel
          ).replace(/^@/, "")}`
        : "Vídeo encontrado";

    modalBody.innerHTML = `
      <div>

        <h2>
          🎬 ${
            numeroSeguro(
              p.top
            ) > 0
              ? `TOP ${Math.round(
                  p.top
                )}`
              : "Vídeo em Alta"
          }
        </h2>

        <p
          style="
            color:#9299a8;
            margin-top:7px;
          "
        >
          ${escapar(canal)}
        </p>

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
            Score:
            <strong>
              ${Math.round(
                numeroSeguro(
                  p.trend_score
                )
              )}/100
            </strong>
          </p>

          <p>
            Sinal:
            <strong>
              ${escapar(
                p.trend_label
              )}
            </strong>
          </p>

          <p>
            Produto associado:
            <strong>
              ${
                p.has_product
                  ? "Sim"
                  : "Não identificado"
              }
            </strong>
          </p>

          ${
            p.metrics_verified
              ? `
                <p>
                  Visualizações:
                  <strong>
                    ${formatarNumero(
                      p.views
                    )}
                  </strong>
                </p>

                <p>
                  Curtidas:
                  <strong>
                    ${formatarNumero(
                      p.likes
                    )}
                  </strong>
                </p>

                <p>
                  Comentários:
                  <strong>
                    ${formatarNumero(
                      p.comments
                    )}
                  </strong>
                </p>
              `
              : `
                <p
                  style="
                    color:#7f8796;
                    font-size:11px;
                    line-height:1.45;
                  "
                >
                  Métricas públicas não
                  verificadas. O Radar não
                  inventa visualizações,
                  curtidas ou vendas.
                </p>
              `
          }

        </div>

        <div
          style="
            display:grid;
            grid-template-columns:1fr;
            gap:8px;
            margin-top:14px;
          "
        >

          ${
            p.watch_url
              ? `
                <a
                  href="${escapar(
                    p.watch_url
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="
                    display:block;
                    text-align:center;
                    text-decoration:none;
                    background:#ff5b25;
                    color:white;
                    padding:13px;
                    border-radius:10px;
                    font-weight:900;
                  "
                >
                  ▶ VER VÍDEO
                </a>
              `
              : ""
          }

          ${
            p.product_url
              ? `
                <a
                  href="${escapar(
                    p.product_url
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="
                    display:block;
                    text-align:center;
                    text-decoration:none;
                    background:#171b24;
                    color:white;
                    border:1px solid rgba(255,255,255,.1);
                    padding:13px;
                    border-radius:10px;
                    font-weight:900;
                  "
                >
                  🛒 VER PRODUTO
                </a>
              `
              : ""
          }

        </div>

      </div>
    `;

    productModal.hidden =
      false;

    document.body.style
      .overflow =
      "hidden";

    return;
  }

  // ----------------------------
  // MODAL DOS PRODUTOS
  // ----------------------------

  const link =
    p.affiliate_url ||
    p.product_url ||
    "";

  let extra = "";

  if (
    p.tipo === "momentum"
  ) {
    const topNumerico =
      p.momentum_posicao > 0
        ? Math.round(
            p.momentum_posicao
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
              p.momentum_score
            )}/100
          </strong>
        </p>

        <p>
          📈 Tendência:
          <strong>
            ${escapar(
              p.trend_nivel
            )}
          </strong>
        </p>

        <p>
          📈 Força da tendência:
          <strong>
            ${Math.round(
              p.trend_score
            )}/100
          </strong>
        </p>

        <p>
          🛒 Vendas detectadas:
          <strong>
            ${
              numeroSeguro(
                p.vendas_confirmadas_24h
              ) > 0
                ? "+"
                : ""
            }${formatarNumero(
              p.vendas_confirmadas_24h
            )}
          </strong>
        </p>

        <p>
          👀 Visto pelo Radar:
          <strong>
            ${formatarNumero(
              p.capturas_24h
            )} vezes
          </strong>
        </p>

        <p>
          📊 Posição encontrada:
          <strong>
            ${
              p.rank_atual > 0
                ? "#" +
                  p.rank_atual
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

      </div>
    `;
  }

  if (
    p.tipo === "zero"
  ) {
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
          🎯 Estratégia Zero Vendas
        </strong>

        <p>
          ${escapar(
            p.estrategia_rotulo
          )}
        </p>

        <p>
          ${escapar(
            p.motivo
          )}
        </p>

        <p>
          Visto pelo Radar:
          <strong>
            ${formatarNumero(
              p.times_seen
            )} vezes
          </strong>
        </p>

      </div>
    `;
  }

  modalBody.innerHTML = `
    <div>

      ${
        p.image_url
          ? `
            <img
              src="${escapar(
                p.image_url
              )}"
              alt="${escapar(
                p.name
              )}"
              style="
                width:100%;
                max-height:320px;
                object-fit:contain;
                border-radius:12px;
                background:#11151f;
              "
            >
          `
          : ""
      }

      <h2
        style="
          margin-top:14px;
        "
      >
        ${escapar(
          p.name
        )}
      </h2>

      <p
        style="
          color:#9299a8;
        "
      >
        ${escapar(
          p.shop_name
        )}
      </p>

      <h3>
        ${dinheiro(
          p.price
        )}
      </h3>

      ${extra}

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
                text-align:center;
                text-decoration:none;
                background:#ff5b25;
                color:white;
                padding:13px;
                border-radius:10px;
                font-weight:900;
                margin-top:16px;
              "
            >
              🛒 Abrir na Shopee
            </a>
          `
          : ""
      }

    </div>
  `;

  productModal.hidden =
    false;

  document.body.style
    .overflow =
    "hidden";
}

function fecharModalProduto() {
  if (
    !productModal
  ) {
    return;
  }

  productModal.hidden =
    true;

  document.body.style
    .overflow =
    "";
}

if (
  closeModal
) {
  closeModal.addEventListener(
    "click",
    fecharModalProduto
  );
}

if (
  productModal
) {
  productModal.addEventListener(
    "click",
    e => {
      if (
        e.target ===
        productModal
      ) {
        fecharModalProduto();
      }
    }
  );
}

document.addEventListener(
  "keydown",
  e => {
    if (
      e.key ===
      "Escape"
    ) {
      fecharModalProduto();
    }
  }
);

// ======================================================
// FILTROS PRINCIPAIS
// ======================================================

function trocarFiltro(
  novoFiltro
) {
  filtroAtual =
    novoFiltro ||
    "radar";

  modoFavoritos =
    false;

  produtos = [];

  paginaAtual = 1;

  temProximaPagina =
    true;

  totalServidor = 0;

  resumoServidor = {};

  document
    .querySelectorAll(
      "[data-filter]"
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

  carregarProdutos(
    1,
    false
  );
}

document
  .querySelectorAll(
    "[data-filter]"
  )
  .forEach(
    botao => {
      botao.addEventListener(
        "click",
        () => {
          const filtro =
            botao.dataset.filter;

          if (!filtro) {
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
// BARRA INFERIOR
// TROCA FAVORITOS POR VÍDEOS
// ======================================================

(function configurarBotaoVideos() {
  /*
    Primeiro procuramos o botão de
    Favoritos que já existe no HTML.

    Em vez de criar uma quinta opção,
    reaproveitamos exatamente o espaço
    dele para Vídeos.
  */

  let botao =
    document.querySelector(
      '[data-action="favorites"]'
    ) ||
    document.getElementById(
      "favoritesButton"
    );

  /*
    Alguns HTMLs não usam id/data-action.
    Nesse caso procuramos pelo texto.
  */
  if (!botao) {
    const candidatos =
      Array.from(
        document.querySelectorAll(
          "button, a, .nav-item, .bottom-nav-item"
        )
      );

    botao =
      candidatos.find(
        el =>
          normalizarTexto(
            el.textContent
          ).includes(
            "favoritos"
          )
      ) || null;
  }

  if (!botao) {
    return;
  }

  /*
    Remove comportamento antigo
    relacionado a favoritos.
  */
  botao.removeAttribute(
    "data-action"
  );

  botao.removeAttribute(
    "href"
  );

  botao.dataset.filter =
    "videos";

  /*
    Mantém a estrutura visual do botão
    quando existe ícone + texto.
  */
  const spans =
    botao.querySelectorAll(
      "span"
    );

  const labels =
    botao.querySelectorAll(
      ".label, .nav-label, small"
    );

  if (
    labels.length
  ) {
    labels[
      labels.length - 1
    ].textContent =
      "Vídeos";

    const primeiro =
      spans[0];

    if (
      primeiro &&
      (
        primeiro.textContent.includes(
          "♡"
        ) ||
        primeiro.textContent.includes(
          "♥"
        )
      )
    ) {
      primeiro.textContent =
        "🎬";
    }
  } else if (
    spans.length >= 2
  ) {
    spans[0].textContent =
      "🎬";

    spans[
      spans.length - 1
    ].textContent =
      "Vídeos";
  } else {
    botao.innerHTML =
      `
        <span
          style="
            display:block;
            font-size:25px;
            line-height:1;
          "
        >
          🎬
        </span>

        <span>
          Vídeos
        </span>
      `;
  }

  /*
    Clone remove event listeners antigos
    que possam ter sido ligados ao botão
    de Favoritos antes desta conversão.
  */
  const novoBotao =
    botao.cloneNode(true);

  botao.replaceWith(
    novoBotao
  );

  novoBotao.addEventListener(
    "click",
    e => {
      e.preventDefault();

      trocarFiltro(
        "videos"
      );
    }
  );
})();

// ======================================================
// REMOVE A ABA EXTRA DE VÍDEOS
// ======================================================

(function removerVideoExtra() {
  /*
    A versão anterior criou uma quinta
    opção de Vídeos fora da barra.

    Se ela ainda estiver no HTML/DOM,
    removemos e mantemos somente o botão
    que substituiu Favoritos.
  */

  const botoes =
    Array.from(
      document.querySelectorAll(
        '[data-filter="videos"]'
      )
    );

  if (
    botoes.length <= 1
  ) {
    return;
  }

  /*
    Mantemos preferencialmente o botão
    que está dentro da navegação inferior.
  */
  let manter =
    botoes.find(
      el =>
        el.closest(
          "nav, .bottom-nav, .mobile-nav, footer"
        )
    );

  if (!manter) {
    manter =
      botoes[0];
  }

  botoes.forEach(
    el => {
      if (
        el !== manter
      ) {
        el.remove();
      }
    }
  );
})();

// ======================================================
// BUSCA
// ======================================================

let timerBusca =
  null;

if (
  searchInput
) {
  searchInput.addEventListener(
    "input",
    () => {
      clearTimeout(
        timerBusca
      );

      timerBusca =
        setTimeout(
          () => {
            buscaDigitada =
              searchInput.value
                .trim();

            if (
              filtroAtual ===
              "zero"
            ) {
              produtos = [];

              paginaAtual = 1;

              temProximaPagina =
                true;

              carregarProdutos(
                1,
                false
              );

              return;
            }

            aplicarOrdenacao();
          },
          300
        );
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
        categoryFilter.value ||
        "all";

      aplicarOrdenacao();
    }
  );
}

// ======================================================
// ORDENAÇÃO SELECT
// ======================================================

const sortSelect =
  document.getElementById(
    "sortSelect"
  ) ||
  document.getElementById(
    "sortFilter"
  );

if (
  sortSelect
) {
  sortSelect.addEventListener(
    "change",
    () => {
      ordenacaoAtual =
        sortSelect.value ||
        "relevance";

      if (
        filtroAtual ===
        "zero"
      ) {
        produtos = [];

        paginaAtual = 1;

        temProximaPagina =
          true;

        carregarProdutos(
          1,
          false
        );

        return;
      }

      aplicarOrdenacao();
    }
  );
}

// ======================================================
// SCROLL INFINITO
// ======================================================

let scrollTimer =
  null;

window.addEventListener(
  "scroll",
  () => {
    clearTimeout(
      scrollTimer
    );

    scrollTimer =
      setTimeout(
        () => {
          if (
            carregando ||
            modoFavoritos ||
            !temProximaPagina
          ) {
            return;
          }

          const distanciaDoFim =
            document.documentElement
              .scrollHeight -
            (
              window.scrollY +
              window.innerHeight
            );

          if (
            distanciaDoFim <
            900
          ) {
            carregarProdutos(
              paginaAtual + 1,
              true
            );
          }
        },
        100
      );
  },
  {
    passive: true
  }
);

// ======================================================
// AUTO ATUALIZAÇÃO
// ======================================================

const INTERVALO_ATUALIZACAO =
  5 * 60 * 1000;

setInterval(
  () => {
    if (
      document.hidden ||
      carregando ||
      modoFavoritos
    ) {
      return;
    }

    produtos = [];

    paginaAtual = 1;

    temProximaPagina =
      true;

    carregarProdutos(
      1,
      false
    );
  },
  INTERVALO_ATUALIZACAO
);

// ======================================================
// VOLTAR PARA ABA DO NAVEGADOR
// ======================================================

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.hidden ||
      carregando ||
      modoFavoritos
    ) {
      return;
    }

    produtos = [];

    paginaAtual = 1;

    temProximaPagina =
      true;

    carregarProdutos(
      1,
      false
    );
  }
);

// ======================================================
// INICIALIZAÇÃO
// ======================================================

async function iniciarShopeeRadar() {
  if (
    !obterTokenRadar()
  ) {
    redirecionarLogin();
    return;
  }

  atualizarInterfaceModo();

  await carregarProdutos(
    1,
    false
  );
}

iniciarShopeeRadar();
