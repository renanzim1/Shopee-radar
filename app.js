// ==========================================
// SHOPEE RADAR V1
// ==========================================

const SUPABASE_URL =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_K7pfWLa17aOQq3hrkN5PnQ_0AKYuZa_";

// Conexão com Supabase
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let todosProdutos = [];

// ==========================================
// FORMATADORES
// ==========================================

function formatarNumero(valor) {
  const numero = Number(valor || 0);

  if (numero >= 1000000) {
    return (numero / 1000000)
      .toFixed(1)
      .replace(".", ",") + " mi";
  }

  if (numero >= 1000) {
    return (numero / 1000)
      .toFixed(numero >= 10000 ? 0 : 1)
      .replace(".", ",") + " mil";
  }

  return numero.toLocaleString("pt-BR");
}

function formatarPreco(valor) {
  if (valor === null || valor === undefined) {
    return "—";
  }

  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarPercentual(valor) {
  if (valor === null || valor === undefined) {
    return "—";
  }

  return Number(valor)
    .toFixed(1)
    .replace(".", ",") + "%";
}

function vendasPorAfiliado(produto) {
  const vendas = Number(produto.sold_count || 0);
  const afiliados = Number(produto.affiliates_count || 0);

  if (afiliados <= 0) return vendas;

  return vendas / afiliados;
}

// ==========================================
// CLASSIFICAÇÃO
// ==========================================

function classificacao(score) {
  score = Number(score || 0);

  if (score >= 85) {
    return {
      texto: "🔥 Oportunidade alta",
      classe: "high"
    };
  }

  if (score >= 65) {
    return {
      texto: "🚀 Promissor",
      classe: "medium"
    };
  }

  return {
    texto: "👀 Em observação",
    classe: "low"
  };
}

// ==========================================
// CARREGAR PRODUTOS
// ==========================================

async function carregarProdutos() {
  const container =
    document.getElementById("productsContainer");

  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("radar_score", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    todosProdutos = data || [];

    atualizarResumo(todosProdutos);
    renderizarProdutos(todosProdutos);

  } catch (erro) {
    console.error("Erro Shopee Radar:", erro);

    if (container) {
      container.innerHTML = `
        <div class="empty">
          <h3>Erro ao conectar ao Radar</h3>
          <p>
            Não foi possível carregar os produtos
            do Supabase.
          </p>
        </div>
      `;
    }
  }
}

// ==========================================
// RESUMO DO DASHBOARD
// ==========================================

async function atualizarResumo(produtos) {
  const total =
    document.getElementById("totalProducts");

  const oportunidades =
    document.getElementById("totalOpportunities");

  const videos =
    document.getElementById("totalVideos");

  if (total) {
    total.textContent = produtos.length;
  }

  if (oportunidades) {
    oportunidades.textContent =
      produtos.filter(
        produto =>
          Number(produto.radar_score || 0) >= 70
      ).length;
  }

  try {
    const seteDiasAtras =
      new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();

    const { count, error } = await supabaseClient
      .from("videos")
      .select("*", {
        count: "exact",
        head: true
      })
      .gte("published_at", seteDiasAtras);

    if (!error && videos) {
      videos.textContent = count || 0;
    }

  } catch (erro) {
    console.error("Erro ao contar vídeos:", erro);

    if (videos) {
      videos.textContent = "0";
    }
  }
}

// ==========================================
// MOSTRAR PRODUTOS
// ==========================================

function renderizarProdutos(produtos) {
  const container =
    document.getElementById("productsContainer");

  if (!container) return;

  if (!produtos.length) {
    container.innerHTML = `
      <div class="empty">
        <h3>Nenhum produto encontrado</h3>
        <p>
          Tente alterar a pesquisa ou categoria.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = produtos.map(produto => {
    const score =
      Number(produto.radar_score || 0);

    const oportunidade =
      classificacao(score);

    const proporcao =
      vendasPorAfiliado(produto);

    return `
      <article class="card">

        <div class="card-top">
          <span class="badge ${oportunidade.classe}">
            ${oportunidade.texto}
          </span>

          <span class="score-number">
            ${Math.round(score)}/100
          </span>
        </div>

        <h3>
          ${produto.name || "Produto Shopee"}
        </h3>

        <p class="category">
          ${produto.category || "Shopee"}
        </p>

        <div class="stats">

          <div class="stat">
            <span>VENDIDOS</span>
            <strong>
              ${formatarNumero(produto.sold_count)}
            </strong>
          </div>

          <div class="stat">
            <span>AFILIADOS</span>
            <strong>
              ${formatarNumero(
                produto.affiliates_count
              )}
            </strong>
          </div>

          <div class="stat">
            <span>COMISSÃO</span>
            <strong>
              ${formatarPercentual(
                produto.commission_rate
              )}
            </strong>
          </div>

          <div class="stat">
            <span>VENDAS / AFILIADO</span>
            <strong>
              ${proporcao
                .toFixed(1)
                .replace(".", ",")}
            </strong>
          </div>

        </div>

        <div class="score">

          <div>
            <small>RADAR SCORE</small>
            <strong>
              ${Math.round(score)}
            </strong>
          </div>

          <div>
            <small>PREÇO</small>
            <strong>
              ${formatarPreco(produto.price)}
            </strong>
          </div>

        </div>

      </article>
    `;
  }).join("");
}

// ==========================================
// PESQUISA E FILTROS
// ==========================================

function aplicarFiltros() {
  const pesquisa =
    document
      .getElementById("searchInput")
      ?.value
      .trim()
      .toLowerCase() || "";

  const categoria =
    document
      .getElementById("categoryFilter")
      ?.value || "";

  const filtrados =
    todosProdutos.filter(produto => {
      const nome =
        String(produto.name || "")
          .toLowerCase();

      const correspondePesquisa =
        nome.includes(pesquisa);

      const correspondeCategoria =
        !categoria ||
        produto.category === categoria;

      return (
        correspondePesquisa &&
        correspondeCategoria
      );
    });

  renderizarProdutos(filtrados);
}

// ==========================================
// INICIAR SHOPEE RADAR
// ==========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const pesquisa =
      document.getElementById("searchInput");

    const categoria =
      document.getElementById("categoryFilter");

    if (pesquisa) {
      pesquisa.addEventListener(
        "input",
        aplicarFiltros
      );
    }

    if (categoria) {
      categoria.addEventListener(
        "change",
        aplicarFiltros
      );
    }

    carregarProdutos();
  }
);
