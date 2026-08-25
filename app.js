// ======================================================
// SHOPEE RADAR — APP.JS
// Dados reais via Shopee + Supabase Edge Function
// ======================================================

const API_URL =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1/shopee-radar-api";

let produtos = [];
let filtroAtual = "all";
let ultimaBusca = "";

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
  return Number(valor || 0)
    .toFixed(2)
    .replace(".", ",") + "%";
}

// ======================================================
// NORMALIZAR PRODUTO DA SHOPEE
// ======================================================

function normalizarProduto(p) {
  return {
    id: p.id || p.itemId || "",
    name: p.nome || p.productName || "Produto Shopee",

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

    commission_rate:
      Number(
        p.comissao ??
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
// SCORE DO RADAR
// ======================================================

function calcularScore(produto) {
  const vendas = Number(produto.sold_count || 0);
  const avaliacao = Number(produto.rating || 0);
  const comissao = Number(produto.commission_rate || 0);

  let score = 0;

  // Vendas — até 50 pontos
  if (vendas >= 10000) score += 50;
  else if (vendas >= 5000) score += 45;
  else if (vendas >= 1000) score += 38;
  else if (vendas >= 500) score += 30;
  else if (vendas >= 100) score += 20;
  else score += 10;

  // Avaliação — até 25 pontos
  if (avaliacao >= 4.8) score += 25;
  else if (avaliacao >= 4.6) score += 22;
  else if (avaliacao >= 4.4) score += 18;
  else if (avaliacao >= 4) score += 12;

  // Comissão — até 25 pontos
  if (comissao >= 10) score += 25;
  else if (comissao >= 7) score += 22;
  else if (comissao >= 5) score += 18;
  else if (comissao >= 3) score += 12;
  else if (comissao > 0) score += 7;

  return Math.min(100, score);
}

// ======================================================
// CARREGAMENTO
// ======================================================

function mostrarCarregando() {
  if (emptyState) {
    emptyState.hidden = true;
  }

  productsGrid.innerHTML = `
    <div class="loading">
      <div class="loader"></div>
      <p>Buscando produtos na Shopee...</p>
    </div>
  `;
}

function mostrarErro(mensagem) {
  productsGrid.innerHTML = `
    <div class="empty-state" style="display:block;">
      <div style="font-size:42px;">⚠️</div>

      <h3>Não foi possível carregar o radar</h3>

      <p>${escapar(mensagem)}</p>

      <button
        onclick="carregarProdutos(ultimaBusca)"
        style="
          margin-top:16px;
          padding:12px 18px;
          border:0;
          border-radius:12px;
          background:#ff5a1f;
          color:#fff;
          font-weight:700;
        "
      >
        Tentar novamente
      </button>
    </div>
  `;
}

// ======================================================
// BUSCAR NA EDGE FUNCTION
// ======================================================

async function carregarProdutos(keyword = "") {
  ultimaBusca = keyword.trim();

  mostrarCarregando();

  try {
    let url = API_URL;

    if (ultimaBusca) {
      url += "?keyword=" + encodeURIComponent(ultimaBusca);
    }

    const resposta = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!resposta.ok) {
      const texto = await resposta.text();

      console.error(
        "ERRO API:",
        resposta.status,
        texto
      );

      throw new Error(
        `API respondeu com erro ${resposta.status}`
      );
    }

    const dados = await resposta.json();

    console.log("RESPOSTA SHOPEE:", dados);

    if (dados.ok === false) {
      throw new Error(
        dados.erro ||
        dados.error ||
        "A Shopee retornou um erro."
      );
    }

    let lista = [];

    // Formato novo da nossa função
    if (Array.isArray(dados.produtos)) {
      lista = dados.produtos;
    }

    // Compatibilidade com resposta anterior
    else if (
      dados.shopee &&
      dados.shopee.data &&
      dados.shopee.data.productOfferV2 &&
      Array.isArray(dados.shopee.data.productOfferV2.nodes)
    ) {
      lista = dados.shopee.data.productOfferV2.nodes;
    }

    // Outro formato possível
    else if (
      dados.data &&
      dados.data.productOfferV2 &&
      Array.isArray(dados.data.productOfferV2.nodes)
    ) {
      lista = dados.data.productOfferV2.nodes;
    }

    produtos = lista.map(normalizarProduto);

    produtos = produtos.map(produto => ({
      ...produto,
      radar_score: calcularScore(produto)
    }));

    atualizarContadores();
    aplicarFiltros();

  } catch (erro) {
    console.error("ERRO SHOPEE RADAR:", erro);

    mostrarErro(
      erro.message ||
      "Erro desconhecido ao consultar a Shopee."
    );
  }
}

// ======================================================
// CONTADORES
// ======================================================

function atualizarContadores() {
  const oportunidades = produtos.filter(
    p => Number(p.radar_score || 0) >= 70
  );

  if (totalProdutos) {
    totalProdutos.textContent = produtos.length;
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
// FILTROS
// ======================================================

function aplicarFiltros() {
  const categoria = categoryFilter
    ? categoryFilter.value
    : "all";

  let resultado = [...produtos];

  if (categoria !== "all") {
    resultado = resultado.filter(
      p =>
        String(p.category)
          .toLowerCase()
          .includes(
            categoria.toLowerCase()
          )
    );
  }

  if (filtroAtual === "all") {
    resultado.sort(
      (a, b) =>
        Number(b.radar_score || 0) -
        Number(a.radar_score || 0)
    );
  }

  if (filtroAtual === "hot") {
    resultado.sort(
      (a, b) =>
        Number(b.sold_count || 0) -
        Number(a.sold_count || 0)
    );
  }

  if (filtroAtual === "videos") {
    mostrarAreaEmConstrucao(
      "🎬",
      "Radar de vídeos",
      "Vamos conectar essa área depois."
    );
    return;
  }

  if (filtroAtual === "favorites") {
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
    Number(produto.radar_score || 0);

  let status = "Em observação";
  let emoji = "👀";

  if (score >= 85) {
    status = "Oportunidade alta";
    emoji = "🔥";
  } else if (score >= 70) {
    status = "Promissor";
    emoji = "💎";
  } else if (score >= 50) {
    status = "Potencial";
    emoji = "📈";
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
              ${formatarNumero(produto.sold_count)}
            </strong>
          </div>

          <div class="product-stat">
            <span>AVALIAÇÃO</span>
            <strong>
              ⭐ ${Number(produto.rating).toFixed(1)}
            </strong>
          </div>

          <div class="product-stat">
            <span>COMISSÃO</span>
            <strong>
              ${percentual(produto.commission_rate)}
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
              ${dinheiro(produto.price)}
            </strong>
          </div>

        </div>

      </div>
    </article>
  `;
}

// ======================================================
// RENDERIZAR
// ======================================================

function renderizarProdutos(lista) {
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
    lista.map(criarCard).join("");

  document
    .querySelectorAll(".product-card")
    .forEach(card => {
      card.addEventListener("click", () => {
        const produto = produtos.find(
          p =>
            String(p.id) ===
            String(card.dataset.id)
        );

        if (produto) {
          abrirModal(produto);
        }
      });
    });
}

// ======================================================
// MODAL
// ======================================================

function abrirModal(produto) {
  if (!productModal || !modalBody) return;

  modalBody.innerHTML = `

    ${
      produto.image_url
        ? `
        <img
          src="${escapar(produto.image_url)}"
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

    <h2>${escapar(produto.name)}</h2>

    <p style="margin-top:8px;">
      🏪 ${escapar(produto.shop_name)}
    </p>

    <div style="margin-top:20px;">

      <p>
        <strong>Preço:</strong>
        ${dinheiro(produto.price)}
      </p>

      <p>
        <strong>Vendidos:</strong>
        ${formatarNumero(produto.sold_count)}
      </p>

      <p>
        <strong>Avaliação:</strong>
        ⭐ ${Number(produto.rating).toFixed(1)}
      </p>

      <p>
        <strong>Comissão:</strong>
        ${percentual(produto.commission_rate)}
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
          href="${escapar(produto.affiliate_url)}"
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

  productsGrid.innerHTML = `
    <div
      class="empty-state"
      style="display:block;"
    >
      <div style="font-size:42px;">
        ${icone}
      </div>

      <h3>${titulo}</h3>

      <p>${texto}</p>
    </div>
  `;
}

// ======================================================
// ABAS
// ======================================================

function selecionarFiltro(filtro) {
  filtroAtual = filtro;

  document
    .querySelectorAll("[data-filter]")
    .forEach(botao => {
      botao.classList.toggle(
        "active",
        botao.dataset.filter === filtro
      );
    });

  aplicarFiltros();
}

// ======================================================
// EVENTOS
// ======================================================

// Pesquisa real na Shopee ao pressionar ENTER
if (searchInput) {
  searchInput.addEventListener(
    "keydown",
    event => {
      if (event.key === "Enter") {
        carregarProdutos(
          searchInput.value
        );
      }
    }
  );
}

if (categoryFilter) {
  categoryFilter.addEventListener(
    "change",
    aplicarFiltros
  );
}

document
  .querySelectorAll("[data-filter]")
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
// INICIAR
// ======================================================

carregarProdutos();
