// ======================================================
// SHOPEE RADAR — APP.JS
// Compatível com o index.html atual
// ======================================================

const SUPABASE_URL = "https://vepoqxpnvlzzhmajcqzo.supabase.co";
const SUPABASE_KEY = "sb_publishable_K7pfWLa17aOQq3hrkN5PnQ_0AKYuZa_";

let produtos = [];
let filtroAtual = "all";

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
    return Number(valor || 0).toLocaleString("pt-BR", {
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
// CARREGAMENTO
// ======================================================

function mostrarCarregando() {
    productsGrid.innerHTML = `
        <div class="loading">
            <div class="loader"></div>
            <p>Analisando produtos...</p>
        </div>
    `;
}

// ======================================================
// ERRO
// ======================================================

function mostrarErro(mensagem) {
    productsGrid.innerHTML = `
        <div class="empty-state" style="display:block;">
            <div style="font-size:42px;">⚠️</div>

            <h3>Erro ao carregar o radar</h3>

            <p>${escapar(mensagem)}</p>

            <button
                type="button"
                onclick="carregarProdutos()"
                style="
                    margin-top:16px;
                    padding:12px 18px;
                    border:0;
                    border-radius:12px;
                    background:#ff5a1f;
                    color:white;
                    font-weight:700;
                "
            >
                Tentar novamente
            </button>
        </div>
    `;
}

// ======================================================
// SUPABASE
// ======================================================

async function carregarProdutos() {

    mostrarCarregando();

    try {

        const url =
            `${SUPABASE_URL}/rest/v1/products?select=*&order=radar_score.desc`;

        const resposta = await fetch(url, {
            method: "GET",
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": `Bearer ${SUPABASE_KEY}`,
                "Accept": "application/json"
            }
        });

        if (!resposta.ok) {

            const texto = await resposta.text();

            console.error(
                "ERRO SUPABASE:",
                resposta.status,
                texto
            );

            throw new Error(
                `Supabase respondeu com erro ${resposta.status}`
            );
        }

        const dados = await resposta.json();

        console.log("PRODUTOS RECEBIDOS:", dados);

        if (!Array.isArray(dados)) {
            throw new Error(
                "Os dados recebidos não estão no formato esperado."
            );
        }

        produtos = dados;

        atualizarContadores();
        carregarCategorias();
        aplicarFiltros();

    } catch (erro) {

        console.error(
            "ERRO SHOPEE RADAR:",
            erro
        );

        mostrarErro(
            erro.message || "Erro desconhecido."
        );
    }
}

// ======================================================
// CONTADORES
// ======================================================

function atualizarContadores() {

    const oportunidades = produtos.filter(
        produto =>
            Number(produto.radar_score || 0) >= 70
    );

    if (totalProdutos) {
        totalProdutos.textContent =
            produtos.length;
    }

    if (totalOportunidades) {
        totalOportunidades.textContent =
            oportunidades.length;
    }

    // Depois conectamos à tabela de vídeos.
    if (totalVideos) {
        totalVideos.textContent = "0";
    }
}

// ======================================================
// CATEGORIAS
// ======================================================

function carregarCategorias() {

    if (!categoryFilter) return;

    const categorias = [
        ...new Set(
            produtos
                .map(produto => produto.category)
                .filter(Boolean)
        )
    ].sort();

    categoryFilter.innerHTML = `
        <option value="all">
            Todas categorias
        </option>
        ${categorias.map(categoria => `
            <option value="${escapar(categoria)}">
                ${escapar(categoria)}
            </option>
        `).join("")}
    `;
}

// ======================================================
// FILTROS
// ======================================================

function aplicarFiltros() {

    const termo = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const categoria = categoryFilter
        ? categoryFilter.value
        : "all";

    let resultado = produtos.filter(produto => {

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
            categoria === "all" ||
            categoriaProduto === categoria;

        return batePesquisa && bateCategoria;
    });

    // OPORTUNIDADES
    if (filtroAtual === "all") {

        resultado.sort(
            (a, b) =>
                Number(b.radar_score || 0) -
                Number(a.radar_score || 0)
        );
    }

    // RADAR 7 DIAS
    if (filtroAtual === "hot") {

        resultado.sort(
            (a, b) =>
                Number(b.sold_count || 0) -
                Number(a.sold_count || 0)
        );
    }

    // VÍDEOS
    if (filtroAtual === "videos") {

        mostrarAreaEmConstrucao(
            "🎬",
            "Radar de vídeos",
            "A tabela de vídeos será conectada na próxima etapa."
        );

        return;
    }

    // FAVORITOS
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
// ÁREA TEMPORÁRIA
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
// RENDERIZAÇÃO
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

            card.addEventListener(
                "click",
                () => {

                    const id =
                        card.dataset.id;

                    const produto =
                        produtos.find(
                            p => String(p.id) === id
                        );

                    if (produto) {
                        abrirModal(produto);
                    }
                }
            );
        });
}

// ======================================================
// CARD
// ======================================================

function criarCard(produto) {

    const score =
        Number(produto.radar_score || 0);

    const vendidos =
        Number(produto.sold_count || 0);

    const afiliados =
        Number(produto.affiliates_count || 0);

    const vendasPorAfiliado =
        afiliados > 0
            ? vendidos / afiliados
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
                class="product-image"
                src="${escapar(produto.image_url)}"
                alt="${escapar(produto.name || "Produto")}"
                loading="lazy"
                onerror="this.style.display='none'"
            >
        `
        : "";

    return `
        <article
            class="product-card"
            data-id="${escapar(produto.id)}"
        >

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
                    ${escapar(
                        produto.name ||
                        "Produto sem nome"
                    )}
                </h3>

                ${
                    produto.shop_name
                        ? `
                            <div class="product-shop">
                                ${escapar(produto.shop_name)}
                            </div>
                          `
                        : ""
                }

                <div class="product-category">
                    ${escapar(
                        produto.category ||
                        "Sem categoria"
                    )}
                </div>

                <div class="product-stats">

                    <div class="product-stat">
                        <span>VENDIDOS</span>

                        <strong>
                            ${numero(vendidos)}
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
                            ${percentual(
                                produto.commission_rate
                            )}
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

            </div>

        </article>
    `;
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

    const score =
        Number(produto.radar_score || 0);

    modalBody.innerHTML = `

        <h2>
            ${escapar(produto.name || "Produto")}
        </h2>

        <p>
            ${escapar(produto.category || "")}
        </p>

        <div style="margin-top:20px;">

            <p>
                <strong>Preço:</strong>
                ${dinheiro(produto.price)}
            </p>

            <p>
                <strong>Vendidos:</strong>
                ${numero(produto.sold_count)}
            </p>

            <p>
                <strong>Afiliados:</strong>
                ${numero(produto.affiliates_count)}
            </p>

            <p>
                <strong>Comissão:</strong>
                ${percentual(produto.commission_rate)}
            </p>

            <p>
                <strong>Radar Score:</strong>
                ${score.toFixed(0)}/100
            </p>

        </div>

        ${
            produto.product_url
                ? `
                    <a
                        href="${escapar(produto.product_url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                            display:block;
                            margin-top:22px;
                            padding:14px;
                            text-align:center;
                            background:#ff5a1f;
                            color:white;
                            border-radius:12px;
                            text-decoration:none;
                            font-weight:700;
                        "
                    >
                        Abrir produto
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
// TROCAR ABA
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

if (searchInput) {
    searchInput.addEventListener(
        "input",
        aplicarFiltros
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
// INICIAR RADAR
// ======================================================

carregarProdutos();
