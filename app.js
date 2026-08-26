// ======================================================
// SHOPEE RADAR — APP.JS
// Busca real Shopee + nichos + ranking + rolagem infinita
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

// ======================================================
// NORMALIZAÇÃO
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

  if (!produto.radar_score) {
    produto.radar_score =
      calcularScore(produto);
  }

  return produto;
}

// ======================================================
// SCORE LOCAL DE SEGURANÇA
// ======================================================

function calcularScore(produto) {

  const vendas =
    Number(produto.sold_count || 0);

  const avaliacao =
    Number(produto.rating || 0);

  let comissao =
    Number(produto.commission_rate || 0);

  if (
    comissao > 0 &&
    comissao <= 1
  ) {
    comissao *= 100;
  }

  let score = 0;

  // VENDAS — 50
  if (vendas >= 10000) score += 50;
  else if (vendas >= 5000) score += 45;
  else if (vendas >= 1000) score += 38;
  else if (vendas >= 500) score += 30;
  else if (vendas >= 100) score += 20;
  else score += 10;

  // AVALIAÇÃO — 25
  if (avaliacao >= 4.8) score += 25;
  else if (avaliacao >= 4.6) score += 22;
  else if (avaliacao >= 4.4) score += 18;
  else if (avaliacao >= 4) score += 12;

  // COMISSÃO — 25
  if (comissao >= 10) score += 25;
  else if (comissao >= 7) score += 22;
  else if (comissao >= 5) score += 18;
  else if (comissao >= 3) score += 12;
  else if (comissao > 0) score += 7;

  return Math.min(100, score);
}

// ======================================================
// DESCOBRIR A BUSCA ATUAL
// ======================================================

function obterKeywordAtual() {

  const busca =
    buscaDigitada.trim();

  const nicho =
    nichoAtual === "all"
      ? ""
      : nichoAtual.trim();

  // Se usuário digitou algo + escolheu nicho:
  // "air fryer casa cozinha"
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
// TÍTULO
// ======================================================

function atualizarTitulo() {

  if (!resultsTitle) return;

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
        .replace(/[^\p{L}\p{N}\s&]/gu, "")
        .trim();

    return;
  }

  resultsTitle.textContent =
    "Melhores oportunidades";
}

// ======================================================
// URL DA API
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

    // =========================================
    // NÃO DUPLICAR PRODUTOS
    // =========================================

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

      produtos.push(...novos);

    } else {

      produtos = novos;
    }

    // =========================================
    // PAGINAÇÃO
    // =========================================

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

  let resultado =
    [...produtos];

  switch (ordenacaoAtual) {

    // RELEVÂNCIA
    case "relevance":

      // Mantém a ordem que a Shopee enviou.
      break;


    // MAIS VENDIDOS
    case "sales":

      resultado.sort(
        (a, b) =>
          b.sold_count -
          a.sold_count
      );

      break;


    // MAIOR COMISSÃO
    case "commission":

      resultado.sort(
        (a, b) =>
          b.commission_rate -
          a.commission_rate
      );

      break;


    // MELHOR AVALIAÇÃO
    case "rating":

      resultado.sort(
        (a, b) =>
          b.rating -
          a.rating
      );

      break;


    // RADAR SCORE
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

  let status =
    "Em observação";

  let emoji =
    "👀";

  if (score >= 85) {

    status =
      "Oportunidade alta";

    emoji =
      "🔥";

  } else if (score >= 70) {

    status =
      "Promissor";

    emoji =
      "💎";

  } else if (score >= 50) {

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
            <small>
              RADAR SCORE
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

    productsGrid.innerHTML =
      "";

    if (emptyState) {
      emptyState.hidden =
        false;
    }

    return;
  }

  if (emptyState) {
    emptyState.hidden =
      true;
  }

  productsGrid.innerHTML =
    lista
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


    <h2>
      ${escapar(produto.name)}
    </h2>


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
            font-weight:800;
          "
        >
          🛒 Abrir na Shopee
        </a>
        `
        : ""
    }
  `;

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
// PESQUISA
// ======================================================

if (searchInput) {

  searchInput.addEventListener(
    "keydown",
    event => {

      if (event.key === "Enter") {

        buscaDigitada =
          searchInput.value.trim();

        reiniciarRadar();
      }
    }
  );

  // X do input de pesquisa
  searchInput.addEventListener(
    "search",
    () => {

      if (!searchInput.value) {

        buscaDigitada = "";

        reiniciarRadar();
      }
    }
  );
}

// ======================================================
// NICHO
// AGORA FAZ UMA NOVA CONSULTA NA SHOPEE
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

        aplicarOrdenacao();
      }
    );
  });

// ======================================================
// ABAS SUPERIORES / MENU MOBILE
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

        if (filtro === "favorites") {

          alert(
            "Favoritos será conectado na próxima etapa."
          );

          return;
        }

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
              item.dataset.filter === filtro
            );
          });

        document
          .querySelectorAll(
            "[data-sort]"
          )
          .forEach(item => {

            item.classList.toggle(
              "active",
              item.dataset.sort === sort
            );
          });

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
