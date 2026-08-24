// ==========================================
// SHOPEE RADAR — APP.JS
// ==========================================

const SUPABASE_URL = "https://vepoqxpnvlzzhmajcqzo.supabase.co";
const SUPABASE_KEY = "sb_publishable_K7pfWLa17aOQq3hrkN5PnQ_0AKYuZa_";

// Tabela criada no Supabase
const TABLE = "produtos";

let produtos = [];
let filtroAtual = "oportunidades";
let categoriaAtual = "todas";
let pesquisaAtual = "";

// ==========================================
// SUPABASE
// ==========================================

async function buscarProdutos() {
  mostrarCarregando();

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=radar_score.desc`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      const erro = await response.text();
      throw new Error(
        `Supabase respondeu ${response.status}: ${erro}`
      );
    }

    produtos = await response.json();

    console.log("Produtos recebidos:", produtos);

    atualizarDashboard();
    renderizarProdutos();

  } catch (erro) {
    console.error("Erro Shopee Radar:", erro);
    mostrarErro(erro.message);
  }
}

// ==========================================
// ELEMENTOS
// ==========================================

function pegarElemento(...ids) {
  for (const id of ids) {
    const elemento = document.getElementById(id);
    if (elemento) return elemento;
  }

  return null;
}

function containerProdutos() {
  return pegarElemento(
    "products",
    "product-list",
    "produtos",
    "lista-produtos",
    "radar-list"
  );
}

// ==========================================
// DASHBOARD
// ==========================================

function atualizarDashboard() {
  const total = produtos.length;

  const oportunidades = produtos.filter((p) => {
    return numero(p.radar_score) >= 70;
  }).length;

  const videos7d = produtos.reduce((total, p) => {
    return total + numero(p.videos_7d);
  }, 0);

  atualizarTexto(
    ["total-radar", "radar-count", "totalProdutos"],
    total
  );

  atualizarTexto(
    ["total-oportunidades", "opportunity-count", "oportunidades-count"],
    oportunidades
  );

  atualizarTexto(
    ["total-videos", "videos-count", "videos7d-count"],
    videos7d
  );
}

function atualizarTexto(ids, valor) {
  for (const id of ids) {
    const elemento = document.getElementById(id);

    if (elemento) {
      elemento.textContent = valor;
    }
  }
}

// ==========================================
// FILTROS
// ==========================================

function produtosFiltrados() {
  let lista = [...produtos];

  if (filtroAtual === "oportunidades") {
    lista = lista.filter(
      (p) => numero(p.radar_score) >= 70
    );
  }

  if (filtroAtual === "7dias") {
    lista.sort(
      (a, b) =>
        numero(b.videos_7d) - numero(a.videos_7d)
    );
  }

  if (filtroAtual === "videos") {
    lista = lista.filter(
      (p) => numero(p.videos_7d) > 0
    );
  }

  if (filtroAtual === "favoritos") {
    lista = lista.filter(
      (p) =>
        p.favorito === true ||
        p.favorite === true
    );
  }

  if (
    categoriaAtual &&
    categoriaAtual !== "todas" &&
    categoriaAtual !== "Todas categorias"
  ) {
    lista = lista.filter((p) => {
      return String(p.categoria || p.category || "")
        .toLowerCase() ===
        categoriaAtual.toLowerCase();
    });
  }

  if (pesquisaAtual) {
    const busca = pesquisaAtual.toLowerCase();

    lista = lista.filter((p) => {
      const nome = String(
        p.nome ||
        p.name ||
        p.produto ||
        p.title ||
        ""
      ).toLowerCase();

      const categoria = String(
        p.categoria ||
        p.category ||
        ""
      ).toLowerCase();

      return (
        nome.includes(busca) ||
        categoria.includes(busca)
      );
    });
  }

  return lista;
}

// ==========================================
// RENDERIZAÇÃO
// ==========================================

function renderizarProdutos() {
  const container = containerProdutos();

  if (!container) {
    console.error(
      "Container dos produtos não foi encontrado no index.html"
    );
    return;
  }

  const lista = produtosFiltrados();

  if (!lista.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📡</div>
        <strong>Nenhum produto encontrado</strong>
        <p>O radar não encontrou produtos para este filtro.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = lista
    .map(criarCardProduto)
    .join("");
}

function criarCardProduto(produto) {
  const nome =
    produto.nome ||
    produto.name ||
    produto.produto ||
    produto.title ||
    "Produto";

  const categoria =
    produto.categoria ||
    produto.category ||
    "Sem categoria";

  const score = numero(
    produto.radar_score ??
    produto.score
  );

  const vendidos =
    produto.vendidos ??
    produto.sales ??
    produto.vendas ??
    0;

  const afiliados =
    produto.afiliados ??
    produto.affiliates ??
    0;

  const comissao =
    produto.comissao ??
    produto.commission ??
    0;

  const vendasAfiliado =
    produto.vendas_afiliado ??
    produto.sales_per_affiliate ??
    produto.vendas_por_afiliado ??
    calcularVendasAfiliado(vendidos, afiliados);

  const preco =
    produto.preco ??
    produto.price ??
    0;

  const videos =
    produto.videos_7d ??
    0;

  const imagem =
    produto.imagem ||
    produto.image ||
    produto.image_url ||
    "";

  const status = obterStatus(score);

  return `
    <article class="product-card">

      ${
        imagem
          ? `
          <div class="product-image">
            <img
              src="${escapar(imagem)}"
              alt="${escapar(nome)}"
              loading="lazy"
            >
          </div>
        `
          : ""
      }

      <div class="product-content">

        <div class="product-top">

          <span class="status-badge ${status.classe}">
            ${status.icone}
            ${status.texto}
          </span>

          <span class="score-badge">
            ${score}/100
          </span>

        </div>

        <h3>${escapar(nome)}</h3>

        <p class="product-category">
          ${escapar(categoria)}
        </p>

        <div class="metrics-grid">

          <div class="metric">
            <span>VENDIDOS</span>
            <strong>
              ${formatarQuantidade(vendidos)}
            </strong>
          </div>

          <div class="metric">
            <span>AFILIADOS</span>
            <strong>
              ${formatarQuantidade(afiliados)}
            </strong>
          </div>

          <div class="metric">
            <span>COMISSÃO</span>
            <strong>
              ${formatarPorcentagem(comissao)}
            </strong>
          </div>

          <div class="metric">
            <span>VENDAS / AFILIADO</span>
            <strong>
              ${formatarDecimal(vendasAfiliado)}
            </strong>
          </div>

        </div>

        ${
          numero(videos) > 0
            ? `
            <div class="video-info">
              🎬 ${formatarQuantidade(videos)}
              vídeos nos últimos 7 dias
            </div>
          `
            : ""
        }

        <div class="product-footer">

          <div>
            <span>RADAR SCORE</span>
            <strong>${score}</strong>
          </div>

          <div class="price">
            <span>PREÇO</span>
            <strong>
              ${formatarDinheiro(preco)}
            </strong>
          </div>

        </div>

      </div>

    </article>
  `;
}

// ==========================================
// STATUS
// ==========================================

function obterStatus(score) {
  if (score >= 85) {
    return {
      texto: "Oportunidade alta",
      icone: "🔥",
      classe: "high"
    };
  }

  if (score >= 70) {
    return {
      texto: "Promissor",
      icone: "🚀",
      classe: "good"
    };
  }

  if (score >= 50) {
    return {
      texto: "Em crescimento",
      icone: "📈",
      classe: "medium"
    };
  }

  return {
    texto: "Em observação",
    icone: "◉",
    classe: "low"
  };
}

// ==========================================
// PESQUISA
// ==========================================

function configurarPesquisa() {
  const input =
    pegarElemento(
      "search",
      "search-input",
      "pesquisa",
      "buscar-produto"
    ) ||
    document.querySelector(
      'input[type="search"]'
    );

  if (!input) return;

  input.addEventListener("input", (event) => {
    pesquisaAtual =
      event.target.value.trim();

    renderizarProdutos();
  });
}

// ==========================================
// CATEGORIAS
// ==========================================

function configurarCategorias() {
  const select =
    pegarElemento(
      "category",
      "category-filter",
      "categoria"
    ) ||
    document.querySelector("select");

  if (!select) return;

  select.addEventListener("change", (event) => {
    categoriaAtual =
      event.target.value || "todas";

    renderizarProdutos();
  });
}

// ==========================================
// ABAS
// ==========================================

function configurarAbas() {
  document
    .querySelectorAll("[data-filter]")
    .forEach((botao) => {

      botao.addEventListener("click", () => {

        filtroAtual =
          botao.dataset.filter;

        document
          .querySelectorAll("[data-filter]")
          .forEach((item) => {
            item.classList.remove("active");
          });

        botao.classList.add("active");

        renderizarProdutos();
      });

    });
}

// ==========================================
// LOADING / ERRO
// ==========================================

function mostrarCarregando() {
  const container = containerProdutos();

  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <div class="radar-loader"></div>
      <strong>Analisando produtos...</strong>
      <p>
        Buscando oportunidades no radar.
      </p>
    </div>
  `;
}

function mostrarErro(mensagem) {
  const container = containerProdutos();

  if (!container) return;

  container.innerHTML = `
    <div class="error-state">
      <div>⚠️</div>

      <strong>
        Não foi possível carregar o radar
      </strong>

      <p>
        Verifique a conexão com o Supabase.
      </p>

      <small>
        ${escapar(mensagem)}
      </small>

      <br><br>

      <button onclick="buscarProdutos()">
        Tentar novamente
      </button>
    </div>
  `;
}

// ==========================================
// UTILIDADES
// ==========================================

function numero(valor) {
  if (valor === null || valor === undefined) {
    return 0;
  }

  if (typeof valor === "number") {
    return valor;
  }

  const convertido = String(valor)
    .replace("%", "")
    .replace(",", ".");

  const resultado = Number(convertido);

  return Number.isFinite(resultado)
    ? resultado
    : 0;
}

function calcularVendasAfiliado(
  vendidos,
  afiliados
) {
  const vendas = numero(vendidos);
  const totalAfiliados = numero(afiliados);

  if (!totalAfiliados) return 0;

  return vendas / totalAfiliados;
}

function formatarDinheiro(valor) {
  return numero(valor).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );
}

function formatarDecimal(valor) {
  return numero(valor).toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }
  );
}

function formatarPorcentagem(valor) {
  return `${formatarDecimal(valor)}%`;
}

function formatarQuantidade(valor) {
  const n = numero(valor);

  if (n >= 1000000) {
    return `${formatarDecimal(
      n / 1000000
    )} mi`;
  }

  if (n >= 1000) {
    return `${formatarDecimal(
      n / 1000
    )} mil`;
  }

  return Math.round(n).toLocaleString(
    "pt-BR"
  );
}

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ==========================================
// INICIAR SHOPEE RADAR
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {
    configurarPesquisa();
    configurarCategorias();
    configurarAbas();
    buscarProdutos();
  }
);
