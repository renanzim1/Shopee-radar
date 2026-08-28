// ======================================================
// SHOPEE RADAR — APP.JS FINAL
// PARTE 1/3
// RADAR + ESTATÍSTICAS + PACKS
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

const PACKS_API =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-videos";

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

let buscaDigitada = "";

let nichoAtual = "all";

let totalServidor = 0;

let resumoServidor = {};


// ======================================================
// TOKEN / AUTENTICAÇÃO
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

  return {

    Accept:
      "application/json",

    Authorization:
      `Bearer ${obterTokenRadar()}`

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
// UTILITÁRIOS
// ======================================================

function numeroSeguro(valor) {

  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;

}


function formatarNumero(valor) {

  return numeroSeguro(valor)
    .toLocaleString(
      "pt-BR"
    );

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
    valor || ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();

}


function dataBonita(valor) {

  if (!valor) {
    return "Agora";
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return "Agora";
  }

  return data.toLocaleString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}


// ======================================================
// MAPA DE NICHOS
// ======================================================

const MAPA_NICHOS = {

  moda: [
    "vestido",
    "blusa",
    "camisa",
    "camiseta",
    "calça",
    "calca",
    "short",
    "saia",
    "conjunto",
    "roupa",
    "moda",
    "bolsa",
    "sandalia",
    "sandália",
    "tenis",
    "tênis",
    "sapato",
    "chinelo",
    "jaqueta",
    "moletom"
  ],

  casa: [
    "casa",
    "lar",
    "lençol",
    "lencol",
    "fronha",
    "cama",
    "banho",
    "toalha",
    "tapete",
    "cortina",
    "organizador",
    "decoração",
    "decoracao",
    "almofada",
    "travesseiro",
    "manta"
  ],

  cozinha: [
    "cozinha",
    "panela",
    "frigideira",
    "air fryer",
    "airfryer",
    "forma",
    "assadeira",
    "copo",
    "garrafa",
    "pote",
    "talher",
    "faca",
    "prato",
    "caneca",
    "liquidificador",
    "batedeira"
  ],

  beleza: [
    "beleza",
    "maquiagem",
    "batom",
    "base",
    "perfume",
    "creme",
    "cabelo",
    "shampoo",
    "condicionador",
    "escova",
    "secador",
    "chapinha",
    "unha",
    "esmalte"
  ],

  eletronicos: [
    "eletronico",
    "eletrônico",
    "fone",
    "headset",
    "caixa de som",
    "bluetooth",
    "smartwatch",
    "relógio",
    "relogio",
    "camera",
    "câmera",
    "tv",
    "televisão",
    "televisao"
  ],

  informatica: [
    "computador",
    "notebook",
    "pc",
    "mouse",
    "teclado",
    "monitor",
    "ssd",
    "memoria",
    "memória",
    "gabinete",
    "webcam",
    "informatica",
    "informática"
  ],

  celular: [
    "celular",
    "smartphone",
    "iphone",
    "android",
    "capa",
    "pelicula",
    "película",
    "carregador",
    "cabo usb",
    "power bank"
  ],

  games: [
    "game",
    "gamer",
    "controle",
    "joystick",
    "console",
    "playstation",
    "xbox",
    "nintendo",
    "switch",
    "rgb"
  ],

  fitness: [
    "fitness",
    "academia",
    "halter",
    "peso",
    "treino",
    "elastico",
    "elástico",
    "legging",
    "top fitness",
    "garrafa",
    "musculação",
    "musculacao"
  ],

  pet: [
    "pet",
    "cachorro",
    "gato",
    "ração",
    "racao",
    "coleira",
    "brinquedo pet",
    "comedouro",
    "bebedouro",
    "areia gato"
  ],

  bebe: [
    "bebe",
    "bebê",
    "infantil",
    "fralda",
    "mamadeira",
    "chupeta",
    "berço",
    "berco",
    "carrinho bebê",
    "carrinho bebe",
    "maternidade"
  ],

  automotivo: [
    "carro",
    "moto",
    "automotivo",
    "veicular",
    "capacete",
    "suporte celular",
    "tapete carro",
    "limpeza automotiva",
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
  ],

  papelaria: [
    "papelaria",
    "caneta",
    "caderno",
    "lapis",
    "lápis",
    "estojo",
    "marca texto",
    "planner",
    "agenda",
    "papel",
    "adesivo"
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

  // Packs não dependem
  // do filtro de nicho.
  if (
    produto.tipo === "pack"
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
    palavra =>
      texto.includes(
        normalizarTexto(
          palavra
        )
      )
  );

}


// ======================================================
// NORMALIZAÇÃO — MOMENTUM
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
// NORMALIZAÇÃO — PRODUTOS ZERO
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
// NORMALIZAÇÃO — RANKING
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
// NORMALIZAÇÃO — PACKS
// ======================================================

function normalizarPack(v) {

  const partes =
    String(
      v.shopee_video_id || ""
    ).split(":");

  const canal =
    String(
      v.source_channel ||
      partes[1] ||
      ""
    ).replace(
      /^@/,
      ""
    );

  const post =
    String(
      v.source_post_id ||
      partes[2] ||
      ""
    );

  // O Pack abre somente
  // a publicação original.
  const sourceUrl =
    v.source_url ||
    (
      v.source_platform ===
        "telegram" &&
      canal &&
      post

        ? `https://t.me/${canal}/${post}`

        : ""
    );

  return {

    id:
      String(
        v.id ??
        v.shopee_video_id ??
        ""
      ),

    tipo:
      "pack",

    name:
      v.description?.trim() ||
      "Pack de vídeos para afiliados",

    description:
      v.description ?? "",

    thumbnail_url:
      v.thumbnail_url ?? "",

    image_url:
      v.thumbnail_url ?? "",

    source_url:
      sourceUrl,

    pack_url:
      sourceUrl,

    source_channel:
      canal,

    source_platform:
      v.source_platform ??
      "telegram",

    shop_name:
      canal
        ? `@${canal}`
        : "Pack para afiliados",

    ultima_captura:
      v.published_at ??
      v.created_at ??
      null

  };

}


// ======================================================
// REMOVER DUPLICADOS
// ======================================================

function removerDuplicados(lista) {

  const mapa =
    new Map();

  for (
    const item of lista
  ) {

    if (
      !item ||
      !item.id
    ) {
      continue;
    }

    const id =
      String(
        item.id
      );

    if (
      !mapa.has(id)
    ) {

      mapa.set(
        id,
        item
      );

    }

  }

  return [
    ...mapa.values()
  ];

}
// ======================================================
// SHOPEE RADAR — APP.JS FINAL
// PARTE 2/3
// API + CONTADORES + FILTROS + CARDS
// ======================================================


// ======================================================
// MONTAR URL DA API
// ======================================================

function montarURL(pagina) {

  // ----------------------
  // PACKS
  // ----------------------

  if (
    filtroAtual === "packs"
  ) {

    const url =
      new URL(
        PACKS_API
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
      url: url.toString(),
      tipo: "pack"
    };

  }


  // ----------------------
  // PRODUTOS ZERO
  // ----------------------

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
      url: url.toString(),
      tipo: "zero"
    };

  }


  // ----------------------
  // MAIS VENDIDOS /
  // AVALIAÇÃO
  // ----------------------

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


    if (
      buscaDigitada
    ) {

      url.searchParams.set(
        "q",
        buscaDigitada
      );

    }


    return {
      url: url.toString(),
      tipo: "ranking"
    };

  }


  // ----------------------
  // RADAR PRINCIPAL
  // ----------------------

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


  if (
    buscaDigitada
  ) {

    url.searchParams.set(
      "q",
      buscaDigitada
    );

  }


  let sort =
    "relevance";


  if (
    ordenacaoAtual ===
    "trend"
  ) {

    sort =
      "trend";

  }


  if (
    ordenacaoAtual ===
    "sales"
  ) {

    sort =
      "sales";

  }


  if (
    ordenacaoAtual ===
    "rating"
  ) {

    sort =
      "rating";

  }


  if (
    ordenacaoAtual ===
    "recent"
  ) {

    sort =
      "recent";

  }


  url.searchParams.set(
    "sort",
    sort
  );


  return {
    url: url.toString(),
    tipo: "momentum"
  };

}


// ======================================================
// EXTRAIR LISTA DA RESPOSTA
// ======================================================

function extrairListaResposta(
  dados,
  tipo
) {

  let lista = [];


  if (
    tipo === "pack"
  ) {

    if (
      Array.isArray(
        dados?.videos
      )
    ) {

      lista =
        dados.videos;

    } else if (
      Array.isArray(
        dados?.packs
      )
    ) {

      lista =
        dados.packs;

    } else if (
      Array.isArray(dados)
    ) {

      lista =
        dados;

    }


    return lista.map(
      normalizarPack
    );

  }


  const candidatos = [

    dados?.produtos,

    dados?.products,

    dados?.items,

    dados?.ranking,

    dados?.data,

    Array.isArray(dados)
      ? dados
      : null

  ];


  lista =
    candidatos.find(
      Array.isArray
    ) || [];


  if (
    tipo === "zero"
  ) {

    return lista.map(
      normalizarZero
    );

  }


  if (
    tipo === "ranking"
  ) {

    return lista.map(
      normalizarRanking
    );

  }


  return lista.map(
    normalizarMomentum
  );

}


// ======================================================
// TOTAL DO SERVIDOR
// ======================================================

function extrairTotalServidor(
  dados,
  quantidadeRecebida
) {

  const candidatos = [

    dados?.total,

    dados?.total_count,

    dados?.count,

    dados?.pagination?.total,

    dados?.meta?.total

  ];


  for (
    const candidato
    of candidatos
  ) {

    const numero =
      Number(candidato);


    if (
      Number.isFinite(numero)
    ) {

      return numero;

    }

  }


  /*
    Se a API não mandar total,
    mantemos o valor anterior.

    Isso impede o contador de
    voltar para 20 simplesmente
    porque a página tem 20 itens.
  */

  if (
    totalServidor > 0
  ) {

    return totalServidor;

  }


  return numeroSeguro(
    quantidadeRecebida
  );

}


// ======================================================
// RESUMO DO SERVIDOR
// ======================================================

function extrairResumoServidor(
  dados
) {

  const resumo =
    dados?.resumo ||
    dados?.summary ||
    dados?.stats ||
    dados?.estatisticas ||
    {};


  return {

    ...resumoServidor,
    ...resumo

  };

}


// ======================================================
// DESCOBRIR PRÓXIMA PÁGINA
// ======================================================

function descobrirProximaPagina(
  dados,
  quantidade
) {

  if (
    typeof dados?.has_more ===
    "boolean"
  ) {

    return dados.has_more;

  }


  if (
    typeof dados?.hasMore ===
    "boolean"
  ) {

    return dados.hasMore;

  }


  if (
    typeof dados?.pagination?.has_more ===
    "boolean"
  ) {

    return (
      dados.pagination.has_more
    );

  }


  if (
    typeof dados?.pagination?.hasNext ===
    "boolean"
  ) {

    return (
      dados.pagination.hasNext
    );

  }


  return (
    quantidade >=
    LIMITE_POR_PAGINA
  );

}


// ======================================================
// BUSCAR UMA PÁGINA
// ======================================================

async function buscarPagina(
  pagina
) {

  const configuracao =
    montarURL(
      pagina
    );


  const resposta =
    await fetch(
      configuracao.url,
      {
        method: "GET",
        headers:
          criarHeadersAPI()
      }
    );


  if (
    resposta.status === 401
  ) {

    redirecionarLogin();

    throw new Error(
      "Sessão expirada."
    );

  }


  if (
    !resposta.ok
  ) {

    let mensagem =
      `Erro ${resposta.status}`;


    try {

      const erro =
        await resposta.json();


      mensagem =
        erro?.erro ||
        erro?.error ||
        erro?.message ||
        mensagem;


    } catch (_) {}


    throw new Error(
      mensagem
    );

  }


  const dados =
    await resposta.json();


  return {
    dados,
    tipo:
      configuracao.tipo
  };

}


// ======================================================
// CONTADORES DO TOPO
// ======================================================

function atualizarContadores() {

  // ----------------------
  // PACKS
  // ----------------------

  if (
    filtroAtual === "packs"
  ) {

    if (
      totalProdutosLabel
    ) {

      totalProdutosLabel.textContent =
        "PACKS";

    }


    if (
      totalOportunidadesLabel
    ) {

      totalOportunidadesLabel.textContent =
        "CANAIS";

    }


    const canais =
      new Set(

        produtos
          .filter(
            p =>
              p.tipo === "pack"
          )
          .map(
            p =>
              p.source_channel
          )
          .filter(Boolean)

      ).size;


    if (
      totalProdutos
    ) {

      totalProdutos.textContent =
        formatarNumero(
          totalServidor ||
          produtos.length
        );

    }


    if (
      totalOportunidades
    ) {

      totalOportunidades.textContent =
        formatarNumero(
          canais
        );

    }


    if (
      totalVideos
    ) {

      totalVideos.textContent =
        formatarNumero(
          produtos.length
        );

    }


    const labelTerceiro =
      document.getElementById(
        "totalVideosLabel"
      );


    if (
      labelTerceiro
    ) {

      labelTerceiro.textContent =
        "CARREGADOS";

    }


    return;

  }


  // ----------------------
  // RADAR
  // ----------------------

  if (
    filtroAtual === "radar"
  ) {

    if (
      totalProdutosLabel
    ) {

      totalProdutosLabel.textContent =
        "NO RADAR";

    }


    if (
      totalOportunidadesLabel
    ) {

      totalOportunidadesLabel.textContent =
        "DESTAQUES";

    }


    const labelTerceiro =
      document.getElementById(
        "totalVideosLabel"
      );


    if (
      labelTerceiro
    ) {

      labelTerceiro.textContent =
        "CARREGADOS";

    }


    /*
      IMPORTANTE:

      NO RADAR não usa produtos.length.

      Ele usa o total real retornado
      pela API.
    */

    if (
      totalProdutos
    ) {

      totalProdutos.textContent =
        formatarNumero(
          totalServidor
        );

    }


    /*
      DESTAQUES usa o resumo real
      da API Momentum.

      Mantemos compatibilidade com
      nomes diferentes que possam
      existir no resumo.
    */

    const postarAgora =
      numeroSeguro(

        resumoServidor
          ?.postar_agora ??

        resumoServidor
          ?.postarAgora ??

        resumoServidor
          ?.high_opportunity

      );


    const forteCandidato =
      numeroSeguro(

        resumoServidor
          ?.forte_candidato ??

        resumoServidor
          ?.forteCandidato ??

        resumoServidor
          ?.strong_candidate

      );


    let destaques =
      postarAgora +
      forteCandidato;


    /*
      Fallback:

      caso uma resposta antiga da
      API não possua resumo, usamos
      os níveis reais do Momentum.
    */

    if (
      destaques === 0 &&
      produtos.length > 0 &&
      Object.keys(
        resumoServidor
      ).length === 0
    ) {

      destaques =
        produtos.filter(
          p => {

            if (
              p.tipo !==
              "momentum"
            ) {
              return false;
            }


            return [

              "postar_agora",

              "forte_candidato",

              "forte",

              "oportunidade"

            ].includes(

              String(
                p.momentum_nivel ||
                ""
              ).toLowerCase()

            );

          }
        ).length;

    }


    if (
      totalOportunidades
    ) {

      totalOportunidades.textContent =
        formatarNumero(
          destaques
        );

    }


    /*
      CARREGADOS é justamente
      a quantidade que já chegou
      ao navegador.
    */

    if (
      totalVideos
    ) {

      totalVideos.textContent =
        formatarNumero(
          produtos.length
        );

    }


    return;

  }


  // ----------------------
  // OUTROS MODOS
  // ----------------------

  if (
    totalProdutos
  ) {

    totalProdutos.textContent =
      formatarNumero(
        totalServidor
      );

  }


  if (
    totalOportunidades
  ) {

    totalOportunidades.textContent =
      formatarNumero(
        produtos.length
      );

  }


  if (
    totalVideos
  ) {

    totalVideos.textContent =
      formatarNumero(
        produtos.length
      );

  }

}


// ======================================================
// FILTRAGEM LOCAL
// ======================================================

function obterProdutosFiltrados() {

  let lista =
    removerDuplicados(
      produtos
    );


  const busca =
    normalizarTexto(
      buscaDigitada
    );


  if (busca) {

    lista =
      lista.filter(
        produto => {

          const texto =
            normalizarTexto(
              [
                produto.name,
                produto.shop_name,
                produto.description,
                produto.source_channel
              ].join(" ")
            );


          return texto.includes(
            busca
          );

        }
      );

  }


  if (
    filtroAtual !== "packs"
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
// ORDENAR LOCALMENTE
// ======================================================

function ordenarProdutos(
  lista
) {

  const copia =
    [...lista];


  /*
    PACKS:

    Sem ranking artificial.
    Apenas os mais recentes primeiro.
  */

  if (
    filtroAtual === "packs"
  ) {

    return copia.sort(
      (a, b) => {

        const dataA =
          new Date(
            a.ultima_captura ||
            0
          ).getTime();


        const dataB =
          new Date(
            b.ultima_captura ||
            0
          ).getTime();


        return (
          dataB -
          dataA
        );

      }
    );

  }


  if (
    filtroAtual !== "radar"
  ) {

    return copia;

  }


  switch (
    ordenacaoAtual
  ) {

    case "trend":

      return copia.sort(
        (a, b) =>
          numeroSeguro(
            b.trend_score
          ) -
          numeroSeguro(
            a.trend_score
          )
      );


    case "sales":

      return copia.sort(
        (a, b) =>
          numeroSeguro(
            b.sold_count
          ) -
          numeroSeguro(
            a.sold_count
          )
      );


    case "rating":

      return copia.sort(
        (a, b) =>
          numeroSeguro(
            b.rating
          ) -
          numeroSeguro(
            a.rating
          )
      );


    case "recent":

      return copia.sort(
        (a, b) => {

          const dataA =
            new Date(
              a.ultima_captura ||
              0
            ).getTime();


          const dataB =
            new Date(
              b.ultima_captura ||
              0
            ).getTime();


          return (
            dataB -
            dataA
          );

        }
      );


    case "relevance":
    default:

      return copia.sort(
        (a, b) => {

          /*
            Relevância real do Radar:
            Momentum primeiro.
          */

          const momentum =
            numeroSeguro(
              b.momentum_score
            ) -
            numeroSeguro(
              a.momentum_score
            );


          if (
            momentum !== 0
          ) {

            return momentum;

          }


          return (
            numeroSeguro(
              b.trend_score
            ) -
            numeroSeguro(
              a.trend_score
            )
          );

        }
      );

  }

}


// ======================================================
// CARD MOMENTUM — RADAR PRINCIPAL
// ======================================================

function criarCardMomentum(
  p
) {

  const topNumerico =
    p.momentum_posicao > 0
      ? Math.round(
          p.momentum_posicao
        )
      : null;


  const badge =
    p.momentum_rotulo ||
    "👀 OBSERVAR";


  const vendasAgora =
    numeroSeguro(
      p.vendas_confirmadas_24h
    );


  return `
    <article
      class="product-card"
      data-id="${escapar(p.id)}"
    >

      <div
        class="product-image-wrap"
      >

        ${
          p.image_url
            ? `
              <img
                class="product-image"
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
                class="product-image"
                style="
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:42px;
                  background:#fff;
                "
              >
                🛍️
              </div>
            `
        }

      </div>


      <div
        class="product-info"
      >

        <div
          class="product-card-top"
        >

          <span
            class="opportunity-badge"
          >
            ${escapar(
              badge
            )}
          </span>


          ${
            topNumerico
              ? `
                <span
                  class="score-badge"
                >
                  #${topNumerico}
                </span>
              `
              : ""
          }

        </div>


        <h3
          class="product-name"
        >
          ${escapar(
            p.name
          )}
        </h3>


        <div
          class="product-shop"
        >
          ${escapar(
            p.shop_name
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
                p.sold_count
              )}
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              VENDAS AGORA
            </span>

            <strong>
              ${
                vendasAgora > 0
                  ? "+"
                  : ""
              }${formatarNumero(
                vendasAgora
              )}
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              VISTO NO RADAR
            </span>

            <strong>
              ${formatarNumero(
                p.capturas_24h
              )}x
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              FORÇA AGORA
            </span>

            <strong>
              ${Math.round(
                p.momentum_score
              )}/100
            </strong>

          </div>

        </div>


        <div
          class="product-footer"
        >

          <div>

            <small>
              TENDÊNCIA
            </small>

            <strong>
              ${Math.round(
                p.trend_score
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
// CARD PRODUTO ZERO
// ======================================================

function criarCardZero(
  p
) {

  return `
    <article
      class="product-card"
      data-id="${escapar(p.id)}"
    >

      <div
        class="product-image-wrap"
      >

        ${
          p.image_url
            ? `
              <img
                class="product-image"
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
                class="product-image"
                style="
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:42px;
                  background:#fff;
                "
              >
                🎯
              </div>
            `
        }

      </div>


      <div
        class="product-info"
      >

        <div
          class="product-card-top"
        >

          <span
            class="opportunity-badge"
          >
            🎯 ENTRAR CEDO
          </span>

        </div>


        <h3
          class="product-name"
        >
          ${escapar(
            p.name
          )}
        </h3>


        <div
          class="product-shop"
        >
          ${escapar(
            p.shop_name
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
              0
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              VISTO
            </span>

            <strong>
              ${formatarNumero(
                p.times_seen
              )}x
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              POSIÇÃO
            </span>

            <strong>
              ${
                p.rank_atual > 0
                  ? `#${Math.round(
                      p.rank_atual
                    )}`
                  : "—"
              }
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              AVALIAÇÃO
            </span>

            <strong>
              ${
                p.rating > 0
                  ? p.rating.toFixed(1)
                  : "—"
              }
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
              RANQUEAR
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

function criarCardRanking(
  p
) {

  return `
    <article
      class="product-card"
      data-id="${escapar(p.id)}"
    >

      <div
        class="product-image-wrap"
      >

        ${
          p.image_url
            ? `
              <img
                class="product-image"
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
                class="product-image"
                style="
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-size:42px;
                  background:#fff;
                "
              >
                🔥
              </div>
            `
        }

      </div>


      <div
        class="product-info"
      >

        <div
          class="product-card-top"
        >

          <span
            class="opportunity-badge"
          >
            ${
              filtroAtual ===
              "rating"
                ? "⭐ BEM AVALIADO"
                : "🔥 MAIS VENDIDO"
            }
          </span>

        </div>


        <h3
          class="product-name"
        >
          ${escapar(
            p.name
          )}
        </h3>


        <div
          class="product-shop"
        >
          ${escapar(
            p.shop_name
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
                p.sold_count
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
              ${
                p.rating > 0
                  ? p.rating.toFixed(1)
                  : "—"
              }
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
// CARD PACK
// ======================================================

function criarCardPack(
  p
) {

  const canal =
    p.source_channel
      ? `@${p.source_channel}`
      : "Fonte pública";


  return `
    <article
      class="pack-card"
      data-id="${escapar(p.id)}"
    >

      <div
        class="pack-media"
      >

        ${
          p.thumbnail_url
            ? `
              <img
                src="${escapar(
                  p.thumbnail_url
                )}"
                alt="Pack para afiliados"
                loading="lazy"
                referrerpolicy="no-referrer"
                onerror="
                  this.style.display='none';
                  this.nextElementSibling.style.display='flex';
                "
              >

              <div
                class="pack-placeholder"
                style="display:none;"
              >

                <span
                  class="pack-placeholder-icon"
                >
                  📦
                </span>

                <span>
                  PACK PARA AFILIADOS
                </span>

              </div>
            `
            : `
              <div
                class="pack-placeholder"
              >

                <span
                  class="pack-placeholder-icon"
                >
                  📦
                </span>

                <span>
                  PACK PARA AFILIADOS
                </span>

              </div>
            `
        }


        <span
          class="pack-badge"
        >
          📦 PACK ENCONTRADO
        </span>

      </div>


      <div
        class="pack-content"
      >

        <div
          class="pack-label"
        >
          MATERIAL PARA AFILIADOS
        </div>


        <h3
          class="pack-title"
        >
          ${escapar(
            p.name
          )}
        </h3>


        <div
          class="pack-channel"
        >
          ${escapar(
            canal
          )}
        </div>


        <div
          class="pack-info-grid"
        >

          <div
            class="pack-info"
          >

            <small>
              ORIGEM
            </small>

            <strong>
              ${
                p.source_platform ===
                "telegram"
                  ? "Telegram"
                  : escapar(
                      p.source_platform ||
                      "Pública"
                    )
              }
            </strong>

          </div>


          <div
            class="pack-info"
          >

            <small>
              ENCONTRADO
            </small>

            <strong>
              ${escapar(
                dataBonita(
                  p.ultima_captura
                )
              )}
            </strong>

          </div>

        </div>


        <div
          class="pack-actions"
        >

          ${
            p.pack_url
              ? `
                <a
                  class="
                    pack-button
                    pack-button-primary
                  "
                  href="${escapar(
                    p.pack_url
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-pack-link
                >
                  📦 ABRIR PACK
                </a>
              `
              : `
                <span
                  class="
                    pack-button
                    pack-button-disabled
                  "
                >
                  PACK INDISPONÍVEL
                </span>
              `
          }

        </div>

      </div>

    </article>
  `;

}


// ======================================================
// RENDER
// ======================================================

function renderizarProdutos() {

  if (
    !productsGrid
  ) {
    return;
  }


  let lista =
    obterProdutosFiltrados();


  lista =
    ordenarProdutos(
      lista
    );


  atualizarContadores();


  if (
    !lista.length
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
        filtroAtual ===
        "packs"
      ) {

        if (titulo) {

          titulo.textContent =
            "Nenhum pack encontrado";

        }


        if (texto) {

          texto.textContent =
            "Tente outra pesquisa.";

        }


      } else {

        if (titulo) {

          titulo.textContent =
            "Nenhum produto encontrado";

        }


        if (texto) {

          texto.textContent =
            nichoAtual !== "all"
              ? "Role a página para carregar mais produtos ou escolha outro nicho."
              : "Tente mudar sua pesquisa.";

        }

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
    lista
      .map(
        p => {

          if (
            p.tipo === "pack"
          ) {

            return criarCardPack(
              p
            );

          }


          if (
            p.tipo === "zero"
          ) {

            return criarCardZero(
              p
            );

          }


          if (
            p.tipo === "momentum"
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

}
// ======================================================
// SHOPEE RADAR — APP.JS FINAL
// PARTE 3/3
// CARREGAMENTO + EVENTOS + MODAL + INICIALIZAÇÃO
// ======================================================


// ======================================================
// LOADING INICIAL
// ======================================================

function mostrarLoadingInicial() {

  if (!productsGrid) {
    return;
  }


  productsGrid.innerHTML = `
    <div
      class="loading"
      style="grid-column:1/-1;"
    >

      <div
        class="loader"
      ></div>

      <p>
        ${
          filtroAtual === "packs"
            ? "Buscando packs..."
            : "Consultando Radar..."
        }
      </p>

    </div>
  `;

}


// ======================================================
// CARREGAR PRODUTOS / PACKS
// ======================================================

async function carregarProdutos(
  reset = false
) {

  if (
    carregando
  ) {
    return;
  }


  if (
    !temProximaPagina &&
    !reset
  ) {
    return;
  }


  carregando = true;


  if (reset) {

    paginaAtual = 1;

    temProximaPagina = true;

    produtos = [];

    totalServidor = 0;

    resumoServidor = {};

    mostrarLoadingInicial();

  } else {

    if (
      infiniteLoader
    ) {

      infiniteLoader.hidden =
        false;

    }

  }


  try {

    const {
      dados,
      tipo
    } =
      await buscarPagina(
        paginaAtual
      );


    const recebidos =
      extrairListaResposta(
        dados,
        tipo
      );


    /*
      TOTAL REAL DO SERVIDOR

      Aqui recuperamos a lógica
      que existia antes.

      Não usamos simplesmente
      produtos.length como total.
    */

    totalServidor =
      extrairTotalServidor(
        dados,
        recebidos.length
      );


    /*
      RESUMO DA API MOMENTUM

      Usado pelo contador
      DESTAQUES.
    */

    if (
      tipo === "momentum"
    ) {

      resumoServidor =
        extrairResumoServidor(
          dados
        );

    }


    produtos =
      removerDuplicados([
        ...produtos,
        ...recebidos
      ]);


    temProximaPagina =
      descobrirProximaPagina(
        dados,
        recebidos.length
      );


    if (
      recebidos.length > 0
    ) {

      paginaAtual += 1;

    }


    renderizarProdutos();


  } catch (erro) {

    console.error(
      "Erro ao carregar Radar:",
      erro
    );


    if (
      productsGrid &&
      produtos.length === 0
    ) {

      productsGrid.innerHTML = `
        <div
          class="empty-state"
          style="grid-column:1/-1;"
        >

          <div>
            ⚠️
          </div>

          <h3>
            Não foi possível carregar
          </h3>

          <p>
            ${escapar(
              erro?.message ||
              "Tente novamente."
            )}
          </p>

        </div>
      `;

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
// INTERFACE DO MODO ATUAL
// ======================================================

function atualizarInterface() {

  // ----------------------
  // PACKS
  // ----------------------

  if (
    filtroAtual === "packs"
  ) {

    if (
      resultsTitle
    ) {

      resultsTitle.textContent =
        "📦 Packs para Afiliados";

    }


    if (
      heroDescription
    ) {

      heroDescription.textContent =
        "Encontre vídeos prontos para divulgar produtos da Shopee.";

    }


    if (
      searchInput
    ) {

      searchInput.placeholder =
        "Pesquisar pack ou canal...";

    }


    if (
      categoryFilter
    ) {

      categoryFilter.disabled =
        true;

      categoryFilter.value =
        "all";

    }


    if (
      zeroStrategyBox
    ) {

      zeroStrategyBox.classList.remove(
        "active"
      );

    }


    const sortSection =
      document.getElementById(
        "sortSection"
      );


    if (
      sortSection
    ) {

      sortSection.style.display =
        "none";

    }


    return;

  }


  // ----------------------
  // RESTAURAR FILTROS
  // ----------------------

  if (
    categoryFilter
  ) {

    categoryFilter.disabled =
      false;

  }


  if (
    searchInput
  ) {

    searchInput.placeholder =
      "Pesquisar produto...";

  }


  const sortSection =
    document.getElementById(
      "sortSection"
    );


  if (
    sortSection
  ) {

    sortSection.style.display =
      "";

  }


  // ----------------------
  // RANQUEAR
  // ----------------------

  if (
    filtroAtual === "zero"
  ) {

    if (
      resultsTitle
    ) {

      resultsTitle.textContent =
        "🎯 Produtos para Ranquear";

    }


    if (
      heroDescription
    ) {

      heroDescription.textContent =
        "Produtos ainda no começo para você tentar entrar antes da concorrência.";

    }


    if (
      zeroStrategyBox
    ) {

      zeroStrategyBox.classList.add(
        "active"
      );

    }


    return;

  }


  if (
    zeroStrategyBox
  ) {

    zeroStrategyBox.classList.remove(
      "active"
    );

  }


  // ----------------------
  // MAIS VENDIDOS
  // ----------------------

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
        "Produtos com maior volume de vendas encontrados pelo Radar.";

    }


    return;

  }


  // ----------------------
  // MELHOR AVALIAÇÃO
  // ----------------------

  if (
    filtroAtual === "rating"
  ) {

    if (
      resultsTitle
    ) {

      resultsTitle.textContent =
        "⭐ Melhores Avaliações";

    }


    if (
      heroDescription
    ) {

      heroDescription.textContent =
        "Produtos bem avaliados encontrados pelo Radar.";

    }


    return;

  }


  // ----------------------
  // RADAR
  // ----------------------

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
      "Encontre produtos antes de saturarem e acompanhe oportunidades em um único Radar.";

  }

}


// ======================================================
// SINCRONIZAR ABAS
// ======================================================

function sincronizarAbas() {

  document
    .querySelectorAll(
      "[data-filter]"
    )
    .forEach(
      elemento => {

        elemento.classList.toggle(
          "active",
          elemento.dataset.filter ===
            filtroAtual
        );

      }
    );

}


// ======================================================
// TROCAR DE MODO
// ======================================================

async function trocarFiltro(
  novoFiltro
) {

  /*
    Compatibilidade com HTML antigo.
  */

  if (
    novoFiltro === "all"
  ) {

    novoFiltro =
      "radar";

  }


  if (
    novoFiltro === "videos"
  ) {

    novoFiltro =
      "packs";

  }


  const permitidos = [

    "radar",

    "hot",

    "rating",

    "zero",

    "packs"

  ];


  if (
    !permitidos.includes(
      novoFiltro
    )
  ) {

    novoFiltro =
      "radar";

  }


  if (
    novoFiltro ===
    filtroAtual
  ) {

    return;

  }


  const entrandoOuSaindoPack =
    (
      filtroAtual === "packs"
    ) !==
    (
      novoFiltro === "packs"
    );


  filtroAtual =
    novoFiltro;


  /*
    Evita uma pesquisa antiga
    de produto escondendo packs.
  */

  if (
    entrandoOuSaindoPack
  ) {

    buscaDigitada = "";


    if (
      searchInput
    ) {

      searchInput.value =
        "";

    }

  }


  nichoAtual =
    filtroAtual === "packs"
      ? "all"
      : (
          categoryFilter?.value ||
          "all"
        );


  sincronizarAbas();

  atualizarInterface();


  await carregarProdutos(
    true
  );

}


// ======================================================
// ENCONTRAR ITEM
// ======================================================

function encontrarProduto(
  id
) {

  return produtos.find(
    produto =>
      String(
        produto.id
      ) ===
      String(id)
  );

}


// ======================================================
// MODAL — PRODUTO MOMENTUM
// ======================================================

function abrirModalProduto(
  p
) {

  if (
    !productModal ||
    !modalBody
  ) {

    return;

  }


  const link =
    p.affiliate_url ||
    p.product_url ||
    "";


  let inteligencia =
    "";


  if (
    p.tipo === "momentum"
  ) {

    const topNumerico =
      p.momentum_posicao > 0
        ? Math.round(
            p.momentum_posicao
          )
        : null;


    inteligencia = `
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
              p.vendas_confirmadas_24h > 0
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
                ? `#${Math.round(
                    p.rank_atual
                  )}`
                : "Sem posição"
            }
          </strong>
        </p>


        <p>
          📍 Posição no Radar:
          <strong>
            ${
              topNumerico
                ? `#${topNumerico}`
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

    inteligencia = `
      <div
        style="
          margin-top:16px;
          padding:14px;
          background:#11151f;
          border-radius:12px;
        "
      >

        <strong>
          🎯 Estratégia
        </strong>

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
            )}x
          </strong>
        </p>

      </div>
    `;

  }


  modalBody.innerHTML = `
    <div
      style="
        padding-right:40px;
      "
    >

      <h2>
        ${escapar(
          p.name
        )}
      </h2>

      <p
        style="
          color:#9299a8;
          margin-top:6px;
        "
      >
        ${escapar(
          p.shop_name
        )}
      </p>

    </div>


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
              max-height:330px;
              object-fit:contain;
              background:#fff;
              border-radius:14px;
              margin-top:16px;
            "
          >
        `
        : ""
    }


    ${inteligencia}


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
              display:flex;
              justify-content:center;
              align-items:center;
              margin-top:16px;
              min-height:46px;
              padding:12px;
              background:#ff5
