// ======================================================
// SHOPEE RADAR — APP.JS
// API Shopee + Nichos + Ranking + Scroll infinito
// Favoritos + RADAR SCORE V2
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
let ordenacaoAtual = "radar";
let modoFavoritos = false;

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
  console.error("Erro ao carregar favoritos:", erro);
  favoritos = [];
}

function salvarFavoritos() {
  try {
    localStorage.setItem(
      "shopeeRadarFavoritos",
      JSON.stringify(favoritos)
    );
  } catch (erro) {
    console.error("Erro ao salvar favoritos:", erro);
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
  document.getElementById("totalOportunidades");

const totalVideos =
  document.getElementById("totalVideos");

const searchInput =
  document.getElementById("searchInput");

const categoryFilter =
  document.getElementById("categoryFilter");

const productModal =
  document.getElementById("productModal");

const modalBody =
  document.getElementById("modalBody");

const closeModal =
  document.getElementById("closeModal");

const resultsTitle =
  document.getElementById("resultsTitle");

const infiniteLoader =
  document.getElementById("infiniteLoader");

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
  return Number(valor || 0)
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
}

function formatarNumero(valor) {
  const n = Number(valor || 0);

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
        .toFixed(n >= 10000 ? 0 : 1)
        .replace(".", ",") +
      " mil"
    );
  }

  return n.toLocaleString("pt-BR");
}

function percentual(valor) {
  let n = Number(valor || 0);

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

function normalizarPercentual(valor) {
  let n = Number(valor || 0);

  if (n > 0 && n <= 1) {
    n *= 100;
  }

  return n;
}

// ======================================================
// RADAR SCORE V2
//
// 30 pts — Demanda
// 20 pts — Avaliação
// 25 pts — Comissão %
// 15 pts — Ganho estimado por venda
// 10 pts — Faixa de preço
//
// TOTAL = 100
// ======================================================

function calcularScore(produto) {

  const vendas =
    Number(produto.sold_count || 0);

  const avaliacao =
    Number(produto.rating || 0);

  const preco =
    Number(produto.price || 0);

  const ganho =
    Number(produto.commission_value || 0);

  const comissao =
    normalizarPercentual(
      produto.commission_rate
    );

  let demandaPts = 0;
  let avaliacaoPts = 0;
  let comissaoPts = 0;
  let ganhoPts = 0;
  let precoPts = 0;

  // ====================================================
  // DEMANDA — MÁXIMO 30
  // ====================================================

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

  // ====================================================
  // AVALIAÇÃO — MÁXIMO 20
  // ====================================================

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

  // ====================================================
  // COMISSÃO — MÁXIMO 25
  // ====================================================

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

  // ====================================================
  // GANHO POR VENDA — MÁXIMO 15
  // ====================================================

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

  // ====================================================
  // FAIXA DE PREÇO — MÁXIMO 10
  // ====================================================

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
  } else if (preco > 800) {
    precoPts = 2;
  }

  const total =
    demandaPts +
    avaliacaoPts +
    comissaoPts +
    ganhoPts +
    precoPts;

  return Math.min(
    100,
    Math.max(0, total)
  );
}

// ======================================================
// EXPLICAÇÃO DO SCORE
// ======================================================

function analisarScore(produto) {

  const vendas =
    Number(produto.sold_count || 0);

  const avaliacao =
    Number(produto.rating || 0);

  const ganho =
    Number(produto.commission_value || 0);

  const preco =
    Number(produto.price || 0);

  const comissao =
    normalizarPercentual(
      produto.commission_rate
    );

  const motivos = [];

  // DEMANDA

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

  // AVALIAÇÃO

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

  // COMISSÃO

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

  // GANHO

  if (ganho >= 20) {
    motivos.push(
      "💵 Excelente ganho por venda"
    );
  } else if (ganho >= 5) {
    motivos.push(
      "✓ Bom ganho estimado"
    );
  }

  // PREÇO

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

  return motivos;
}

// ======================================================
// CLASSIFICAÇÃO
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
// NORMALIZAÇÃO DO PRODUTO
// ======================================================

function normalizarProduto(p) {

  const produto = {

    id:
      p.id ||
      p.itemId ||
      "",

    name:
      p.nome ||
      p.productName ||
      "Produto Shopee",

    image_url:
      p.imagem ||
      p.imageUrl ||
      "",

    price:
      Number(
        p.precoMin ??
        p.priceMin ??
        0
      ),

    price_max:
      Number(
        p.precoMax ??
        p.priceMax ??
        p.precoMin ??
        p.priceMin ??
        0
      ),

    sold_count:
      Number(
        p.vendidos ??
        p.sales ??
        0
      ),

    rating:
      Number(
        p.avaliacao ??
        p.ratingStar ??
        0
      ),

    commission_value:
      Number(
        p.comissao ??
        p.commission ??
        0
      ),

    commission_rate:
      Number(
        p.taxaComissao ??
        p.commissionRate ??
        0
      ),

    seller_commission:
      Number(
        p.taxaComissaoVendedor ??
        p.sellerCommissionRate ??
        0
      ),

    shopee_commission:
      Number(
        p.taxaComissaoShopee ??
        p.shopeeCommissionRate ??
        0
      ),

    radar_score: 0,

    shop_name:
      p.loja ||
      p.shopName ||
      "Shopee",

    shop_id:
      p.lojaId ||
      p.shopId ||
      "",

    shop_type:
      p.tipoLoja ||
      p.shopType ||
      "",

    product_url:
      p.linkProduto ||
      p.productLink ||
      "",

    affiliate_url:
      p.linkAfiliado ||
      p.offerLink ||
      p.linkProduto ||
      p.productLink ||
      ""
  };

  // IMPORTANTE:
  // Sempre calculamos o Score V2 aqui.
  // Ignoramos o score antigo da API.

  produto.radar_score =
    calcularScore(produto);

  return produto;
}

// ======================================================
// BUSCA ATUAL
// ======================================================

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

  return "";
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
    categoryFilter &&
    nichoAtual !== "all"
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

  resultsTitle.textContent =
    "Melhores oportunidades";
}

// ======================================================
// URL API
// ======================================================

function montarURL(pagina) {

  const url =
    new URL(API_URL);

  url.searchParams.set(
    "page",
    String(pagina)
  );

  url.searchParams.set(
    "limit",
    "20"
  );

  const keyword =
    obterKeywordAtual();

  if (keyword) {
    url.searchParams.set(
      "keyword",
      keyword
    );
  }

  return url.toString();
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
      style="grid-column:1/-1;"
    >
      <div class="loader"></div>

      <p>
        Consultando produtos na Shopee...
      </p>
    </div>
  `;
}

function mostrarCarregandoMais() {

  if (infiniteLoader) {
    infiniteLoader.hidden = false;
  }
}

function esconderCarregandoMais() {

  if (infiniteLoader) {
    infiniteLoader.hidden = true;
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
    .getElementById("retryButton")
    ?.addEventListener(
      "click",
      reiniciarRadar
    );
}

// ======================================================
// CONSULTAR SHOPEE
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

    if (!resposta.ok) {
      throw new Error(
        `Erro ${resposta.status} ao consultar a API`
      );
    }

    const dados =
      await resposta.json();

    if (dados.ok === false) {
      throw new Error(
        dados.erro ||
        "A Shopee recusou a consulta."
      );
    }

    const lista =
      Array.isArray(dados.produtos)
        ? dados.produtos
        : [];

    let novos =
      lista.map(
        normalizarProduto
      );

    // NÃO DUPLICAR

    if (adicionar) {

      const existentes =
        new Set(
          produtos.map(
            p => String(p.id)
          )
        );

      novos =
        novos.filter(
          p =>
            !existentes.has(
              String(p.id)
            )
        );

      produtos.push(
        ...novos
      );

    } else {

      produtos = novos;
    }

    // PAGINAÇÃO

    paginaAtual =
      Number(
        dados.paginaAtual ??
        dados.pagina?.page ??
        pagina
      );

    temProximaPagina =
      Boolean(
        dados.temProximaPagina ??
        dados.pagina?.hasNextPage ??
        false
      );

    atualizarContadores();
    atualizarTitulo();
    aplicarOrdenacao();

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
// REINICIAR RADAR
// ======================================================

function reiniciarRadar() {

  modoFavoritos = false;

  produtos = [];

  paginaAtual = 1;
  temProximaPagina = true;

  atualizarTitulo();

  carregarProdutos(
    1,
    false
  );
}

// ======================================================
// PRÓXIMA PÁGINA
// ======================================================

function carregarProximaPagina() {

  if (
    modoFavoritos ||
    carregando ||
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
// CONTADORES
// ======================================================

function atualizarContadores() {

  const oportunidades =
    produtos.filter(
      p =>
        Number(
          p.radar_score
        ) >= 70
    );

  if (totalProdutos) {
    totalProdutos.textContent =
      produtos.length;
  }

  if (totalOportunidades) {
    totalOportunidades.textContent =
      oportunidades.length;
  }

  if (totalVideos) {
    totalVideos.textContent =
      produtos.length;
  }
}

// ======================================================
// ORDENAÇÃO
// ======================================================

function aplicarOrdenacao() {

  if (modoFavoritos) {

    renderizarProdutos(
      favoritos
    );

    return;
  }

  let resultado =
    [...produtos];

  switch (ordenacaoAtual) {

    case "relevance":
      // Ordem original enviada pela Shopee
      break;

    case "sales":

      resultado.sort(
        (a, b) =>
          b.sold_count -
          a.sold_count
      );

      break;

    case "commission":

      resultado.sort(
        (a, b) =>
          normalizarPercentual(
            b.commission_rate
          ) -
          normalizarPercentual(
            a.commission_rate
          )
      );

      break;

    case "rating":

      resultado.sort(
        (a, b) =>
          b.rating -
          a.rating
      );

      break;

    case "radar":
    default:

      resultado.sort(
        (a, b) =>
          b.radar_score -
          a.radar_score
      );

      break;
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
      produto.radar_score || 0
    );

  const classificacao =
    obterClassificacao(score);

  const favoritado =
    estaFavoritado(produto.id);

  return `
    <article
      class="product-card"
      data-id="${escapar(produto.id)}"
      style="position:relative;"
    >

      <button
        class="favorite-btn"
        data-favorite-id="${escapar(produto.id)}"
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
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
        "
      >
        ${favoritado ? "♥" : "♡"}
      </button>

      ${
        produto.image_url
          ? `
          <img
            class="product-image"
            src="${escapar(produto.image_url)}"
            alt="${escapar(produto.name)}"
            loading="lazy"
          >
          `
          : ""
      }

      <div class="product-card-content">

        <div class="product-card-top">

          <span class="opportunity-badge">
            ${classificacao.emoji}
            ${classificacao.nome}
          </span>

          <span class="score-badge">
            ${score}/100
          </span>

        </div>

        <h3 class="product-name">
          ${escapar(produto.name)}
        </h3>

        <div class="product-shop">
          🏪 ${escapar(produto.shop_name)}
        </div>

        <div class="product-stats">

          <div class="product-stat">

            <span>
              VENDIDOS
            </span>

            <strong>
              ${formatarNumero(
                produto.sold_count
              )}
            </strong>

          </div>

          <div class="product-stat">

            <span>
              AVALIAÇÃO
            </span>

            <strong>
              ⭐ ${Number(
                produto.rating
              ).toFixed(1)}
            </strong>

          </div>

          <div class="product-stat">

            <span>
              COMISSÃO
            </span>

            <strong>
              ${percentual(
                produto.commission_rate
              )}
            </strong>

          </div>

        </div>

        <div class="product-footer">

          <div>

            <small>
              RADAR SCORE V2
            </small>

            <strong>
              ${score}
            </strong>

          </div>

          <div class="product-price">

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

        ${
          produto.commission_value > 0
            ? `
            <div
              style="
                margin-top:10px;
                font-size:12px;
                opacity:.85;
              "
            >
              💰 Ganho estimado:
              <strong>
                ${dinheiro(
                  produto.commission_value
                )}
              </strong>
            </div>
            `
            : ""
        }

      </div>

    </article>
  `;
}

// ======================================================
// RENDER
// ======================================================

function renderizarProdutos(lista) {

  if (!productsGrid) return;

  if (!lista.length) {

    productsGrid.innerHTML = "";

    if (emptyState) {

      emptyState.hidden = false;

      const titulo =
        emptyState.querySelector("h3");

      const texto =
        emptyState.querySelector("p");

      if (modoFavoritos) {

        if (titulo) {
          titulo.textContent =
            "Nenhum favorito ainda";
        }

        if (texto) {
          texto.textContent =
            "Toque no coração de um produto para salvá-lo aqui.";
        }

      } else {

        if (titulo) {
          titulo.textContent =
            "Nenhum produto encontrado";
        }

        if (texto) {
          texto.textContent =
            "Tente mudar sua pesquisa ou selecionar outro nicho.";
        }
      }
    }

    return;
  }

  if (emptyState) {
    emptyState.hidden = true;
  }

  productsGrid.innerHTML =
    lista
      .map(criarCard)
      .join("");

  // ABRIR PRODUTO

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
            abrirModal(produto);
          }
        }
      );
    });

  // FAVORITAR

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
            botao.dataset.favoriteId
          );
        }
      );
    });
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
    estaFavoritado(produto.id);

  const score =
    Number(
      produto.radar_score || 0
    );

  const classificacao =
    obterClassificacao(score);

  const motivos =
    analisarScore(produto);

  modalBody.innerHTML = `

    ${
      produto.image_url
        ? `
        <img
          src="${escapar(
            produto.image_url
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
      ${escapar(produto.name)}
    </h2>

    <p style="margin-top:8px;">
      🏪 ${escapar(
        produto.shop_name
      )}
    </p>

    <div
      style="
        margin-top:18px;
        padding:15px;
        background:#11151f;
        border:1px solid rgba(255,255,255,.08);
        border-radius:14px;
      "
    >

      <div
        style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        "
      >

        <div>

          <small
            style="
              display:block;
              opacity:.6;
              margin-bottom:4px;
            "
          >
            RADAR SCORE V2
          </small>

          <strong
            style="
              font-size:26px;
            "
          >
            ${score}/100
          </strong>

        </div>

        <strong>
          ${classificacao.emoji}
          ${classificacao.nome}
        </strong>

      </div>

    </div>

    <div style="margin-top:20px;">

      <p>
        <strong>Preço:</strong>
        ${dinheiro(produto.price)}
      </p>

      <p>
        <strong>Vendidos:</strong>
        ${formatarNumero(
          produto.sold_count
        )}
      </p>

      <p>
        <strong>Avaliação:</strong>
        ⭐ ${Number(
          produto.rating
        ).toFixed(1)}
      </p>

      <p>
        <strong>Taxa de comissão:</strong>
        ${percentual(
          produto.commission_rate
        )}
      </p>

      <p>
        <strong>Comissão estimada:</strong>
        ${dinheiro(
          produto.commission_value
        )}
      </p>

    </div>

    <div
      style="
        margin-top:20px;
        padding:15px;
        background:#11151f;
        border-radius:14px;
      "
    >

      <strong>
        Por que recebeu essa nota?
      </strong>

      <div
        style="
          margin-top:10px;
          display:flex;
          flex-direction:column;
          gap:7px;
          font-size:14px;
        "
      >

        ${motivos
          .map(
            motivo => `
              <div>
                ${escapar(motivo)}
              </div>
            `
          )
          .join("")}

      </div>

    </div>

    <button
      id="modalFavoriteButton"
      data-id="${escapar(produto.id)}"
      style="
        width:100%;
        margin-top:20px;
        padding:14px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.15);
        background:#151821;
        color:white;
        font-weight:800;
        cursor:pointer;
      "
    >
      ${
        favoritado
          ? "♥ Remover dos favoritos"
          : "♡ Salvar nos favoritos"
      }
    </button>

    ${
      produto.affiliate_url
        ? `
        <a
          href="${escapar(
            produto.affiliate_url
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

  const modalFavoriteButton =
    document.getElementById(
      "modalFavoriteButton"
    );

  if (modalFavoriteButton) {

    modalFavoriteButton.addEventListener(
      "click",
      () => {

        alternarFavorito(
          modalFavoriteButton.dataset.id
        );

        const atualizado =
          encontrarProduto(
            modalFavoriteButton.dataset.id
          );

        if (atualizado) {
          abrirModal(atualizado);
        } else {
          fecharModal();
        }
      }
    );
  }

  productModal.hidden = false;
}

function fecharModal() {

  if (productModal) {
    productModal.hidden = true;
  }
}

// ======================================================
// PESQUISA
// ======================================================

if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        buscaDigitada =
          searchInput.value.trim();

        modoFavoritos = false;

        reiniciarRadar();
      }
    }
  );

  searchInput.addEventListener(
    "search",
    () => {

      if (!searchInput.value) {

        buscaDigitada = "";

        modoFavoritos = false;

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

      modoFavoritos = false;

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

        modoFavoritos = false;

        ordenacaoAtual =
          botao.dataset.sort;

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

        atualizarTitulo();

        aplicarOrdenacao();
      }
    );
  });

// ======================================================
// ABAS SUPERIORES + MENU MOBILE
// ======================================================

document
  .querySelectorAll(
    "[data-filter]"
  )
  .forEach(botao => {

    botao.addEventListener(
      "click",
      () => {

        const filtro =
          botao.dataset.filter;

        // FAVORITOS

        if (filtro === "favorites") {

          modoFavoritos = true;

          esconderCarregandoMais();

          document
            .querySelectorAll(
              "[data-filter]"
            )
            .forEach(item => {

              item.classList.toggle(
                "active",
                item.dataset.filter ===
                  "favorites"
              );
            });

          document
            .querySelectorAll(
              "[data-sort]"
            )
            .forEach(item => {

              item.classList.remove(
                "active"
              );
            });

          atualizarTituloFavoritos();

          renderizarProdutos(
            favoritos
          );

          return;
        }

        // RADAR NORMAL

        modoFavoritos = false;

        let sort =
          "radar";

        if (filtro === "hot") {
          sort = "sales";
        }

        if (filtro === "commission") {
          sort = "commission";
        }

        if (filtro === "rating") {
          sort = "rating";
        }

        ordenacaoAtual =
          sort;

        document
          .querySelectorAll(
            "[data-filter]"
          )
          .forEach(item => {

            item.classList.toggle(
              "active",
              item.dataset.filter ===
                filtro
            );
          });

        document
          .querySelectorAll(
            "[data-sort]"
          )
          .forEach(item => {

            item.classList.toggle(
              "active",
              item.dataset.sort ===
                sort
            );
          });

        atualizarTitulo();

        aplicarOrdenacao();
      }
    );
  });

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

// ======================================================
// ROLAGEM INFINITA
// ======================================================

window.addEventListener(
  "scroll",
  () => {

    if (modoFavoritos) {
      return;
    }

    const posicao =
      window.innerHeight +
      window.scrollY;

    const altura =
      document.documentElement
        .scrollHeight;

    if (
      posicao >=
      altura - 800
    ) {
      carregarProximaPagina();
    }
  },
  {
    passive: true
  }
);

// ======================================================
// INICIAR
// ======================================================

reiniciarRadar();
