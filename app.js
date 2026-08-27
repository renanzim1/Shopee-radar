// ======================================================
// SHOPEE RADAR — APP.JS
// Ranking paginado + Busca + Nichos + Favoritos
// Opportunity Score + Crescimento + Scroll infinito
// ======================================================

const API_URL =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-api";

const RANKING_API_URL =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-ranking";

// ======================================================
// CONFIG
// ======================================================

const LIMITE_POR_PAGINA = 20;
const CORTE_OPORTUNIDADE = 25;

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
let ordenacaoAtual = "opportunity";

let modoFavoritos = false;
let usandoRankingServidor = true;

let totalOportunidadesServidor = 0;

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
// FORMATAÇÃO
// ======================================================

function dinheiro(valor) {
  return Number(
    valor || 0
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
    Number(valor || 0);

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

function percentual(valor) {
  let n =
    Number(valor || 0);

  if (n > 0 && n <= 1) {
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
    Number(valor || 0);

  const sinal =
    n > 0 ? "+" : "";

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
    Number(valor || 0);

  if (n > 0 && n <= 1) {
    n *= 100;
  }

  return n;
}

function formatarDecimal(
  valor,
  casas = 2
) {
  return Number(
    valor || 0
  )
    .toFixed(casas)
    .replace(".", ",");
}

// ======================================================
// RADAR SCORE LOCAL
// ======================================================

function calcularScore(produto) {
  const vendas =
    Number(
      produto.sold_count || 0
    );

  const avaliacao =
    Number(
      produto.rating || 0
    );

  const preco =
    Number(
      produto.price || 0
    );

  const ganho =
    Number(
      produto.commission_value ||
        0
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
// CLASSIFICAÇÕES
// ======================================================

function obterClassificacao(score) {
  if (score >= 85) {
    return {
      emoji: "🔥",
      nome: "Forte oportunidade"
    };
  }

  if (score >= 70) {
    return {
      emoji: "💎",
      nome: "Boa oportunidade"
    };
  }

  if (score >= 50) {
    return {
      emoji: "📈",
      nome: "Em observação"
    };
  }

  return {
    emoji: "👀",
    nome: "Baixa prioridade"
  };
}

function obterClassificacaoOportunidade(
  score
) {
  const n =
    Number(score || 0);

  if (n >= 70) {
    return {
      emoji: "🚀",
      nome: "Explodindo"
    };
  }

  if (n >= 45) {
    return {
      emoji: "🔥",
      nome: "Alta oportunidade"
    };
  }

  if (n >= 25) {
    return {
      emoji: "📈",
      nome: "Oportunidade"
    };
  }

  return {
    emoji: "👀",
    nome: "Monitorando"
  };
}

// ======================================================
// TENDÊNCIA
// ======================================================

function obterTendencia(produto) {
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

  const crescimento =
    Number(
      produto
        .crescimento_percentual ||
        0
    );

  const novasVendas =
    Number(
      produto.novas_vendas ||
        0
    );

  if (
    crescimento >= 50 ||
    novasVendas >= 50
  ) {
    return "🔥 SUBINDO RÁPIDO";
  }

  if (
    crescimento > 0 ||
    novasVendas > 0
  ) {
    return "📈 CRESCENDO";
  }

  return "⚪ ESTÁVEL";
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
      Number(
        p.price ??
          p.precoMin ??
          p.priceMin ??
          0
      ),

    price_max:
      Number(
        p.price_max ??
          p.precoMax ??
          p.priceMax ??
          p.price ??
          p.precoMin ??
          p.priceMin ??
          0
      ),

    sold_count:
      Number(
        p.sold_count ??
          p.vendidos ??
          p.sales ??
          0
      ),

    vendas_anterior:
      Number(
        p.vendas_anterior ??
          p.previous_sales ??
          0
      ),

    novas_vendas:
      Number(
        p.novas_vendas ??
          p.new_sales ??
          0
      ),

    vendas_por_hora:
      Number(
        p.vendas_por_hora ??
          p.sales_per_hour ??
          0
      ),

    crescimento_percentual:
      Number(
        p.crescimento_percentual ??
          p.growth_percentage ??
          0
      ),

    rating:
      Number(
        p.rating ??
          p.avaliacao ??
          p.ratingStar ??
          0
      ),

    commission_value:
      Number(
        p.commission_value ??
          p.comissao ??
          p.commission ??
          0
      ),

    commission_rate:
      Number(
        p.commission_rate ??
          p.taxaComissao ??
          p.commissionRate ??
          0
      ),

    radar_score:
      Number(
        p.radar_score ??
          p.radarScore ??
          0
      ),

    opportunity_score:
      Number(
        p.opportunity_score ??
          0
      ),

    tendencia:
      p.tendencia ?? "",

    captura_anterior:
      p.captura_anterior ?? null,

    captured_at:
      p.captured_at ?? null,

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
    obterTendencia(produto);

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

  if (busca && nicho) {
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
// MODO DO RANKING
// ======================================================

function obterModoRanking() {
  if (filtroAtual === "hot") {
    return "sales";
  }

  if (
    filtroAtual ===
    "commission"
  ) {
    return "commission";
  }

  if (
    filtroAtual === "rating"
  ) {
    return "rating";
  }

  if (
    filtroAtual === "growth"
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

  return !temBusca && !temNicho;
}

// ======================================================
// URL
// ======================================================

function montarURL(pagina) {
  usandoRankingServidor =
    deveUsarRankingServidor();

  if (usandoRankingServidor) {
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

  if (filtroAtual === "hot") {
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
    "Melhores oportunidades";
}

// ======================================================
// CONTADORES
// ======================================================

function atualizarContadores() {
  if (totalProdutos) {
    totalProdutos.textContent =
      produtos.length;
  }

  if (
    totalOportunidades
  ) {
    totalOportunidades.textContent =
      totalOportunidadesServidor ||
      produtos.filter(
        produto =>
          Number(
            produto.opportunity_score ||
              0
          ) >=
          CORTE_OPORTUNIDADE
      ).length;
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
        Analisando oportunidades da Shopee...
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

    if (dados.ok === false) {
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
              produto.id ||
                ""
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
      Number(
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

    // Quando estamos na aba
    // Oportunidades, o total retornado
    // pela API é o total REAL.
    if (
      usandoRankingServidor &&
      filtroAtual === "radar"
    ) {
      totalOportunidadesServidor =
        Number(
          dados.total ||
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
// REINICIAR PAGINAÇÃO
// ======================================================

function reiniciarRadar() {
  modoFavoritos = false;

  produtos = [];

  paginaAtual = 1;
  temProximaPagina = true;
  carregando = false;

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

  // No ranking principal,
  // a ordem já vem correta do servidor.
  // Só aplica ordenação local
  // quando o usuário usa os botões
  // "Ordenar por".

  if (
    ordenacaoAtual ===
    "sales"
  ) {
    resultado.sort(
      (a, b) =>
        Number(
          b.sold_count
        ) -
        Number(
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
        Number(
          b.commission_value
        ) -
        Number(
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
        Number(
          b.rating
        ) -
        Number(
          a.rating
        )
    );
  }

  if (
    ordenacaoAtual ===
    "growth"
  ) {
    resultado.sort(
      (a, b) =>
        Number(
          b.novas_vendas
        ) -
        Number(
          a.novas_vendas
        )
    );
  }

  if (
    ordenacaoAtual ===
    "opportunity"
  ) {
    resultado.sort(
      (a, b) =>
        Number(
          b.opportunity_score
        ) -
        Number(
          a.opportunity_score
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
    Number(
      produto.radar_score ||
        0
    );

  const opportunityScore =
    Number(
      produto.opportunity_score ||
        0
    );

  const classificacao =
    obterClassificacao(
      score
    );

  const oportunidade =
    obterClassificacaoOportunidade(
      opportunityScore
    );

  const favoritado =
    estaFavoritado(
      produto.id
    );

  const novasVendas =
    Number(
      produto.novas_vendas ||
        0
    );

  const crescimento =
    Number(
      produto
        .crescimento_percentual ||
        0
    );

  const vendasHora =
    Number(
      produto.vendas_por_hora ||
        0
    );

  const tendencia =
    obterTendencia(
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
          line-height:1;
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
          >
            ${
              opportunityScore >=
              CORTE_OPORTUNIDADE
                ? `${oportunidade.emoji} ${oportunidade.nome}`
                : `${classificacao.emoji} ${classificacao.nome}`
            }
          </span>

          <span
            class="score-badge"
          >
            ${Math.round(
              score
            )}/100
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
            margin-top:10px;
            padding:9px 11px;
            border-radius:10px;
            background:rgba(255,90,31,.08);
            border:1px solid rgba(255,90,31,.18);
            font-size:12px;
          "
        >
          🎯 Opportunity Score:

          <strong>
            ${formatarDecimal(
              opportunityScore
            )}
          </strong>
        </div>

        <div
          style="
            margin-top:10px;
            font-size:12px;
            font-weight:800;
          "
        >
          ${escapar(
            tendencia
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
              ⭐ ${Number(
                produto.rating
              ).toFixed(1)}
            </strong>
          </div>

        </div>

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:10px;
            margin-top:12px;
            padding-top:12px;
            border-top:1px solid rgba(255,255,255,.07);
            font-size:12px;
            min-height:58px;
          "
        >

          <div>
            <small>
              CRESCIMENTO
            </small>

            <div
              style="
                margin-top:3px;
                font-weight:800;
              "
            >
              ${percentualCrescimento(
                crescimento
              )}
            </div>
          </div>

          <div
            style="
              text-align:right;
            "
          >
            <small>
              VENDAS/H
            </small>

            <div
              style="
                margin-top:3px;
                font-weight:800;
              "
            >
              ${formatarDecimal(
                vendasHora
              )}
            </div>
          </div>

        </div>

        <div
          class="product-footer"
        >

          <div>
            <small>
              RADAR SCORE
            </small>

            <strong>
              ${Math.round(
                score
              )}
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

  if (!listaUnica.length) {
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
            "Nenhuma oportunidade encontrada";
        }

        if (texto) {
          texto.textContent =
            "Ainda não existem oportunidades suficientes neste momento.";
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
// ANÁLISE DO MODAL
// ======================================================

function analisarScore(produto) {
  const motivos = [];

  const novasVendas =
    Number(
      produto.novas_vendas ||
        0
    );

  const crescimento =
    Number(
      produto
        .crescimento_percentual ||
        0
    );

  const vendasHora =
    Number(
      produto.vendas_por_hora ||
        0
    );

  const vendas =
    Number(
      produto.sold_count ||
        0
    );

  const avaliacao =
    Number(
      produto.rating ||
        0
    );

  if (novasVendas > 0) {
    motivos.push(
      `📈 +${formatarNumero(
        novasVendas
      )} novas vendas`
    );
  }

  if (crescimento > 0) {
    motivos.push(
      `🚀 Crescimento de ${percentualCrescimento(
        crescimento
      )}`
    );
  }

  if (vendasHora > 0) {
    motivos.push(
      `⚡ ${formatarDecimal(
        vendasHora
      )} vendas/h`
    );
  }

  if (vendas >= 1000) {
    motivos.push(
      "✓ Demanda comprovada"
    );
  }

  if (avaliacao >= 4.8) {
    motivos.push(
      "⭐ Excelente avaliação"
    );
  }

  if (!motivos.length) {
    motivos.push(
      "👀 Produto ainda em monitoramento"
    );
  }

  return motivos;
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

  const score =
    Number(
      produto.radar_score ||
        0
    );

  const opportunityScore =
    Number(
      produto.opportunity_score ||
        0
    );

  const oportunidade =
    obterClassificacaoOportunidade(
      opportunityScore
    );

  const tendencia =
    obterTendencia(
      produto
    );

  const motivos =
    analisarScore(
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

    <p>
      🏪 ${escapar(
        produto.shop_name
      )}
    </p>

    <div
      style="
        margin-top:16px;
        padding:15px;
        background:#11151f;
        border-radius:14px;
      "
    >
      <small>
        OPPORTUNITY SCORE
      </small>

      <div
        style="
          margin-top:6px;
          display:flex;
          justify-content:space-between;
          gap:10px;
        "
      >
        <strong
          style="
            font-size:26px;
          "
        >
          ${formatarDecimal(
            opportunityScore
          )}
        </strong>

        <strong>
          ${oportunidade.emoji}
          ${oportunidade.nome}
        </strong>
      </div>
    </div>

    <div
      style="
        margin-top:12px;
        padding:12px 15px;
        background:rgba(255,255,255,.04);
        border-radius:12px;
        font-weight:800;
      "
    >
      ${escapar(
        tendencia
      )}
    </div>

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
        ${formatarNumero(
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
        ⭐ ${Number(
          produto.rating ||
            0
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

      <p>
        <strong>Radar Score:</strong>
        ${Math.round(
          score
        )}/100
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
        Por que o Radar destacou este produto?
      </strong>

      <div
        style="
          margin-top:10px;
          display:flex;
          flex-direction:column;
          gap:7px;
        "
      >
        ${motivos
          .map(
            motivo => `
              <div>
                ${escapar(
                  motivo
                )}
              </div>
            `
          )
          .join("")}
      </div>
    </div>

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
      item.classList.toggle(
        "active",
        item.dataset.filter ===
          filtro
      );
    });
}

// ======================================================
// TROCAR FILTRO
// ======================================================

function trocarFiltro(filtro) {
  if (!filtro) return;

  if (filtro === "all") {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    return;
  }

  modoFavoritos = false;

  filtroAtual =
    filtro;

  if (filtro === "hot") {
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
      "opportunity";
  }

  atualizarFiltroSuperior(
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

  // IMPORTANTE:
  // ao trocar de aba,
  // zera tudo e busca
  // somente os primeiros 20.

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
          "opportunity";

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

        // RADAR INFERIOR
        // somente volta ao topo

        if (
          botao.classList.contains(
            "bottom-item"
          ) &&
          filtro === "all"
        ) {
          event.preventDefault();
          event.stopPropagation();

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });

          return;
        }

        // FAVORITOS

        if (
          filtro === "favorites"
        ) {
          event.preventDefault();
          event.stopPropagation();

          modoFavoritos = true;

          esconderCarregandoMais();

          atualizarTituloFavoritos();

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
// PROTEÇÃO DO RADAR INFERIOR
// ======================================================

document
  .querySelectorAll(
    ".bottom-item"
  )
  .forEach(botao => {
    if (
      botao.dataset.filter ===
      "all"
    ) {
      botao.addEventListener(
        "click",
        event => {
          event.preventDefault();
        }
      );
    }
  });

// ======================================================
// INICIALIZAÇÃO
// ======================================================

filtroAtual = "radar";
ordenacaoAtual = "opportunity";

atualizarFiltroSuperior(
  "radar"
);

reiniciarRadar();
