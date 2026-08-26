// ======================================================
// SHOPEE RADAR — APP.JS
// Busca + Nichos + Ranking Inteligente + Favoritos
// Scroll infinito + Radar Score + Opportunity Score
// ======================================================

const API_URL =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-api";

// ======================================================
// ESTADO
// ======================================================

let produtos = [];

let paginaAtual = 1;
let temProximaPagina = true;
let carregando = false;

let buscaDigitada = "";
let nichoAtual = "all";

// radar | opportunity | growth | sales | commission | rating | relevance
let ordenacaoAtual = "radar";

// radar | hot | commission | rating | growth
let filtroAtual = "radar";

let modoFavoritos = false;
let usandoRankingServidor = true;

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
      String(produto.id) === String(id)
  );
}

function encontrarProduto(id) {
  return (
    produtos.find(
      produto =>
        String(produto.id) === String(id)
    ) ||
    favoritos.find(
      produto =>
        String(produto.id) === String(id)
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
          String(item.id) !== String(id)
      );
  } else {
    favoritos.unshift({
      ...produto
    });
  }

  salvarFavoritos();

  if (modoFavoritos) {
    atualizarTituloFavoritos();
    renderizarProdutos(favoritos);
  } else {
    aplicarOrdenacao();
  }
}

// ======================================================
// ELEMENTOS
// ======================================================

const productsGrid =
  document.getElementById("productsGrid");

const emptyState =
  document.getElementById("emptyState");

const totalProdutos =
  document.getElementById("totalProdutos");

const totalOportunidades =
  document.getElementById(
    "totalOportunidades"
  );

const totalVideos =
  document.getElementById("totalVideos");

const searchInput =
  document.getElementById("searchInput");

const categoryFilter =
  document.getElementById(
    "categoryFilter"
  );

const productModal =
  document.getElementById(
    "productModal"
  );

const modalBody =
  document.getElementById("modalBody");

const closeModal =
  document.getElementById("closeModal");

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
      produto.commission_value || 0
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
// ANÁLISE INTELIGENTE
// ======================================================

function analisarScore(produto) {
  const vendas =
    Number(produto.sold_count || 0);

  const novasVendas =
    Number(produto.novas_vendas || 0);

  const crescimento =
    Number(
      produto.crescimento_percentual || 0
    );

  const vendasHora =
    Number(produto.vendas_por_hora || 0);

  const avaliacao =
    Number(produto.rating || 0);

  const ganho =
    Number(
      produto.commission_value || 0
    );

  const preco =
    Number(produto.price || 0);

  const comissao =
    normalizarPercentual(
      produto.commission_rate
    );

  const opportunityScore =
    Number(
      produto.opportunity_score || 0
    );

  const motivos = [];

  if (novasVendas >= 50) {
    motivos.push(
      "🚀 Produto ganhando muitas vendas"
    );
  } else if (novasVendas >= 10) {
    motivos.push(
      "🔥 Produto em crescimento"
    );
  } else if (novasVendas > 0) {
    motivos.push(
      `📈 +${formatarNumero(
        novasVendas
      )} novas vendas`
    );
  }

  if (crescimento >= 50) {
    motivos.push(
      "🚀 Crescimento muito forte"
    );
  } else if (crescimento >= 20) {
    motivos.push(
      "🔥 Crescimento acelerado"
    );
  } else if (crescimento > 0) {
    motivos.push(
      "📈 Crescimento positivo"
    );
  }

  if (vendasHora >= 10) {
    motivos.push(
      "⚡ Alta velocidade de vendas"
    );
  } else if (vendasHora > 0) {
    motivos.push(
      `⚡ ${formatarDecimal(
        vendasHora
      )} vendas/h`
    );
  }

  if (vendas >= 5000) {
    motivos.push(
      "🔥 Demanda muito forte"
    );
  } else if (vendas >= 1000) {
    motivos.push(
      "✓ Demanda comprovada"
    );
  } else if (vendas >= 100) {
    motivos.push(
      "✓ Produto já possui procura"
    );
  } else {
    motivos.push(
      "👀 Demanda ainda pequena"
    );
  }

  if (avaliacao >= 4.8) {
    motivos.push(
      "⭐ Excelente avaliação"
    );
  } else if (avaliacao >= 4.5) {
    motivos.push(
      "✓ Boa avaliação"
    );
  } else if (avaliacao > 0) {
    motivos.push(
      "⚠️ Avaliação pode melhorar"
    );
  }

  if (comissao >= 10) {
    motivos.push(
      "💰 Comissão muito atrativa"
    );
  } else if (comissao >= 5) {
    motivos.push(
      "✓ Comissão interessante"
    );
  } else if (comissao > 0) {
    motivos.push(
      "👀 Comissão relativamente baixa"
    );
  }

  if (ganho >= 20) {
    motivos.push(
      "💵 Excelente ganho por venda"
    );
  } else if (ganho >= 5) {
    motivos.push(
      "✓ Bom ganho estimado"
    );
  }

  if (
    preco >= 20 &&
    preco <= 100
  ) {
    motivos.push(
      "🛒 Faixa de preço favorável"
    );
  } else if (preco > 400) {
    motivos.push(
      "👀 Ticket mais alto"
    );
  }

  if (opportunityScore >= 50) {
    motivos.unshift(
      "🎯 Forte sinal de oportunidade"
    );
  }

  return motivos;
}

// ======================================================
// CLASSIFICAÇÃO RADAR
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

// ======================================================
// CLASSIFICAÇÃO OPPORTUNITY SCORE
// ======================================================

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
    String(produto.tendencia).trim()
  ) {
    return String(
      produto.tendencia
    ).trim();
  }

  const crescimento =
    Number(
      produto.crescimento_percentual || 0
    );

  const novasVendas =
    Number(
      produto.novas_vendas || 0
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
