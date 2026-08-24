// ======================================================
// SHOPEE RADAR — APP.JS
// ======================================================

const SUPABASE_URL = "https://vepoqxpnvlzzhmajcqzo.supabase.co";
const SUPABASE_KEY = "sb_publishable_K7pfWLa17aOQq3hrkN5PnQ_0AKYuZa_";

// ======================================================
// ESTADO
// ======================================================

let produtos = [];
let produtosFiltrados = [];
let abaAtual = "opportunities";

// ======================================================
// ELEMENTOS DA PÁGINA
// ======================================================

function encontrarElemento(...ids) {
    for (const id of ids) {
        const el = document.getElementById(id);
        if (el) return el;
    }
    return null;
}

function setTexto(valor, ...ids) {
    const el = encontrarElemento(...ids);
    if (el) el.textContent = valor;
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

function numero(valor) {
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
        .toFixed(1)
        .replace(".", ",") + "%";
}

// ======================================================
// BUSCAR PRODUTOS NO SUPABASE
// ======================================================

async function carregarProdutos() {

    mostrarCarregando();

    try {

        const resposta = await fetch(
            `${SUPABASE_URL}/rest/v1/products?select=*&order=radar_score.desc`,
            {
                method: "GET",

                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Accept": "application/json"
                }
            }
        );

        if (!resposta.ok) {

            const erroTexto = await resposta.text();

            console.error(
                "Erro Supabase:",
                resposta.status,
                erroTexto
            );

            throw new Error(
                `Erro ${resposta.status} ao consultar o Supabase`
            );
        }

        const dados = await resposta.json();

        console.log("PRODUTOS RECEBIDOS:", dados);

        produtos = Array.isArray(dados)
            ? dados
            : [];

        produtosFiltrados = [...produtos];

        atualizarDashboard();

    } catch (erro) {

        console.error("SHOPEE RADAR:", erro);

        mostrarErro(erro.message);
    }
}

// ======================================================
// DASHBOARD
// ======================================================

function atualizarDashboard() {

    atualizarContadores();
    carregarCategorias();
    aplicarFiltros();
}

// ======================================================
// CONTADORES
// ======================================================

function atualizarContadores() {

    const total = produtos.length;

    const oportunidades = produtos.filter(produto =>
        Number(produto.radar_score || 0) >= 70
    ).length;

    setTexto(
        total,
        "radarCount",
        "radar-count",
        "countRadar"
    );

    setTexto(
        oportunidades,
        "opportunitiesCount",
        "opportunities-count",
        "countOpportunities"
    );

    // Por enquanto esta contagem usa os produtos disponíveis.
    // Quando ligarmos a tabela videos, ela passa a usar dados reais.
    setTexto(
        0,
        "videosCount",
        "videos-count",
        "countVideos"
    );
}

// ======================================================
// CATEGORIAS
// ======================================================

function carregarCategorias() {

    const select = encontrarElemento(
        "categoryFilter",
        "category-filter",
        "category"
    );

    if (!select) return;

    const valorAtual = select.value;

    const categorias = [
        ...new Set(
            produtos
                .map(p => p.category)
                .filter(Boolean)
        )
    ].sort();

    select.innerHTML =
        `<option value="">Todas categorias</option>` +
        categorias.map(categoria =>
            `<option value="${escapar(categoria)}">
                ${escapar(categoria)}
            </option>`
        ).join("");

    if (
        valorAtual &&
        categorias.includes(valorAtual)
    ) {
        select.value = valorAtual;
    }
}

// ======================================================
// FILTROS
// ======================================================

function aplicarFiltros() {

    const pesquisa =
        encontrarElemento(
            "searchInput",
            "search-input",
            "search"
        );

    const categoria =
        encontrarElemento(
            "categoryFilter",
            "category-filter",
            "category"
        );

    const termo = pesquisa
        ? pesquisa.value.trim().toLowerCase()
        : "";

    const categoriaSelecionada =
        categoria
            ? categoria.value
            : "";

    produtosFiltrados = produtos.filter(produto => {

        const nome =
            String(produto.name || "")
                .toLowerCase();

        const loja =
            String(produto.shop_name || "")
                .toLowerCase();

        const categoriaProduto =
            String(produto.category || "");

        const batePesquisa =
            !termo ||
            nome.includes(termo) ||
            loja.includes(termo) ||
            categoriaProduto
                .toLowerCase()
                .includes(termo);

        const bateCategoria =
            !categoriaSelecionada ||
            categoriaProduto === categoriaSelecionada;

        return batePesquisa && bateCategoria;
    });

    // Ordenação dependendo da aba
    if (abaAtual === "opportunities") {

        produtosFiltrados.sort(
            (a, b) =>
                Number(b.radar_score || 0) -
                Number(a.radar_score || 0)
        );
    }

    if (abaAtual === "radar") {

        produtosFiltrados.sort(
            (a, b) =>
                Number(b.sold_count || 0) -
                Number(a.sold_count || 0)
        );
    }

    renderizarProdutos();
}

// ======================================================
// RENDERIZAR CARDS
// ======================================================

function renderizarProdutos() {

    const container =
        encontrarElemento(
            "productsContainer",
            "products-container",
            "productList",
            "product-list",
            "results",
            "opportunitiesList",
            "opportunities-list"
        );

    if (!container) {

        console.warn(
            "Container dos produtos não encontrado no HTML."
        );

        return;
    }

    if (!produtosFiltrados.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size:42px;">📡</div>
                <h3>Nenhum produto encontrado</h3>
                <p>
                    O radar não encontrou produtos
                    com esses filtros.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        produtosFiltrados
            .map(criarCard)
            .join("");
}

// ======================================================
// CARD
// ======================================================

function criarCard(produto) {

    const score =
        Number(produto.radar_score || 0);

    const vendas =
        Number(produto.sold_count || 0);

    const afiliados =
        Number(produto.affiliates_count || 0);

    const vendasPorAfiliado =
        afiliados > 0
            ? vendas / afiliados
            : 0;

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

    const imagem = produto.image_url
        ? `
            <img
                src="${escapar(produto.image_url)}"
                alt="${escapar(produto.name || "Produto")}"
                class="product-image"
                loading="lazy"
                onerror="this.style.display='none'"
            >
          `
        : "";

    const loja = produto.shop_name
        ? `
            <div class="product-shop">
                ${escapar(produto.shop_name)}
            </div>
          `
        : "";

    const rating =
        produto.rating !== null &&
        produto.rating !== undefined
            ? Number(produto.rating)
                .toFixed(1)
                .replace(".", ",")
            : "—";

    const linkAbrir = produto.product_url
        ? `
            <a
                href="${escapar(produto.product_url)}"
                target="_blank"
                rel="noopener noreferrer"
                class="product-link"
            >
                Ver produto →
            </a>
          `
        : "";

    return `
        <article class="product-card">

            ${imagem}

            <div class="product-card-content">

                <div class="product-card-top">

                    <span class="opportunity-badge">
                        ${emoji} ${status}
                    </span>

                    <span class="score-badge">
                        ${score.toFixed(0)}/100
                    </span>

                </div>

                <h3 class="product-name">
                    ${escapar(produto.name || "Produto sem nome")}
                </h3>

                ${loja}

                <div class="product-category">
                    ${escapar(produto.category || "Sem categoria")}
                </div>

                <div class="product-stats">

                    <div class="product-stat">
                        <span>VENDIDOS</span>
                        <strong>
                            ${numero(vendas)}
                        </strong>
                    </div>

                    <div class="product-stat">
                        <span>AFILIADOS</span>
                        <strong>
                            ${numero(afiliados)}
                        </strong>
                    </div>

                    <div class="product-stat">
                        <span>COMISSÃO</span>
                        <strong>
                            ${percentual(produto.commission_rate)}
                        </strong>
                    </div>

                    <div class="product-stat">
                        <span>VENDAS / AFILIADO</span>
                        <strong>
                            ${vendasPorAfiliado
                                .toFixed(1)
                                .replace(".", ",")}
                        </strong>
                    </div>

                </div>

                <div class="product-extra">

                    <span>
                        ⭐ ${rating}
                    </span>

                    ${
                        produto.commission_extra
                            ? `<span>🔥 Comissão extra</span>`
                            : ""
                    }

                </div>

                <div class="product-footer">

                    <div>
                        <small>RADAR SCORE</small>
                        <strong>
                            ${score.toFixed(0)}
                        </strong>
                    </div>

                    <div class="product-price">
                        <small>PREÇO</small>
                        <strong>
                            ${dinheiro(produto.price)}
                        </strong>
                    </div>

                </div>

                ${linkAbrir}

            </div>

        </article>
    `;
}

// ======================================================
// CARREGAMENTO
// ======================================================

function mostrarCarregando() {

    const container =
        encontrarElemento(
            "productsContainer",
            "products-container",
            "productList",
            "product-list",
            "results",
            "opportunitiesList",
            "opportunities-list"
        );

    if (!container) return;

    container.innerHTML = `
        <div class="loading-state">

            <div class="radar-loader"></div>

            <p>
                Analisando produtos...
            </p>

        </div>
    `;
}

// ======================================================
// ERRO
// ======================================================

function mostrarErro(mensagem) {

    const container =
        encontrarElemento(
            "productsContainer",
            "products-container",
            "productList",
            "product-list",
            "results",
            "opportunitiesList",
            "opportunities-list"
        );

    if (!container) return;

    container.innerHTML = `
        <div class="empty-state">

            <div style="font-size:40px;">
                ⚠️
            </div>

            <h3>
                Não consegui acessar o radar
            </h3>

            <p>
                ${escapar(mensagem)}
            </p>

            <button
                type="button"
                onclick="carregarProdutos()"
            >
                Tentar novamente
            </button>

        </div>
    `;
}

// ======================================================
// SEGURANÇA DO HTML
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
// ABAS
// ======================================================

function selecionarAba(aba) {

    abaAtual = aba;

    document
        .querySelectorAll("[data-tab]")
        .forEach(botao => {

            botao.classList.toggle(
                "active",
                botao.dataset.tab === aba
            );
        });

    aplicarFiltros();
}

// ======================================================
// EVENTOS
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const pesquisa =
            encontrarElemento(
                "searchInput",
                "search-input",
                "search"
            );

        const categoria =
            encontrarElemento(
                "categoryFilter",
                "category-filter",
                "category"
            );

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

        document
            .querySelectorAll("[data-tab]")
            .forEach(botao => {

                botao.addEventListener(
                    "click",
                    () =>
                        selecionarAba(
                            botao.dataset.tab
                        )
                );
            });

        carregarProdutos();
    }
);
