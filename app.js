// ======================================================
// SHOPEE RADAR — APP.JS
//
// O QUE POSTAR HOJE
// Detector de Explosão + Post Score
// Ranking Shopee + Nichos + Busca + Favoritos
// Scroll infinito + Histórico + Crescimento
// ======================================================

const API_URL =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-api";

const RANKING_API_URL =
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

let buscaDigitada = "";
let nichoAtual = "all";

let filtroAtual = "radar";
let ordenacaoAtual = "relevance";

let modoFavoritos = false;
let usandoRankingServidor = true;

let totalRecomendadosServidor = 0;

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

  if (!Array.isArray(favoritos)) {
    favoritos = [];
  }
} catch (erro) {
  console.error(
    "Erro ao carregar favoritos:",
    erro
  );

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

  if (!produto) return;

  if (estaFavoritado(id)) {
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

  if (modoFavoritos) {
    atualizarTituloFavoritos();

    renderizarProdutos(
      favoritos
    );
  } else {
    aplicarOrdenacaoLocal();
  }
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

const searchInput =
  document.getElementById(
    "searchInput"
  );

const categoryFilter =
  document.getElementById(
    "categoryFilter"
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

const resultsTitle =
  document.getElementById(
    "resultsTitle"
  );

const infiniteLoader =
  document.getElementById(
    "infiniteLoader"
  );

// ======================================================
// SEGURANÇA
// ======================================================

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ======================================================
// NÚMEROS
// ======================================================

function numeroSeguro(valor) {
  const n =
    Number(valor ?? 0);

  return Number.isFinite(n)
    ? n
    : 0;
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
      style: "currency",
      currency: "BRL"
    }
  );
}

function formatarNumero(valor) {
  const n =
    numeroSeguro(valor);

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
          n >= 10000
            ? 0
            : 1
        )
        .replace(".", ",") +
      " mil"
    );
  }

  return n.toLocaleString(
    "pt-BR"
  );
}

function percentual(valor) {
  let n =
    numeroSeguro(valor);

  if (
    n > 0 &&
    n <= 1
  ) {
    n *= 100;
  }

  return (
    n
      .toFixed(2)
      .replace(".", ",") +
    "%"
  );
}

function percentualCrescimento(
  valor
) {
  const n =
    numeroSeguro(valor);

  const sinal =
    n > 0
      ? "+"
      : "";

  return (
    sinal +
    n
      .toFixed(2)
      .replace(".", ",") +
    "%"
  );
}

function normalizarPercentual(
  valor
) {
  let n =
    numeroSeguro(valor);

  if (
    n > 0 &&
    n <= 1
  ) {
    n *= 100;
  }

  return n;
}

function formatarDecimal(
  valor,
  casas = 2
) {
  return numeroSeguro(
    valor
  )
    .toFixed(casas)
    .replace(".", ",");
}

function formatarDataCurta(
  valor
) {
  if (!valor) {
    return "";
  }

  try {
    return new Date(
      valor
    ).toLocaleString(
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
// RADAR SCORE LOCAL
// ======================================================

function calcularScore(produto) {
  const vendas =
    numeroSeguro(
      produto.sold_count
    );

  const avaliacao =
    numeroSeguro(
      produto.rating
    );

  const preco =
    numeroSeguro(
      produto.price
    );

  const ganho =
    numeroSeguro(
      produto.commission_value
    );

  const comissao =
    normalizarPercentual(
      produto.commission_rate
    );

  let demandaPts = 0;
  let avaliacaoPts = 0;
  let comissaoPts = 0;
  let ganhoPts = 0;
  let precoPts = 0;

  if (vendas >= 10000) {
    demandaPts = 30;
  } else if (vendas >= 5000) {
    demandaPts = 27;
  } else if (vendas >= 1000) {
    demandaPts = 23;
  } else if (vendas >= 500) {
    demandaPts = 19;
  } else if (vendas >= 100) {
    demandaPts = 14;
  } else if (vendas >= 20) {
    demandaPts = 8;
  } else {
    demandaPts = 3;
  }

  if (avaliacao >= 4.9) {
    avaliacaoPts = 20;
  } else if (avaliacao >= 4.8) {
    avaliacaoPts = 19;
  } else if (avaliacao >= 4.6) {
    avaliacaoPts = 17;
  } else if (avaliacao >= 4.4) {
    avaliacaoPts = 14;
  } else if (avaliacao >= 4.0) {
    avaliacaoPts = 10;
  } else if (avaliacao > 0) {
    avaliacaoPts = 5;
  }

  if (comissao >= 15) {
    comissaoPts = 25;
  } else if (comissao >= 12) {
    comissaoPts = 23;
  } else if (comissao >= 10) {
    comissaoPts = 21;
  } else if (comissao >= 7) {
    comissaoPts = 17;
  } else if (comissao >= 5) {
    comissaoPts = 13;
  } else if (comissao >= 3) {
    comissaoPts = 8;
  } else if (comissao > 0) {
    comissaoPts = 4;
  }

  if (ganho >= 30) {
    ganhoPts = 15;
  } else if (ganho >= 20) {
    ganhoPts = 13;
  } else if (ganho >= 10) {
    ganhoPts = 11;
  } else if (ganho >= 5) {
    ganhoPts = 8;
  } else if (ganho >= 2) {
    ganhoPts = 5;
  } else if (ganho > 0) {
    ganhoPts = 2;
  }

  if (
    preco >= 20 &&
    preco <= 100
  ) {
    precoPts = 10;
  } else if (
    preco > 100 &&
    preco <= 200
  ) {
    precoPts = 8;
  } else if (
    preco > 200 &&
    preco <= 400
  ) {
    precoPts = 6;
  } else if (
    preco > 0 &&
    preco < 20
  ) {
    precoPts = 7;
  } else if (
    preco > 400 &&
    preco <= 800
  ) {
    precoPts = 4;
  } else if (
    preco > 800
  ) {
    precoPts = 2;
  }

  return Math.min(
    100,
    Math.max(
      0,
      demandaPts +
        avaliacaoPts +
        comissaoPts +
        ganhoPts +
        precoPts
    )
  );
}

// ======================================================
// DETECTOR
// ======================================================

function temDetector(produto) {
  return Boolean(
    produto.detector_nivel ||
    numeroSeguro(
      produto.post_score
    ) > 0 ||
    produto.motivo_principal ||
    produto.historico_suficiente
  );
}

function obterRotuloDetector(
  produto
) {
  const nivel =
    String(
      produto.detector_nivel ||
        ""
    ).toLowerCase();

  if (
    nivel ===
    "explodindo"
  ) {
    return "🚨 EXPLODINDO";
  }

  if (
    nivel ===
    "acelerando"
  ) {
    return "🔥 ACELERANDO";
  }

  if (
    nivel ===
    "crescendo"
  ) {
    return "📈 CRESCENDO";
  }

  if (
    nivel ===
    "observando"
  ) {
    return "👀 OBSERVAR";
  }

  return "👀 OBSERVAR";
}

function obterDecisaoPost(
  produto
) {
  const score =
    numeroSeguro(
      produto.post_score
    );

  const nivel =
    String(
      produto.detector_nivel ||
        ""
    ).toLowerCase();

  if (
    nivel === "explodindo" ||
    score >= 85
  ) {
    return {
      emoji: "🔥",
      nome: "POSTAR AGORA",
      cor: "#ff4d4d"
    };
  }

  if (
    nivel === "acelerando" ||
    score >= 65
  ) {
    return {
      emoji: "🚀",
      nome: "FORTE CANDIDATO",
      cor: "#ff8a3d"
    };
  }

  if (
    nivel === "crescendo" ||
    score >= 35
  ) {
    return {
      emoji: "📈",
      nome: "ACOMPANHAR",
      cor: "#32d583"
    };
  }

  return {
    emoji: "👀",
    nome: "AGUARDAR",
    cor: "#9299a8"
  };
}

function obterTextoAceleracao(
  produto
) {
  const iniciou =
    Boolean(
      produto.aceleracao_iniciada
    );

  const anterior =
    numeroSeguro(
      produto.vendas_hora_anterior
    );

  const atual =
    numeroSeguro(
      produto.vendas_hora_6h
    );

  if (
    iniciou ||
    (
      anterior <= 0 &&
      atual > 0
    )
  ) {
    return "Começou a acelerar";
  }

  return percentualCrescimento(
    produto.aceleracao_percentual
  );
}

// ======================================================
// TENDÊNCIA
// ======================================================

function obterTendencia(produto) {
  if (
    produto.detector_nivel
  ) {
    return obterRotuloDetector(
      produto
    );
  }

  const crescimento =
    numeroSeguro(
      produto.crescimento_percentual
    );

  const novasVendas =
    numeroSeguro(
      produto.novas_vendas
    );

  const vendasHora =
    numeroSeguro(
      produto.vendas_por_hora
    );

  if (
    crescimento >= 50 ||
    novasVendas >= 50 ||
    vendasHora >= 5
  ) {
    return "🔥 SUBINDO RÁPIDO";
  }

  if (
    crescimento > 0 ||
    novasVendas > 0 ||
    vendasHora > 0
  ) {
    return "📈 CRESCENDO";
  }

  if (
    crescimento < 0
  ) {
    return "📉 CAINDO";
  }

  if (
    produto.tendencia &&
    String(
      produto.tendencia
    ).trim()
  ) {
    return String(
      produto.tendencia
    ).trim();
  }

  return "⚪ ESTÁVEL";
}

// ======================================================
// MOTIVO AMIGÁVEL
// ======================================================

function obterMotivoAmigavel(
  produto
) {
  const novas =
    numeroSeguro(
      produto.novas_vendas
    );

  const vendasHora =
    Math.max(
      numeroSeguro(
        produto.vendas_por_hora
      ),
      numeroSeguro(
        produto.vendas_hora_6h
      )
    );

  const aceleracao =
    numeroSeguro(
      produto.aceleracao_percentual
    );

  const iniciou =
    Boolean(
      produto.aceleracao_iniciada
    ) ||
    (
      numeroSeguro(
        produto.vendas_hora_anterior
      ) <= 0 &&
      numeroSeguro(
        produto.vendas_hora_6h
      ) > 0
    );

  const nivel =
    String(
      produto.detector_nivel ||
        ""
    ).toLowerCase();

  if (
    nivel === "explodindo"
  ) {
    return (
      "As vendas estão subindo muito rápido. " +
      "O produto apresenta forte aceleração agora."
    );
  }

  if (iniciou) {
    return (
      "O produto começou a ganhar velocidade " +
      "nas últimas horas."
    );
  }

  if (
    nivel === "acelerando"
  ) {
    return (
      "As vendas estão ganhando velocidade " +
      "e o ritmo atual está acima do anterior."
    );
  }

  if (
    nivel === "crescendo"
  ) {
    return (
      "O produto apresentou novas vendas " +
      "e crescimento real entre as capturas."
    );
  }

  if (
    novas > 0 &&
    vendasHora > 0
  ) {
    return (
      `O produto ganhou +${formatarNumero(
        novas
      )} vendas e está vendendo em ritmo de ` +
      `${formatarDecimal(
        vendasHora
      )}/h.`
    );
  }

  if (
    aceleracao > 0
  ) {
    return (
      "O ritmo de vendas está melhorando, " +
      "mas ainda precisa de mais histórico."
    );
  }

  return (
    produto.motivo_principal ||
    "O Radar ainda está coletando dados para confirmar o movimento."
  );
}

// ======================================================
// NORMALIZAÇÃO
// ======================================================

function normalizarProduto(p) {
  const produto = {
    id:
      p.product_id ??
      p.id ??
      p.itemId ??
      "",

    name:
      p.product_name ??
      p.nome ??
      p.productName ??
      "Produto Shopee",

    image_url:
      p.image_url ??
      p.imagem ??
      p.imageUrl ??
      "",

    price:
      numeroSeguro(
        p.price ??
          p.precoMin ??
          p.priceMin
      ),

    price_max:
      numeroSeguro(
        p.price_max ??
          p.precoMax ??
          p.priceMax ??
          p.price ??
          p.precoMin
      ),

    sold_count:
      numeroSeguro(
        p.sold_count ??
          p.vendidos ??
          p.sales
      ),

    vendas_anterior:
      numeroSeguro(
        p.vendas_anterior ??
          p.previous_sales ??
          p.previous_sold_count
      ),

    novas_vendas:
      numeroSeguro(
        p.novas_vendas ??
          p.new_sales ??
          p.sales_growth
      ),

    vendas_por_hora:
      numeroSeguro(
        p.vendas_por_hora ??
          p.sales_per_hour
      ),

    crescimento_percentual:
      numeroSeguro(
        p.crescimento_percentual ??
          p.growth_percentage
      ),

    rating:
      numeroSeguro(
        p.rating ??
          p.avaliacao ??
          p.ratingStar
      ),

    commission_value:
      numeroSeguro(
        p.commission_value ??
          p.comissao ??
          p.commission
      ),

    commission_rate:
      numeroSeguro(
        p.commission_rate ??
          p.taxaComissao ??
          p.commissionRate
      ),

    radar_score:
      numeroSeguro(
        p.radar_score ??
          p.radarScore
      ),

    opportunity_score:
      numeroSeguro(
        p.opportunity_score
      ),

    vendas_24h:
      numeroSeguro(
        p.vendas_24h
      ),

    vendas_6h:
      numeroSeguro(
        p.vendas_6h
      ),

    vendas_hora_6h:
      numeroSeguro(
        p.vendas_hora_6h
      ),

    vendas_hora_anterior:
      numeroSeguro(
        p.vendas_hora_anterior
      ),

    aceleracao_percentual:
      numeroSeguro(
        p.aceleracao_percentual
      ),

    aceleracao_iniciada:
      Boolean(
        p.aceleracao_iniciada
      ),

    post_score:
      numeroSeguro(
        p.post_score
      ),

    detector_nivel:
      p.detector_nivel ??
      "",

    detector_prioridade:
      numeroSeguro(
        p.detector_prioridade
      ),

    motivo_principal:
      p.motivo_principal ??
      "",

    capturas_analisadas:
      numeroSeguro(
        p.capturas_analisadas
      ),

    horas_historico:
      numeroSeguro(
        p.horas_historico
      ),

    confianca_detector:
      p.confianca_detector ??
      "",

    historico_suficiente:
      Boolean(
        p.historico_suficiente
      ),

    historico_resumo:
      Array.isArray(
        p.historico_resumo
      )
        ? p.historico_resumo
        : [],

    ranking_origem:
      p.ranking_origem ??
      "",

    tendencia:
      p.tendencia ??
      "",

    captura_anterior:
      p.captura_anterior ??
      null,

    captured_at:
      p.captured_at ??
      p.last_seen_at ??
      null,

    shop_name:
      p.shop_name ??
      p.loja ??
      p.shopName ??
      "Shopee",

    shop_id:
      p.shop_id ??
      p.lojaId ??
      p.shopId ??
      "",

    shop_type:
      p.shop_type ??
      p.tipoLoja ??
      p.shopType ??
      "",

    product_url:
      p.product_url ??
      p.linkProduto ??
      p.productLink ??
      "",

    affiliate_url:
      p.affiliate_url ??
      p.linkAfiliado ??
      p.offerLink ??
      p.product_url ??
      p.linkProduto ??
      p.productLink ??
      ""
  };

  if (
    !Number.isFinite(
      produto.radar_score
    ) ||
    produto.radar_score <= 0
  ) {
    produto.radar_score =
      calcularScore(produto);
  }

  produto.tendencia =
    obterTendencia(
      produto
    );

  return produto;
}

// ======================================================
// DUPLICADOS
// ======================================================

function removerDuplicados(lista) {
  const mapa =
    new Map();

  lista.forEach(
    produto => {
      const id =
        String(
          produto.id || ""
        );

      if (!id) return;

      if (!mapa.has(id)) {
        mapa.set(
          id,
          produto
        );
      }
    }
  );

  return [
    ...mapa.values()
  ];
}

// ======================================================
// KEYWORDS
// ======================================================

const KEYWORDS_RADAR = [
  "ofertas",
  "beleza",
  "moda",
  "casa",
  "acessorios"
];

let indiceKeywordPadrao = 0;

function obterKeywordPadrao() {
  return KEYWORDS_RADAR[
    indiceKeywordPadrao %
      KEYWORDS_RADAR.length
  ];
}

function obterKeywordAtual() {
  const busca =
    buscaDigitada.trim();

  const nicho =
    nichoAtual === "all"
      ? ""
      : nichoAtual.trim();

  if (
    busca &&
    nicho
  ) {
    return `${busca} ${nicho}`;
  }

  if (busca) {
    return busca;
  }

  if (nicho) {
    return nicho;
  }

  return obterKeywordPadrao();
}

// ======================================================
// MODO RANKING
// ======================================================

function obterModoRanking() {
  if (
    filtroAtual === "hot"
  ) {
    return "sales";
  }

  if (
    filtroAtual ===
    "commission"
  ) {
    return "commission";
  }

  if (
    filtroAtual ===
    "rating"
  ) {
    return "rating";
  }

  if (
    filtroAtual ===
    "growth"
  ) {
    return "growth";
  }

  return "opportunity";
}

function deveUsarRankingServidor() {
  const temBusca =
    buscaDigitada
      .trim()
      .length > 0;

  const temNicho =
    nichoAtual !== "all";

  return (
    !temBusca &&
    !temNicho
  );
}

// ======================================================
// URL
// ======================================================

function montarURL(pagina) {
  usandoRankingServidor =
    deveUsarRankingServidor();

  if (
    usandoRankingServidor
  ) {
    const url =
      new URL(
        RANKING_API_URL
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
      obterModoRanking()
    );

    return url.toString();
  }

  const url =
    new URL(API_URL);

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
    "keyword",
    obterKeywordAtual()
  );

  return url.toString();
}

// ======================================================
// TÍTULOS
// ======================================================

function atualizarTituloFavoritos() {
  if (!resultsTitle) return;

  resultsTitle.textContent =
    `Meus favoritos (${favoritos.length})`;
}

function atualizarTitulo() {
  if (!resultsTitle) return;

  if (modoFavoritos) {
    atualizarTituloFavoritos();
    return;
  }

  if (buscaDigitada) {
    resultsTitle.textContent =
      `Resultados para "${buscaDigitada}"`;

    return;
  }

  if (
    nichoAtual !== "all" &&
    categoryFilter
  ) {
    const option =
      categoryFilter.options[
        categoryFilter.selectedIndex
      ];

    resultsTitle.textContent =
      option.textContent
        .replace(
          /[^\p{L}\p{N}\s&]/gu,
          ""
        )
        .trim();

    return;
  }

  if (
    filtroAtual === "hot"
  ) {
    resultsTitle.textContent =
      "Produtos mais vendidos";

    return;
  }

  if (
    filtroAtual ===
    "commission"
  ) {
    resultsTitle.textContent =
      "Maiores comissões";

    return;
  }

  if (
    filtroAtual ===
    "rating"
  ) {
    resultsTitle.textContent =
      "Melhores avaliações";

    return;
  }

  if (
    filtroAtual ===
    "growth"
  ) {
    resultsTitle.textContent =
      "Produtos em crescimento";

    return;
  }

  resultsTitle.textContent =
    "🔥 O que postar hoje";
}

// ======================================================
// CONTADORES
// ======================================================

function atualizarContadores() {
  if (totalProdutos) {
    totalProdutos.textContent =
      produtos.length;
  }

  if (totalOportunidades) {
    if (
      usandoRankingServidor &&
      filtroAtual === "radar"
    ) {
      totalOportunidades.textContent =
        totalRecomendadosServidor;
    } else {
      const movimento =
        produtos.filter(
          produto =>
            numeroSeguro(
              produto.novas_vendas
            ) > 0 ||
            numeroSeguro(
              produto.vendas_por_hora
            ) > 0 ||
            numeroSeguro(
              produto.crescimento_percentual
            ) > 0
        ).length;

      totalOportunidades.textContent =
        movimento;
    }
  }

  if (totalVideos) {
    totalVideos.textContent =
      produtos.length;
  }
}

// ======================================================
// LOADING
// ======================================================

function mostrarCarregandoInicial() {
  if (!productsGrid) return;

  if (emptyState) {
    emptyState.hidden = true;
  }

  productsGrid.innerHTML = `
    <div
      class="loading"
      style="
        grid-column:1/-1;
      "
    >
      <div class="loader"></div>

      <p>
        Analisando o que vale postar agora...
      </p>
    </div>
  `;
}

function mostrarCarregandoMais() {
  if (infiniteLoader) {
    infiniteLoader.hidden =
      false;
  }
}

function esconderCarregandoMais() {
  if (infiniteLoader) {
    infiniteLoader.hidden =
      true;
  }
}

// ======================================================
// ERRO
// ======================================================

function mostrarErro(mensagem) {
  if (!productsGrid) return;

  productsGrid.innerHTML = `
    <div
      class="empty-state"
      style="
        display:block;
        grid-column:1/-1;
      "
    >
      <div>⚠️</div>

      <h3>
        Não foi possível carregar
      </h3>

      <p>
        ${escapar(mensagem)}
      </p>

      <button
        id="retryButton"
        style="
          margin-top:16px;
          padding:12px 18px;
          border:0;
          border-radius:12px;
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
      "retryButton"
    )
    ?.addEventListener(
      "click",
      () =>
        reiniciarRadar()
    );
}

// ======================================================
// CARREGAR PRODUTOS
// ======================================================

async function carregarProdutos(
  pagina = 1,
  adicionar = false
) {
  if (carregando) return;
  if (modoFavoritos) return;

  if (
    adicionar &&
    !temProximaPagina
  ) {
    return;
  }

  carregando = true;

  if (adicionar) {
    mostrarCarregandoMais();
  } else {
    mostrarCarregandoInicial();
  }

  try {
    const url =
      montarURL(pagina);

    console.log(
      "Shopee Radar:",
      url
    );

    const resposta =
      await fetch(
        url,
        {
          headers: {
            Accept:
              "application/json"
          }
        }
      );

    let dados;

    try {
      dados =
        await resposta.json();
    } catch {
      throw new Error(
        `Resposta inválida da API (${resposta.status})`
      );
    }

    if (!resposta.ok) {
      throw new Error(
        dados?.erro ||
          `Erro ${resposta.status}`
      );
    }

    if (
      dados.ok === false
    ) {
      throw new Error(
        dados.erro ||
          "A API recusou a consulta."
      );
    }

    let novos =
      (
        Array.isArray(
          dados.produtos
        )
          ? dados.produtos
          : []
      )
        .map(
          normalizarProduto
        )
        .filter(
          produto =>
            String(
              produto.id || ""
            ).length > 0
        );

    novos =
      removerDuplicados(
        novos
      );

    if (adicionar) {
      const existentes =
        new Set(
          produtos.map(
            produto =>
              String(
                produto.id
              )
          )
        );

      novos =
        novos.filter(
          produto =>
            !existentes.has(
              String(
                produto.id
              )
            )
        );

      produtos.push(
        ...novos
      );

      produtos =
        removerDuplicados(
          produtos
        );
    } else {
      produtos =
        novos;
    }

    paginaAtual =
      numeroSeguro(
        dados.paginaAtual ??
          dados.pagina?.page ??
          pagina
      );

    temProximaPagina =
      Boolean(
        dados.temProximaPagina ??
          dados.pagina
            ?.hasNextPage ??
          false
      );

    if (
      usandoRankingServidor &&
      filtroAtual === "radar"
    ) {
      totalRecomendadosServidor =
        numeroSeguro(
          dados.detector
            ?.recomendados ??
          dados.total ??
          produtos.length
        );
    }

    atualizarTitulo();
    atualizarContadores();
    aplicarOrdenacaoLocal();

  } catch (erro) {
    console.error(
      "ERRO SHOPEE RADAR:",
      erro
    );

    if (!adicionar) {
      mostrarErro(
        erro instanceof Error
          ? erro.message
          : String(erro)
      );
    }

  } finally {
    carregando = false;

    esconderCarregandoMais();
  }
}

// ======================================================
// REINICIAR
// ======================================================

function reiniciarRadar() {
  modoFavoritos = false;

  produtos = [];

  paginaAtual = 1;
  temProximaPagina = true;
  carregando = false;

  totalRecomendadosServidor = 0;

  atualizarTitulo();
  atualizarContadores();

  carregarProdutos(
    1,
    false
  );
}

// ======================================================
// ORDENAÇÃO LOCAL
// ======================================================

function aplicarOrdenacaoLocal() {
  if (modoFavoritos) {
    renderizarProdutos(
      favoritos
    );

    return;
  }

  const resultado =
    removerDuplicados(
      [...produtos]
    );

  if (
    ordenacaoAtual ===
    "relevance"
  ) {
    // mantém ordem do servidor
  }

  if (
    ordenacaoAtual ===
    "sales"
  ) {
    resultado.sort(
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
    "commission"
  ) {
    resultado.sort(
      (a, b) =>
        numeroSeguro(
          b.commission_value
        ) -
        numeroSeguro(
          a.commission_value
        )
    );
  }

  if (
    ordenacaoAtual ===
    "rating"
  ) {
    resultado.sort(
      (a, b) =>
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
    "growth"
  ) {
    resultado.sort(
      (a, b) => {
        const velocidade =
          numeroSeguro(
            b.vendas_por_hora
          ) -
          numeroSeguro(
            a.vendas_por_hora
          );

        if (
          velocidade !== 0
        ) {
          return velocidade;
        }

        return (
          numeroSeguro(
            b.novas_vendas
          ) -
          numeroSeguro(
            a.novas_vendas
          )
        );
      }
    );
  }

  if (
    ordenacaoAtual ===
    "radar"
  ) {
    resultado.sort(
      (a, b) =>
        numeroSeguro(
          b.radar_score
        ) -
        numeroSeguro(
          a.radar_score
        )
    );
  }

  renderizarProdutos(
    resultado
  );
}

// ======================================================
// CARD
// ======================================================

function criarCard(produto) {
  const score =
    numeroSeguro(
      produto.radar_score
    );

  const postScore =
    numeroSeguro(
      produto.post_score
    );

  const favoritado =
    estaFavoritado(
      produto.id
    );

  const novasVendas =
    numeroSeguro(
      produto.novas_vendas
    );

  const vendasHora =
    Math.max(
      numeroSeguro(
        produto.vendas_por_hora
      ),
      numeroSeguro(
        produto.vendas_hora_6h
      )
    );

  const detectorAtivo =
    temDetector(produto);

  const decisao =
    obterDecisaoPost(
      produto
    );

  const motivo =
    obterMotivoAmigavel(
      produto
    );

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

      <button
        class="favorite-btn"
        data-favorite-id="${escapar(
          produto.id
        )}"
        aria-label="${
          favoritado
            ? "Remover dos favoritos"
            : "Adicionar aos favoritos"
        }"
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
              : "#ffffff"
          };
          font-size:24px;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
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
              decoding="async"
            >
          `
          : `
            <div
              style="
                aspect-ratio:1/1;
                display:flex;
                align-items:center;
                justify-content:center;
                background:#11151f;
                color:#737b8b;
                font-size:13px;
              "
            >
              Sem imagem
            </div>
          `
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
              color:${decisao.cor};
              background:${decisao.cor}18;
            "
          >
            ${decisao.emoji}
            ${decisao.nome}
          </span>

          <span
            class="score-badge"
          >
            ${
              detectorAtivo
                ? `POST ${Math.round(
                    postScore
                  )}`
                : `${Math.round(
                    score
                  )}/100`
            }
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

        ${
          detectorAtivo
            ? `
              <div
                style="
                  margin-bottom:10px;
                  padding:8px 9px;
                  border-radius:9px;
                  background:rgba(255,90,31,.07);
                  border:1px solid rgba(255,90,31,.12);
                  color:#c9ced8;
                  font-size:9px;
                  line-height:1.35;
                "
              >
                ${escapar(
                  motivo
                )}
              </div>
            `
            : ""
        }

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
              NOVAS VENDAS
            </span>

            <strong>
              ${
                novasVendas > 0
                  ? "+"
                  : ""
              }${formatarNumero(
                novasVendas
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
              VENDAS/H
            </span>

            <strong>
              ${formatarDecimal(
                vendasHora
              )}
            </strong>
          </div>

        </div>

        ${
          detectorAtivo
            ? `
              <div
                style="
                  display:grid;
                  grid-template-columns:repeat(2,minmax(0,1fr));
                  gap:6px;
                  margin-top:8px;
                "
              >

                <div
                  style="
                    padding:7px;
                    border-radius:9px;
                    background:#0b0e14;
                  "
                >
                  <small
                    style="
                      display:block;
                      color:#737b8b;
                      font-size:7px;
                      font-weight:800;
                    "
                  >
                    ACELERAÇÃO
                  </small>

                  <strong
                    style="
                      display:block;
                      margin-top:3px;
                      font-size:10px;
                      line-height:1.25;
                    "
                  >
                    ${escapar(
                      obterTextoAceleracao(
                        produto
                      )
                    )}
                  </strong>
                </div>

                <div
                  style="
                    padding:7px;
                    border-radius:9px;
                    background:#0b0e14;
                  "
                >
                  <small
                    style="
                      display:block;
                      color:#737b8b;
                      font-size:7px;
                      font-weight:800;
                    "
                  >
                    RITMO 24H
                  </small>

                  <strong
                    style="
                      display:block;
                      margin-top:3px;
                      font-size:10px;
                    "
                  >
                    ${formatarNumero(
                      produto.vendas_24h
                    )}
                  </strong>
                </div>

              </div>
            `
            : ""
        }

        <div
          class="product-footer"
        >

          <div>

            <small>
              ${
                detectorAtivo
                  ? "POST SCORE"
                  : "RADAR SCORE"
              }
            </small>

            <strong>
              ${
                detectorAtivo
                  ? Math.round(
                      postScore
                    )
                  : Math.round(
                      score
                    )
              }
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

        <div
          style="
            margin-top:10px;
            display:flex;
            justify-content:space-between;
            gap:10px;
            font-size:12px;
          "
        >

          <div>
            Comissão:

            <strong>
              ${percentual(
                produto.commission_rate
              )}
            </strong>
          </div>

          <div
            style="
              text-align:right;
            "
          >
            💰

            <strong>
              ${dinheiro(
                produto.commission_value
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
  if (!productsGrid) return;

  const listaUnica =
    removerDuplicados(
      lista
    );

  if (
    !listaUnica.length
  ) {
    productsGrid.innerHTML =
      "";

    if (emptyState) {
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

      if (modoFavoritos) {
        if (titulo) {
          titulo.textContent =
            "Nenhum favorito ainda";
        }

        if (texto) {
          texto.textContent =
            "Toque no coração de um produto para salvá-lo aqui.";
        }
      } else if (
        filtroAtual === "radar"
      ) {
        if (titulo) {
          titulo.textContent =
            "Radar ainda coletando sinais";
        }

        if (texto) {
          texto.textContent =
            "Ainda não há produtos com movimento suficiente para recomendar agora.";
        }
      } else {
        if (titulo) {
          titulo.textContent =
            "Nenhum produto encontrado";
        }

        if (texto) {
          texto.textContent =
            "Tente novamente ou escolha outro filtro.";
        }
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
      .map(criarCard)
      .join("");

  document
    .querySelectorAll(
      ".product-card"
    )
    .forEach(card => {
      card.addEventListener(
        "click",
        () => {
          const produto =
            encontrarProduto(
              card.dataset.id
            );

          if (produto) {
            abrirModal(
              produto
            );
          }
        }
      );
    });

  document
    .querySelectorAll(
      ".favorite-btn"
    )
    .forEach(botao => {
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
    });
}

// ======================================================
// HISTÓRICO VISUAL
// ======================================================

function montarHistorico(
  produto
) {
  if (
    !Array.isArray(
      produto.historico_resumo
    ) ||
    !produto
      .historico_resumo
      .length
  ) {
    return `
      <p
        style="
          margin-top:8px;
          color:#9299a8;
          font-size:13px;
        "
      >
        Ainda não há histórico suficiente para mostrar a evolução.
      </p>
    `;
  }

  return produto
    .historico_resumo
    .map(
      ponto => `
        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            padding:8px 0;
            border-bottom:1px solid rgba(255,255,255,.06);
          "
        >
          <span
            style="
              color:#9299a8;
              font-size:12px;
            "
          >
            ${escapar(
              formatarDataCurta(
                ponto.captured_at
              )
            )}
          </span>

          <strong>
            ${formatarNumero(
              ponto.sold_count
            )} vendas
          </strong>
        </div>
      `
    )
    .join("");
}

// ======================================================
// CONFIANÇA
// ======================================================

function obterTextoConfianca(
  valor
) {
  const confianca =
    String(
      valor || ""
    ).toLowerCase();

  if (
    confianca === "alta"
  ) {
    return "Alta";
  }

  if (
    confianca === "media" ||
    confianca === "média"
  ) {
    return "Média";
  }

  return "Baixa";
}

// ======================================================
// MODAL
// ======================================================

function abrirModal(produto) {
  if (
    !productModal ||
    !modalBody
  ) {
    return;
  }

  const favoritado =
    estaFavoritado(
      produto.id
    );

  const detectorAtivo =
    temDetector(produto);

  const decisao =
    obterDecisaoPost(
      produto
    );

  const motivo =
    obterMotivoAmigavel(
      produto
    );

  const linkShopee =
    produto.affiliate_url ||
    produto.product_url ||
    "";

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

    ${
      detectorAtivo
        ? `
          <div
            style="
              margin-top:18px;
              padding:16px;
              background:#11151f;
              border:1px solid ${decisao.cor}55;
              border-radius:14px;
            "
          >

            <small>
              DECISÃO DO RADAR
            </small>

            <div
              style="
                margin-top:7px;
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
              "
            >

              <strong
                style="
                  font-size:20px;
                  color:${decisao.cor};
                "
              >
                ${decisao.emoji}
                ${decisao.nome}
              </strong>

              <strong
                style="
                  font-size:24px;
                  color:#ff7a1a;
                "
              >
                ${Math.round(
                  produto.post_score
                )}
              </strong>

            </div>

            <p
              style="
                margin-top:10px;
                color:#b5bac5;
                font-size:13px;
                line-height:1.45;
              "
            >
              ${escapar(
                motivo
              )}
            </p>

          </div>

          <div
            style="
              margin-top:12px;
              display:grid;
              grid-template-columns:repeat(2,minmax(0,1fr));
              gap:8px;
            "
          >

            <div
              style="
                padding:12px;
                background:#0d1017;
                border-radius:11px;
              "
            >
              <small>
                VENDAS 6H
              </small>

              <strong
                style="
                  display:block;
                  margin-top:5px;
                "
              >
                ${formatarNumero(
                  produto.vendas_6h
                )}
              </strong>
            </div>

            <div
              style="
                padding:12px;
                background:#0d1017;
                border-radius:11px;
              "
            >
              <small>
                VELOCIDADE 6H
              </small>

              <strong
                style="
                  display:block;
                  margin-top:5px;
                "
              >
                ${formatarDecimal(
                  produto.vendas_hora_6h
                )}/h
              </strong>
            </div>

            <div
              style="
                padding:12px;
                background:#0d1017;
                border-radius:11px;
              "
            >
              <small>
                ACELERAÇÃO
              </small>

              <strong
                style="
                  display:block;
                  margin-top:5px;
                "
              >
                ${escapar(
                  obterTextoAceleracao(
                    produto
                  )
                )}
              </strong>
            </div>

            <div
              style="
                padding:12px;
                background:#0d1017;
                border-radius:11px;
              "
            >
              <small>
                RITMO 24H
              </small>

              <strong
                style="
                  display:block;
                  margin-top:5px;
                "
              >
                ${formatarNumero(
                  produto.vendas_24h
                )}
              </strong>
            </div>

          </div>
        `
        : ""
    }

    <div
      style="
        margin-top:18px;
      "
    >

      <p>
        <strong>Preço:</strong>
        ${dinheiro(
          produto.price
        )}
      </p>

      <p>
        <strong>Vendidos:</strong>
        ${formatarNumero(
          produto.sold_count
        )}
      </p>

      <p>
        <strong>Novas vendas:</strong>
        ${
          produto.novas_vendas > 0
            ? "+"
            : ""
        }${formatarNumero(
          produto.novas_vendas
        )}
      </p>

      <p>
        <strong>Crescimento:</strong>
        ${percentualCrescimento(
          produto
            .crescimento_percentual
        )}
      </p>

      <p>
        <strong>Vendas/h:</strong>
        ${formatarDecimal(
          produto.vendas_por_hora
        )}
      </p>

      <p>
        <strong>Avaliação:</strong>
        ⭐ ${numeroSeguro(
          produto.rating
        ).toFixed(1)}
      </p>

      <p>
        <strong>Comissão:</strong>
        ${percentual(
          produto.commission_rate
        )}
      </p>

      <p>
        <strong>Ganho estimado:</strong>
        ${dinheiro(
          produto.commission_value
        )}
      </p>

    </div>

    ${
      detectorAtivo
        ? `
          <div
            style="
              margin-top:18px;
              padding:15px;
              background:#11151f;
              border-radius:14px;
            "
          >

            <strong>
              📊 Confiança do detector
            </strong>

            <p
              style="
                margin-top:8px;
                color:#b5bac5;
              "
            >
              ${obterTextoConfianca(
                produto.confianca_detector
              )}
              •
              ${formatarNumero(
                produto.capturas_analisadas
              )}
              capturas
              •
              ${formatarDecimal(
                produto.horas_historico,
                1
              )}h de histórico
            </p>

          </div>

          <div
            style="
              margin-top:18px;
              padding:15px;
              background:#11151f;
              border-radius:14px;
            "
          >

            <strong>
              📈 Evolução das vendas
            </strong>

            <div
              style="
                margin-top:8px;
              "
            >
              ${montarHistorico(
                produto
              )}
            </div>

          </div>
        `
        : ""
    }

    <button
      id="modalFavoriteButton"
      data-id="${escapar(
        produto.id
      )}"
      style="
        width:100%;
        margin-top:20px;
        padding:14px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.15);
        background:#151821;
        color:white;
        font-weight:800;
      "
    >
      ${
        favoritado
          ? "♥ Remover dos favoritos"
          : "♡ Salvar nos favoritos"
      }
    </button>

    ${
      linkShopee
        ? `
          <a
            href="${escapar(
              linkShopee
            )}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display:block;
              margin-top:12px;
              padding:15px;
              text-align:center;
              background:#ff5a1f;
              color:white;
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

        if (atualizado) {
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
  if (productModal) {
    productModal.hidden =
      true;
  }
}

// ======================================================
// FILTROS VISUAIS
// ======================================================

function atualizarFiltroSuperior(
  filtro
) {
  document
    .querySelectorAll(
      "[data-filter]:not(.bottom-item)"
    )
    .forEach(item => {
      const deveAtivar =
        filtro === "radar"
          ? item.dataset.filter === "all"
          : item.dataset.filter === filtro;

      item.classList.toggle(
        "active",
        deveAtivar
      );
    });
}

function atualizarFiltroInferior(
  filtro
) {
  document
    .querySelectorAll(
      ".bottom-item"
    )
    .forEach(item => {
      let ativo = false;

      if (
        filtro === "radar" &&
        item.dataset.filter ===
          "all"
      ) {
        ativo = true;
      }

      if (
        item.dataset.filter ===
        filtro
      ) {
        ativo = true;
      }

      item.classList.toggle(
        "active",
        ativo
      );
    });
}

// ======================================================
// TROCAR FILTRO
// ======================================================

function trocarFiltro(filtro) {
  if (!filtro) return;

  if (
    filtro === "all"
  ) {
    filtro = "radar";
  }

  modoFavoritos = false;

  filtroAtual =
    filtro;

  if (
    filtro === "hot"
  ) {
    ordenacaoAtual =
      "sales";
  } else if (
    filtro ===
    "commission"
  ) {
    ordenacaoAtual =
      "commission";
  } else if (
    filtro ===
    "rating"
  ) {
    ordenacaoAtual =
      "rating";
  } else if (
    filtro ===
    "growth"
  ) {
    ordenacaoAtual =
      "growth";
  } else {
    ordenacaoAtual =
      "relevance";
  }

  atualizarFiltroSuperior(
    filtro
  );

  atualizarFiltroInferior(
    filtro
  );

  document
    .querySelectorAll(
      "[data-sort]"
    )
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.sort ===
          ordenacaoAtual
      );
    });

  reiniciarRadar();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ======================================================
// PESQUISA
// ======================================================

if (searchInput) {
  searchInput.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter"
      ) {
        buscaDigitada =
          searchInput.value.trim();

        reiniciarRadar();
      }
    }
  );

  searchInput.addEventListener(
    "search",
    () => {
      if (
        !searchInput.value
      ) {
        buscaDigitada = "";

        reiniciarRadar();
      }
    }
  );
}

// ======================================================
// NICHO
// ======================================================

if (categoryFilter) {
  categoryFilter.addEventListener(
    "change",
    () => {
      nichoAtual =
        categoryFilter.value;

      reiniciarRadar();
    }
  );
}

// ======================================================
// BOTÕES DE ORDENAÇÃO
// ======================================================

document
  .querySelectorAll(
    "[data-sort]"
  )
  .forEach(botao => {
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
          .forEach(item => {
            item.classList.toggle(
              "active",
              item === botao
            );
          });

        aplicarOrdenacaoLocal();
      }
    );
  });

// ======================================================
// BOTÕES PRINCIPAIS
// ======================================================

document
  .querySelectorAll(
    "[data-filter]"
  )
  .forEach(botao => {
    botao.addEventListener(
      "click",
      event => {
        const filtro =
          botao.dataset.filter;

        // ==============================================
        // FAVORITOS
        // ==============================================

        if (
          filtro ===
          "favorites"
        ) {
          event.preventDefault();
          event.stopPropagation();

          modoFavoritos = true;

          esconderCarregandoMais();

          document
            .querySelectorAll(
              ".bottom-item"
            )
            .forEach(item => {
              item.classList.toggle(
                "active",
                item.dataset.filter ===
                  "favorites"
              );
            });

          atualizarTituloFavoritos();

          renderizarProdutos(
            favoritos
          );

          return;
        }

        // ==============================================
        // RADAR INFERIOR
        // AGORA VOLTA PARA O RADAR DE VERDADE
        // ==============================================

        if (
          botao.classList.contains(
            "bottom-item"
          ) &&
          filtro === "all"
        ) {
          event.preventDefault();
          event.stopPropagation();

          filtroAtual =
            "radar";

          buscaDigitada = "";
          nichoAtual = "all";

          if (searchInput) {
            searchInput.value = "";
          }

          if (categoryFilter) {
            categoryFilter.value =
              "all";
          }

          trocarFiltro(
            "radar"
          );

          return;
        }

        trocarFiltro(
          filtro
        );
      }
    );
  });

// ======================================================
// PRÓXIMA PÁGINA
// ======================================================

function carregarProximaPagina() {
  if (
    carregando ||
    modoFavoritos ||
    !temProximaPagina
  ) {
    return;
  }

  carregarProdutos(
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
    passive: true
  }
);

// ======================================================
// MODAL
// ======================================================

if (closeModal) {
  closeModal.addEventListener(
    "click",
    fecharModal
  );
}

if (productModal) {
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
      event.key === "Escape" &&
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

filtroAtual = "radar";
ordenacaoAtual = "relevance";

atualizarFiltroSuperior(
  "radar"
);

atualizarFiltroInferior(
  "radar"
);

reiniciarRadar();
