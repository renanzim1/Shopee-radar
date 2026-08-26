// ======================================================
// SHOPEE RADAR — APP.JS
// Shopee Affiliate API + Supabase Edge Function
// Paginação + rolagem infinita + filtros
// ======================================================

const API_URL =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-api";

// ======================================================
// ESTADO
// ======================================================

let produtos = [];
let filtroAtual = "all";
let ultimaBusca = "";

let paginaAtual = 1;
let temProximaPagina = true;
let carregando = false;

// ======================================================
// ELEMENTOS
// ======================================================

const productsGrid = document.getElementById("productsGrid");
const emptyState = document.getElementById("emptyState");

const totalProdutos = document.getElementById("totalProdutos");
const totalOportunidades = document.getElementById("totalOportunidades");
const totalVideos = document.getElementById("totalVideos");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");

const productModal = document.getElementById("productModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

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
  const numero = Number(valor || 0);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarNumero(valor) {
  const n = Number(valor || 0);

  if (n >= 1000000) {
    return (n / 1000000)
      .toFixed(1)
      .replace(".", ",") + " mi";
  }

  if (n >= 1000) {
    return (n / 1000)
      .toFixed(n >= 10000 ? 0 : 1)
      .replace(".", ",") + " mil";
  }

  return n.toLocaleString("pt-BR");
}

function percentual(valor) {
  let numero = Number(valor || 0);

  // A API pode retornar 0.15 = 15%
  if (numero > 0 && numero <= 1) {
    numero *= 100;
  }

  return numero
    .toFixed(2)
    .replace(".", ",") + "%";
}

// ======================================================
// NORMALIZAR PRODUTO
// ======================================================

function normalizarProduto(p) {
  return {
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

    // VALOR DA COMISSÃO EM R$
    commission_value:
      Number(
        p.comissao ??
        p.commission ??
        0
      ),

    // TAXA TOTAL DA COMISSÃO
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

    radar_score:
      Number(
        p.radarScore ??
        p.radar_score ??
        0
      ),

    shop_name:
      p.loja ||
      p.shopName ||
      "Shopee",

    shop_id:
      p.lojaId ||
      p.shopId ||
      "",

    category:
      p.tipoLoja ||
      p.shopType ||
      "Shopee",

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
}

// ======================================================
// SCORE LOCAL DE SEGURANÇA
// Usado somente se a API não enviar radarScore
// ======================================================

function calcularScore(produto) {
  const vendas = Number(produto.sold_count || 0);
  const avaliacao = Number(produto.rating || 0);

  let comissao = Number(produto.commission_rate || 0);

  if (comissao > 0 && comissao <= 1) {
    comissao *= 100;
  }

  let score = 0;

  // Vendas — 50 pontos
  if (vendas >= 10000) score += 50;
  else if (vendas >= 5000) score += 45;
  else if (vendas >= 1000) score += 38;
  else if (vendas >= 500) score += 30;
  else if (vendas >= 100) score += 20;
  else score += 10;

  // Avaliação — 25 pontos
  if (avaliacao >= 4.8) score += 25;
  else if (avaliacao >= 4.6) score += 22;
  else if (avaliacao >= 4.4) score += 18;
  else if (avaliacao >= 4) score += 12;

  // Comissão — 25 pontos
  if (comissao >= 10) score += 25;
  else if (comissao >= 7) score += 22;
  else if (comissao >= 5) score += 18;
  else if (comissao >= 3) score += 12;
  else if (comissao > 0) score += 7;

  return Math.min(100, score);
}

// ======================================================
// LOADING INICIAL
// ======================================================

function mostrarCarregandoInicial() {
  if (!productsGrid) return;

  if (emptyState) {
    emptyState.hidden = true;
  }

  productsGrid.innerHTML = `
    <div class="loading">
      <div class="loader"></div>
      <p>Buscando oportunidades na Shopee...</p>
    </div>
  `;
}

// ======================================================
// LOADING DA PRÓXIMA PÁGINA
// ======================================================

function mostrarCarregandoMais() {
  removerCarregandoMais();

  const loading = document.createElement("div");

  loading.id = "loadingMore";
  loading.style.cssText = `
    grid-column:1/-1;
    text-align:center;
    padding:25px;
    font-weight:600;
    opacity:.8;
  `;

  loading.innerHTML = `
    <div class="loader" style="margin:0 auto 10px;"></div>
    <p>Carregando mais produtos...</p>
  `;

  productsGrid.appendChild(loading);
}

function removerCarregandoMais() {
  const loading =
    document.getElementById("loadingMore");

  if (loading) {
    loading.remove();
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
      <div style="font-size:42px;">⚠️</div>

      <h3>Não foi possível carregar o radar</h3>

      <p>${escapar(mensagem)}</p>

      <button
        id="retryButton"
        style="
          margin-top:16px;
          padding:12px 18px;
          border:0;
          border-radius:12px;
          background:#ff5a1f;
          color:#fff;
          font-weight:700;
          cursor:pointer;
        "
      >
        Tentar novamente
      </button>
    </div>
  `;

  const retry =
    document.getElementById("retryButton");

  if (retry) {
    retry.addEventListener("click", () => {
      novaBusca(ultimaBusca);
    });
  }
}

// ======================================================
// MONTAR URL
// ======================================================

function montarURL(keyword, pagina) {
  const url = new URL(API_URL);

  url.searchParams.set(
    "page",
    String(pagina)
  );

  if (keyword) {
    url.searchParams.set(
      "keyword",
      keyword
    );
  }

  return url.toString();
}

// ======================================================
// BUSCAR PRODUTOS
// ======================================================

async function carregarProdutos({
  keyword = ultimaBusca,
  pagina = paginaAtual,
  adicionar = false
} = {}) {

  if (carregando) return;

  if (adicionar && !temProximaPagina) {
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
      montarURL(keyword, pagina);

    console.log(
      "Buscando página:",
      pagina,
      url
    );

    const resposta = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!resposta.ok) {
      const texto =
        await resposta.text();

      console.error(
        "ERRO API:",
        resposta.status,
        texto
      );

      throw new Error(
        `API respondeu com erro ${resposta.status}`
      );
    }

    const dados =
      await resposta.json();

    console.log(
      "RESPOSTA SHOPEE:",
      dados
    );

    if (dados.ok === false) {
      throw new Error(
        dados.erro ||
        dados.error ||
        "A Shopee retornou um erro."
      );
    }

    let lista = [];

    if (Array.isArray(dados.produtos)) {
      lista = dados.produtos;
    }

    else if (
      dados.shopee?.data?.productOfferV2?.nodes &&
      Array.isArray(
        dados.shopee.data.productOfferV2.nodes
      )
    ) {
      lista =
        dados.shopee.data.productOfferV2.nodes;
    }

    else if (
      dados.data?.productOfferV2?.nodes &&
      Array.isArray(
        dados.data.productOfferV2.nodes
      )
    ) {
      lista =
        dados.data.productOfferV2.nodes;
    }

    let novosProdutos =
      lista.map(normalizarProduto);

    // Caso algum produto venha sem radarScore
    novosProdutos =
      novosProdutos.map(produto => ({
        ...produto,

        radar_score:
          Number(produto.radar_score) > 0
            ? Number(produto.radar_score)
            : calcularScore(produto)
      }));

    // ==================================================
    // EVITAR PRODUTOS DUPLICADOS
    // ==================================================

    if (adicionar) {
      const idsExistentes =
        new Set(
          produtos.map(
            produto =>
              String(produto.id)
          )
        );

      novosProdutos =
        novosProdutos.filter(
          produto =>
            !idsExistentes.has(
              String(produto.id)
            )
        );

      produtos.push(
        ...novosProdutos
      );
    } else {
      produtos =
        novosProdutos;
    }

    // ==================================================
    // PAGINAÇÃO
    // ==================================================

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

    console.log(
      "Página atual:",
      paginaAtual
    );

    console.log(
      "Tem próxima:",
      temProximaPagina
    );

    atualizarContadores();
    aplicarFiltros();

  } catch (erro) {
    console.error(
      "ERRO SHOPEE RADAR:",
      erro
    );

    if (!adicionar) {
      mostrarErro(
        erro.message ||
        "Erro desconhecido."
      );
    }

  } finally {
    carregando = false;
    removerCarregandoMais();
  }
}

// ======================================================
// NOVA BUSCA
// ======================================================

async function novaBusca(keyword = "") {
  ultimaBusca =
    String(keyword || "").trim();

  paginaAtual = 1;
  temProximaPagina = true;
  produtos = [];

  await carregarProdutos({
    keyword: ultimaBusca,
    pagina: 1,
    adicionar: false
  });
}

// ======================================================
// PRÓXIMA PÁGINA
// ======================================================

async function carregarProximaPagina() {
  if (
    carregando ||
    !temProximaPagina
  ) {
    return;
  }

  const proximaPagina =
    paginaAtual + 1;

  await carregarProdutos({
    keyword: ultimaBusca,
    pagina: proximaPagina,
    adicionar: true
  });
}

// ======================================================
// CONTADORES
// ======================================================

function atualizarContadores() {
  const oportunidades =
    produtos.filter(
      p =>
        Number(
          p.radar_score || 0
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
    totalVideos.textContent = "0";
  }
}

// ======================================================
// FILTROS / ORDENAÇÃO
// ======================================================

function aplicarFiltros() {
  const categoria =
    categoryFilter
      ? categoryFilter.value
      : "all";

  let resultado =
    [...produtos];

  if (categoria !== "all") {
    resultado =
      resultado.filter(
        p =>
          String(p.category)
            .toLowerCase()
            .includes(
              categoria.toLowerCase()
            )
      );
  }

  // RELEVÂNCIA / RADAR SCORE
  if (
    filtroAtual === "all" ||
    filtroAtual === "relevance"
  ) {
    resultado.sort(
      (a, b) =>
        Number(b.radar_score || 0) -
        Number(a.radar_score || 0)
    );
  }

  // MAIS VENDIDOS
  else if (
    filtroAtual === "hot" ||
    filtroAtual === "sales"
  ) {
    resultado.sort(
      (a, b) =>
        Number(b.sold_count || 0) -
        Number(a.sold_count || 0)
    );
  }

  // MAIOR COMISSÃO %
  else if (
    filtroAtual === "commission"
  ) {
    resultado.sort(
      (a, b) =>
        Number(b.commission_rate || 0) -
        Number(a.commission_rate || 0)
    );
  }

  // MAIOR COMISSÃO EM R$
  else if (
    filtroAtual === "commission-value"
  ) {
    resultado.sort(
      (a, b) =>
        Number(b.commission_value || 0) -
        Number(a.commission_value || 0)
    );
  }

  // MELHOR AVALIAÇÃO
  else if (
    filtroAtual === "rating"
  ) {
    resultado.sort(
      (a, b) =>
        Number(b.rating || 0) -
        Number(a.rating || 0)
    );
  }

  else if (
    filtroAtual === "videos"
  ) {
    mostrarAreaEmConstrucao(
      "🎬",
      "Radar de vídeos",
      "Vamos conectar essa área depois."
    );

    return;
  }

  else if (
    filtroAtual === "favorites"
  ) {
    mostrarAreaEmConstrucao(
      "♡",
      "Favoritos",
      "Aqui ficarão os produtos que você salvar."
    );

    return;
  }

  renderizarProdutos(resultado);
}

// ======================================================
// CARD
// ======================================================

function criarCard(produto) {
  const score =
    Number(
      produto.radar_score || 0
    );

  let status =
    "Em observação";

  let emoji =
    "👀";

  if (score >= 85) {
    status =
      "Oportunidade alta";

    emoji =
      "🔥";
  }

  else if (score >= 70) {
    status =
      "Promissor";

    emoji =
      "💎";
  }

  else if (score >= 50) {
    status =
      "Potencial";

    emoji =
      "📈";
  }

  return `
    <article
      class="product-card"
      data-id="${escapar(produto.id)}"
    >

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
            ${emoji} ${status}
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
            <span>VENDIDOS</span>

            <strong>
              ${formatarNumero(
                produto.sold_count
              )}
            </strong>
          </div>

          <div class="product-stat">
            <span>AVALIAÇÃO</span>

            <strong>
              ⭐ ${Number(
                produto.rating
              ).toFixed(1)}
            </strong>
          </div>

          <div class="product-stat">
            <span>COMISSÃO</span>

            <strong>
              ${percentual(
                produto.commission_rate
              )}
            </strong>
          </div>

        </div>

        <div class="product-footer">

          <div>
            <small>RADAR SCORE</small>
            <strong>${score}</strong>
          </div>

          <div class="product-price">
            <small>PREÇO</small>

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
                font-size:13px;
                opacity:.8;
              "
            >
              💰 Comissão estimada:
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
// RENDERIZAR
// ======================================================

function renderizarProdutos(lista) {
  if (!productsGrid) return;

  if (!lista.length) {
    productsGrid.innerHTML = "";

    if (emptyState) {
      emptyState.hidden = false;
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

  document
    .querySelectorAll(".product-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const produto =
            produtos.find(
              p =>
                String(p.id) ===
                String(
                  card.dataset.id
                )
            );

          if (produto) {
            abrirModal(produto);
          }
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

      <p>
        <strong>Radar Score:</strong>
        ${produto.radar_score}/100
      </p>

    </div>

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
            margin-top:22px;
            padding:15px;
            text-align:center;
            background:#ff5a1f;
            color:white;
            border-radius:12px;
            text-decoration:none;
            font-weight:700;
          "
        >
          🛒 Abrir link de afiliado
        </a>
        `
        : ""
    }
  `;

  productModal.hidden = false;
}

function fecharModal() {
  if (productModal) {
    productModal.hidden = true;
  }
}

// ======================================================
// ÁREAS FUTURAS
// ======================================================

function mostrarAreaEmConstrucao(
  icone,
  titulo,
  texto
) {
  if (emptyState) {
    emptyState.hidden = true;
  }

  if (!productsGrid) return;

  productsGrid.innerHTML = `
    <div
      class="empty-state"
      style="
        display:block;
        grid-column:1/-1;
      "
    >
      <div style="font-size:42px;">
        ${icone}
      </div>

      <h3>
        ${titulo}
      </h3>

      <p>
        ${texto}
      </p>
    </div>
  `;
}

// ======================================================
// ABAS
// ======================================================

function selecionarFiltro(filtro) {
  filtroAtual = filtro;

  document
    .querySelectorAll(
      "[data-filter]"
    )
    .forEach(botao => {

      botao.classList.toggle(
        "active",
        botao.dataset.filter === filtro
      );
    });

  aplicarFiltros();
}

// ======================================================
// BUSCA
// ======================================================

if (searchInput) {
  searchInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {
        novaBusca(
          searchInput.value
        );
      }
    }
  );
}

// ======================================================
// CATEGORIA
// ======================================================

if (categoryFilter) {
  categoryFilter.addEventListener(
    "change",
    aplicarFiltros
  );
}

// ======================================================
// BOTÕES DE FILTRO
// ======================================================

document
  .querySelectorAll(
    "[data-filter]"
  )
  .forEach(botao => {

    botao.addEventListener(
      "click",
      () => {

        selecionarFiltro(
          botao.dataset.filter
        );
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
  const overlay =
    productModal.querySelector(
      ".modal-overlay"
    );

  if (overlay) {
    overlay.addEventListener(
      "click",
      fecharModal
    );
  }
}

// ======================================================
// ROLAGEM INFINITA
// ======================================================

window.addEventListener(
  "scroll",
  () => {

    if (
      filtroAtual === "videos" ||
      filtroAtual === "favorites"
    ) {
      return;
    }

    const posicao =
      window.innerHeight +
      window.scrollY;

    const altura =
      document.documentElement
        .scrollHeight;

    // Quando estiver a 700px do fim
    // busca a próxima página
    if (
      posicao >=
      altura - 700
    ) {
      carregarProximaPagina();
    }
  },
  {
    passive: true
  }
);

// ======================================================
// INICIAR RADAR
// ======================================================

novaBusca();
