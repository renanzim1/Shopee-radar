/* =========================================================
   SHOPEE RADAR — APP.JS FINAL
   PARTE 1/3

   MODOS:
   - Radar
   - Mais vendidos
   - Ranquear
   - Packs
========================================================= */


/* =========================================================
   APIs
========================================================= */

const SUPABASE_FUNCTIONS =
  "https://vepoqxpnvlzzhmajcqzo.supabase.co/functions/v1";

const MOMENTUM_API =
  `${SUPABASE_FUNCTIONS}/shopee-radar-momentum`;

const ZERO_API =
  `${SUPABASE_FUNCTIONS}/shopee-radar-zero`;

const RANKING_API =
  `${SUPABASE_FUNCTIONS}/shopee-radar-ranking`;

/*
  A API continua tendo o nome "videos" no backend.

  Não precisamos mudar o nome da Edge Function.
  Para o usuário, ela será apresentada como PACKS.
*/
const PACKS_API =
  `${SUPABASE_FUNCTIONS}/shopee-radar-videos`;


/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const LIMITE_POR_PAGINA = 20;

const STORAGE_ACCESS_TOKEN =
  "shopeeRadarAccessToken";

const STORAGE_REFRESH_TOKEN =
  "shopeeRadarRefreshToken";

const STORAGE_USER =
  "shopeeRadarUser";

const STORAGE_FAVORITOS =
  "shopeeRadarFavorites";


/* =========================================================
   ELEMENTOS
========================================================= */

const productsGrid =
  document.getElementById("productsGrid");

const searchInput =
  document.getElementById("searchInput");

const categoryFilter =
  document.getElementById("categoryFilter");

const resultsTitle =
  document.getElementById("resultsTitle");

const resultsEyebrow =
  document.getElementById("resultsEyebrow");

const heroDescription =
  document.getElementById("heroDescription");

const totalProdutos =
  document.getElementById("totalProdutos");

const totalOportunidades =
  document.getElementById("totalOportunidades");

const totalVideos =
  document.getElementById("totalVideos");

const totalProdutosLabel =
  document.getElementById("totalProdutosLabel");

const totalOportunidadesLabel =
  document.getElementById("totalOportunidadesLabel");

const totalVideosLabel =
  document.getElementById("totalVideosLabel");

const emptyState =
  document.getElementById("emptyState");

const infiniteLoader =
  document.getElementById("infiniteLoader");

const scrollSentinel =
  document.getElementById("scrollSentinel");

const zeroStrategyBox =
  document.getElementById("zeroStrategyBox");

const sortSection =
  document.getElementById("sortSection");

const productModal =
  document.getElementById("productModal");

const modalBody =
  document.getElementById("modalBody");

const closeModal =
  document.getElementById("closeModal");


/* =========================================================
   ESTADO
========================================================= */

let modoAtual = "radar";

let ordenacaoAtual =
  "relevance";

let paginaAtual = 1;

let carregando = false;

let possuiMais = true;

let primeiraCarga = true;

let produtos = [];

let packs = [];

let debouncePesquisa = null;


/* =========================================================
   UTILIDADES
========================================================= */

function escapar(valor) {

  return String(
    valor ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


function numeroSeguro(valor) {

  const numero =
    Number(valor);

  return Number.isFinite(numero)
    ? numero
    : 0;

}


function inteiro(valor) {

  return Math.round(
    numeroSeguro(valor)
  );

}


function dinheiro(valor) {

  const numero =
    numeroSeguro(valor);

  return numero.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

}


function numeroFormatado(valor) {

  const numero =
    numeroSeguro(valor);

  return numero.toLocaleString(
    "pt-BR"
  );

}


function percentual(valor) {

  const numero =
    numeroSeguro(valor);

  return `${numero.toLocaleString(
    "pt-BR",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }
  )}%`;

}


function dataFormatada(valor) {

  if (!valor) {
    return "—";
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return "—";
  }

  return data.toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit"
    }
  );

}


/* =========================================================
   AUTENTICAÇÃO DAS APIs
========================================================= */

function obterAccessToken() {

  return localStorage.getItem(
    STORAGE_ACCESS_TOKEN
  ) || "";

}


function criarHeadersAPI() {

  const token =
    obterAccessToken();

  const headers = {
    Accept:
      "application/json"
  };

  if (token) {

    headers.Authorization =
      `Bearer ${token}`;

  }

  return headers;

}


/* =========================================================
   SESSÃO EXPIRADA
========================================================= */

function tratarNaoAutorizado() {

  localStorage.removeItem(
    STORAGE_ACCESS_TOKEN
  );

  localStorage.removeItem(
    STORAGE_REFRESH_TOKEN
  );

  localStorage.removeItem(
    STORAGE_USER
  );

  window.location.replace(
    "login.html"
  );

}


/* =========================================================
   NORMALIZAÇÃO DE PRODUTOS
========================================================= */

function normalizarProduto(p) {

  return {

    ...p,

    id:
      String(
        p.id ??
        p.item_id ??
        p.product_id ??
        ""
      ),

    tipo:
      "produto",

    name:
      p.name ??
      p.product_name ??
      p.title ??
      "Produto Shopee",

    shop_name:
      p.shop_name ??
      p.shopName ??
      p.seller_name ??
      "Shopee",

    image_url:
      p.image_url ??
      p.image ??
      p.thumbnail ??
      p.imageUrl ??
      "",

    price:
      numeroSeguro(
        p.price ??
        p.min_price ??
        p.price_min
      ),

    sales:
      numeroSeguro(
        p.sales ??
        p.sold ??
        p.sales_count ??
        p.historical_sold
      ),

    rating:
      numeroSeguro(
        p.rating ??
        p.rating_star ??
        p.ratingStar
      ),

    commission_rate:
      numeroSeguro(
        p.commission_rate ??
        p.commissionRate ??
        p.commission_percentage
      ),

    commission:
      numeroSeguro(
        p.commission ??
        p.commission_amount ??
        p.estimated_commission
      ),

    score:
      numeroSeguro(
        p.score ??
        p.radar_score ??
        p.momentum_score ??
        p.rank_score
      ),

    trend_score:
      numeroSeguro(
        p.trend_score ??
        p.momentum_score ??
        p.score
      ),

    category:
      String(
        p.category ??
        p.category_name ??
        p.niche ??
        ""
      ),

    affiliate_url:
      p.affiliate_url ??
      p.product_url ??
      p.offer_link ??
      p.url ??
      "",

    product_url:
      p.product_url ??
      p.affiliate_url ??
      p.offer_link ??
      p.url ??
      "",

    created_at:
      p.created_at ??
      p.updated_at ??
      p.captured_at ??
      null,

    updated_at:
      p.updated_at ??
      p.captured_at ??
      p.created_at ??
      null

  };

}


/* =========================================================
   NORMALIZAÇÃO DOS PACKS
========================================================= */

function normalizarPack(v) {

  /*
    O ID criado pelo coletor costuma ter formato:

    telegram:canal:post

    Com isso conseguimos reconstruir o link
    da publicação original mesmo quando a API
    não devolve source_post_id separadamente.
  */

  const partes =
    String(
      v.shopee_video_id || ""
    ).split(":");


  const canal =
    String(
      v.source_channel ||
      partes[1] ||
      ""
    )
      .replace(
        /^@/,
        ""
      )
      .trim();


  const postId =
    String(
      v.source_post_id ||
      partes[2] ||
      ""
    ).trim();


  let sourceUrl =
    String(
      v.source_url ||
      ""
    ).trim();


  if (
    !sourceUrl &&
    v.source_platform ===
      "telegram" &&
    canal &&
    postId
  ) {

    sourceUrl =
      `https://t.me/${canal}/${postId}`;

  }


  const produtoUrl =
    String(
      v.product_url ??
      v.product_url_external ??
      ""
    ).trim();


  const thumbnail =
    String(
      v.thumbnail_url ??
      ""
    ).trim();


  const descricao =
    String(
      v.description ??
      ""
    ).trim();


  return {

    id:
      String(
        v.id ??
        v.shopee_video_id ??
        `${canal}-${postId}`
      ),

    tipo:
      "pack",

    shopee_video_id:
      v.shopee_video_id ??
      "",

    title:
      descricao ||
      "Pack de vídeos para afiliados",

    description:
      descricao,

    thumbnail_url:
      thumbnail,

    image_url:
      thumbnail,

    source_platform:
      v.source_platform ??
      "telegram",

    source_channel:
      canal,

    source_post_id:
      postId,

    source_url:
      sourceUrl,

    watch_url:
      sourceUrl,

    product_url:
      produtoUrl,

    affiliate_url:
      produtoUrl,

    has_product:
      Boolean(
        produtoUrl ||
        v.has_product
      ),

    created_at:
      v.created_at ??
      v.published_at ??
      null,

    published_at:
      v.published_at ??
      v.created_at ??
      null

  };

}


/* =========================================================
   URL DA API
========================================================= */

function montarURL(
  modo,
  pagina = 1
) {

  let base =
    MOMENTUM_API;


  if (
    modo === "zero"
  ) {

    base =
      ZERO_API;

  }


  if (
    modo === "hot" ||
    modo === "rating"
  ) {

    base =
      RANKING_API;

  }


  if (
    modo === "packs"
  ) {

    base =
      PACKS_API;

  }


  const url =
    new URL(base);


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


  /*
    Parâmetros específicos
    do ranking de produtos.
  */

  if (
    modo === "hot"
  ) {

    url.searchParams.set(
      "tipo",
      "sales"
    );

  }


  if (
    modo === "rating"
  ) {

    url.searchParams.set(
      "tipo",
      "rating"
    );

  }


  return url.toString();

}


/* =========================================================
   BUSCA NA API
========================================================= */

async function buscarPagina(
  modo,
  pagina
) {

  const resposta =
    await fetch(
      montarURL(
        modo,
        pagina
      ),
      {
        method:
          "GET",

        headers:
          criarHeadersAPI()
      }
    );


  if (
    resposta.status === 401
  ) {

    tratarNaoAutorizado();

    throw new Error(
      "Sessão expirada."
    );

  }


  if (
    !resposta.ok
  ) {

    let mensagem =
      `Erro ${resposta.status}`;

    try {

      const erro =
        await resposta.json();

      mensagem =
        erro.erro ||
        erro.error ||
        erro.message ||
        mensagem;

    } catch (_) {
      // mantém mensagem padrão
    }

    throw new Error(
      mensagem
    );

  }


  return resposta.json();

}


/* =========================================================
   EXTRAIR LISTA DA RESPOSTA
========================================================= */

function extrairLista(
  dados,
  modo
) {

  if (
    modo === "packs"
  ) {

    const lista =
      Array.isArray(
        dados?.videos
      )
        ? dados.videos
        : Array.isArray(
            dados?.packs
          )
          ? dados.packs
          : Array.isArray(dados)
            ? dados
            : [];

    return lista.map(
      normalizarPack
    );

  }


  const candidatos = [

    dados?.produtos,

    dados?.products,

    dados?.items,

    dados?.ranking,

    dados?.data,

    Array.isArray(dados)
      ? dados
      : null

  ];


  const lista =
    candidatos.find(
      Array.isArray
    ) || [];


  return lista.map(
    normalizarProduto
  );

}


/* =========================================================
   POSSUI MAIS RESULTADOS
========================================================= */

function descobrirHasMore(
  dados,
  quantidade
) {

  if (
    typeof dados?.has_more ===
      "boolean"
  ) {

    return dados.has_more;

  }


  if (
    typeof dados?.hasMore ===
      "boolean"
  ) {

    return dados.hasMore;

  }


  return (
    quantidade >=
    LIMITE_POR_PAGINA
  );

}


/* =========================================================
   FILTRO DE PESQUISA
========================================================= */

function textoPesquisa() {

  return String(
    searchInput?.value ||
    ""
  )
    .trim()
    .toLowerCase();

}


function categoriaSelecionada() {

  return String(
    categoryFilter?.value ||
    "all"
  ).toLowerCase();

}


/* =========================================================
   FILTRAR PRODUTOS
========================================================= */

function filtrarProdutos(
  lista
) {

  const pesquisa =
    textoPesquisa();

  const categoria =
    categoriaSelecionada();


  return lista.filter(
    (produto) => {

      const texto = [

        produto.name,

        produto.shop_name,

        produto.category

      ]
        .join(" ")
        .toLowerCase();


      const batePesquisa =
        !pesquisa ||
        texto.includes(
          pesquisa
        );


      const categoriaProduto =
        String(
          produto.category ||
          ""
        ).toLowerCase();


      const bateCategoria =
        categoria === "all" ||
        categoriaProduto.includes(
          categoria
        );


      return (
        batePesquisa &&
        bateCategoria
      );

    }
  );

}


/* =========================================================
   FILTRAR PACKS
========================================================= */

function filtrarPacks(
  lista
) {

  const pesquisa =
    textoPesquisa();


  /*
    Os packs ainda não possuem
    classificação confiável por nicho.

    Portanto o filtro de categoria
    NÃO remove packs.
  */

  return lista.filter(
    (pack) => {

      if (!pesquisa) {
        return true;
      }


      const texto = [

        pack.title,

        pack.description,

        pack.source_channel,

        pack.source_platform

      ]
        .join(" ")
        .toLowerCase();


      return texto.includes(
        pesquisa
      );

    }
  );

}


/* =========================================================
   LISTA VISÍVEL
========================================================= */

function obterListaFiltrada() {

  if (
    modoAtual === "packs"
  ) {

    return filtrarPacks(
      packs
    );

  }


  return filtrarProdutos(
    produtos
  );

}
/* =========================================================
   SHOPEE RADAR — APP.JS FINAL
   PARTE 2/3
========================================================= */


/* =========================================================
   ORDENAÇÃO
========================================================= */

function ordenarProdutos(lista) {

  const copia =
    [...lista];


  switch (
    ordenacaoAtual
  ) {

    case "trend":

      copia.sort(
        (a, b) =>
          numeroSeguro(
            b.trend_score
          ) -
          numeroSeguro(
            a.trend_score
          )
      );

      break;


    case "sales":

      copia.sort(
        (a, b) =>
          numeroSeguro(
            b.sales
          ) -
          numeroSeguro(
            a.sales
          )
      );

      break;


    case "rating":

      copia.sort(
        (a, b) =>
          numeroSeguro(
            b.rating
          ) -
          numeroSeguro(
            a.rating
          )
      );

      break;


    case "recent":

      copia.sort(
        (a, b) => {

          const dataA =
            new Date(
              a.updated_at ||
              a.created_at ||
              0
            ).getTime();

          const dataB =
            new Date(
              b.updated_at ||
              b.created_at ||
              0
            ).getTime();


          return (
            dataB -
            dataA
          );

        }
      );

      break;


    case "relevance":
    default:

      copia.sort(
        (a, b) =>
          numeroSeguro(
            b.score
          ) -
          numeroSeguro(
            a.score
          )
      );

      break;

  }


  return copia;

}


/* =========================================================
   ORDENAÇÃO DOS PACKS
========================================================= */

function ordenarPacks(lista) {

  const copia =
    [...lista];


  /*
    Packs são materiais descobertos.

    Não vamos ordenar por views,
    likes ou score porque esses
    dados não estão confirmados.

    O padrão será mostrar os
    descobertos mais recentemente.
  */

  copia.sort(
    (a, b) => {

      const dataA =
        new Date(
          a.created_at ||
          a.published_at ||
          0
        ).getTime();


      const dataB =
        new Date(
          b.created_at ||
          b.published_at ||
          0
        ).getTime();


      return (
        dataB -
        dataA
      );

    }
  );


  return copia;

}


/* =========================================================
   LISTA FINAL
========================================================= */

function obterListaFinal() {

  const lista =
    obterListaFiltrada();


  if (
    modoAtual === "packs"
  ) {

    return ordenarPacks(
      lista
    );

  }


  return ordenarProdutos(
    lista
  );

}


/* =========================================================
   ESTATÍSTICAS
========================================================= */

function atualizarContadores() {

  if (
    modoAtual === "packs"
  ) {

    const total =
      packs.length;


    const comProduto =
      packs.filter(
        (pack) =>
          pack.has_product
      ).length;


    const canais =
      new Set(
        packs
          .map(
            (pack) =>
              pack.source_channel
          )
          .filter(Boolean)
      ).size;


    if (totalProdutos) {

      totalProdutos.textContent =
        numeroFormatado(
          total
        );

    }


    if (
      totalOportunidades
    ) {

      totalOportunidades.textContent =
        numeroFormatado(
          comProduto
        );

    }


    if (totalVideos) {

      totalVideos.textContent =
        numeroFormatado(
          canais
        );

    }


    if (
      totalProdutosLabel
    ) {

      totalProdutosLabel.textContent =
        "PACKS";

    }


    if (
      totalOportunidadesLabel
    ) {

      totalOportunidadesLabel.textContent =
        "COM PRODUTO";

    }


    if (
      totalVideosLabel
    ) {

      totalVideosLabel.textContent =
        "CANAIS";

    }


    return;

  }


  const lista =
    produtos;


  const destaques =
    lista.filter(
      (produto) =>
        numeroSeguro(
          produto.score
        ) >= 70
    ).length;


  if (totalProdutos) {

    totalProdutos.textContent =
      numeroFormatado(
        lista.length
      );

  }


  if (
    totalOportunidades
  ) {

    totalOportunidades.textContent =
      numeroFormatado(
        destaques
      );

  }


  if (totalVideos) {

    totalVideos.textContent =
      numeroFormatado(
        lista.length
      );

  }


  if (
    totalProdutosLabel
  ) {

    totalProdutosLabel.textContent =
      "NO RADAR";

  }


  if (
    totalOportunidadesLabel
  ) {

    totalOportunidadesLabel.textContent =
      "DESTAQUES";

  }


  if (
    totalVideosLabel
  ) {

    totalVideosLabel.textContent =
      "CARREGADOS";

  }

}


/* =========================================================
   INTERFACE POR MODO
========================================================= */

function atualizarInterfaceModo() {

  if (
    zeroStrategyBox
  ) {

    zeroStrategyBox.classList.toggle(
      "active",
      modoAtual === "zero"
    );

  }


  if (
    categoryFilter
  ) {

    categoryFilter.disabled =
      modoAtual === "packs";

  }


  if (
    modoAtual === "packs"
  ) {

    if (resultsEyebrow) {

      resultsEyebrow.textContent =
        "MATERIAIS PARA AFILIADOS";

    }


    if (resultsTitle) {

      resultsTitle.textContent =
        "📦 Packs para Afiliados";

    }


    if (heroDescription) {

      heroDescription.textContent =
        "Encontre packs públicos de vídeos para divulgar produtos da Shopee.";

    }


    if (searchInput) {

      searchInput.placeholder =
        "Pesquisar pack ou canal...";

    }


    if (sortSection) {

      sortSection.style.display =
        "none";

    }


    return;

  }


  if (searchInput) {

    searchInput.placeholder =
      "Pesquisar produto...";

  }


  if (sortSection) {

    sortSection.style.display =
      "";

  }


  if (
    modoAtual === "zero"
  ) {

    if (resultsEyebrow) {

      resultsEyebrow.textContent =
        "ENTRE ANTES DA CONCORRÊNCIA";

    }


    if (resultsTitle) {

      resultsTitle.textContent =
        "🎯 Produtos para Ranquear";

    }


    if (heroDescription) {

      heroDescription.textContent =
        "Encontre produtos ainda no começo e publique antes da concorrência aumentar.";

    }


    return;

  }


  if (
    modoAtual === "hot"
  ) {

    if (resultsEyebrow) {

      resultsEyebrow.textContent =
        "PRODUTOS COM FORÇA";

    }


    if (resultsTitle) {

      resultsTitle.textContent =
        "🔥 Mais Vendidos";

    }


    if (heroDescription) {

      heroDescription.textContent =
        "Veja produtos que já demonstram forte movimento de vendas na Shopee.";

    }


    return;

  }


  if (
    modoAtual === "rating"
  ) {

    if (resultsEyebrow) {

      resultsEyebrow.textContent =
        "QUALIDADE E ACEITAÇÃO";

    }


    if (resultsTitle) {

      resultsTitle.textContent =
        "⭐ Melhores Avaliações";

    }


    if (heroDescription) {

      heroDescription.textContent =
        "Encontre produtos bem avaliados para escolher ofertas com melhor aceitação.";

    }


    return;

  }


  if (resultsEyebrow) {

    resultsEyebrow.textContent =
      "ANÁLISE EM TEMPO REAL";

  }


  if (resultsTitle) {

    resultsTitle.textContent =
      "📡 Radar de Oportunidades";

  }


  if (heroDescription) {

    heroDescription.textContent =
      "Encontre produtos antes de saturarem e acompanhe oportunidades em um único Radar.";

  }

}


/* =========================================================
   CLASSE DO BADGE DO PRODUTO
========================================================= */

function textoOportunidade(
  produto
) {

  const score =
    numeroSeguro(
      produto.score
    );


  if (
    score >= 80
  ) {

    return "🔥 OPORTUNIDADE";

  }


  if (
    score >= 60
  ) {

    return "📈 EM ALTA";

  }


  return "💎 RADAR";

}


/* =========================================================
   CARD DE PRODUTO
========================================================= */

function criarCardProduto(
  produto
) {

  const imagem =
    produto.image_url
      ? `
        <img
          class="product-image"
          src="${escapar(produto.image_url)}"
          alt="${escapar(produto.name)}"
          loading="lazy"
          referrerpolicy="no-referrer"
        >
      `
      : `
        <div
          class="product-image"
          style="
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:40px;
            background:#11151e;
          "
        >
          📦
        </div>
      `;


  const comissao =
    produto.commission > 0
      ? dinheiro(
          produto.commission
        )
      : percentual(
          produto.commission_rate
        );


  return `
    <article
      class="product-card"
      data-product-id="${escapar(produto.id)}"
    >

      ${imagem}

      <div
        class="product-card-content"
      >

        <div
          class="product-card-top"
        >

          <span
            class="opportunity-badge"
          >
            ${escapar(
              textoOportunidade(
                produto
              )
            )}
          </span>

          <span
            class="score-badge"
          >
            ${inteiro(
              produto.score
            )}
          </span>

        </div>


        <h3
          class="product-name"
        >
          ${escapar(
            produto.name
          )}
        </h3>


        <span
          class="product-shop"
        >
          ${escapar(
            produto.shop_name
          )}
        </span>


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
              ${numeroFormatado(
                produto.sales
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
              ${
                produto.rating > 0
                  ? produto.rating.toFixed(1)
                  : "—"
              }
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              COMISSÃO
            </span>

            <strong>
              ${escapar(
                comissao
              )}
            </strong>

          </div>


          <div
            class="product-stat"
          >

            <span>
              TENDÊNCIA
            </span>

            <strong>
              ${inteiro(
                produto.trend_score
              )}
            </strong>

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
              ${inteiro(
                produto.score
              )}/100
            </strong>

          </div>


          <div
            class="product-price"
          >

            <small>
              PREÇO
            </small>

            <strong>
              ${
                produto.price > 0
                  ? dinheiro(
                      produto.price
                    )
                  : "—"
              }
            </strong>

          </div>

        </div>

      </div>

    </article>
  `;

}


/* =========================================================
   CARD DE PACK
========================================================= */

function criarCardPack(
  pack
) {

  /*
    Só mostramos uma imagem quando
    realmente existe thumbnail.

    Caso contrário usamos uma capa
    compacta. Não inventamos foto.
  */

  const media =
    pack.thumbnail_url
      ? `
        <img
          src="${escapar(
            pack.thumbnail_url
          )}"
          alt="Prévia do pack"
          loading="lazy"
          referrerpolicy="no-referrer"
          onerror="
            this.style.display='none';
            this.nextElementSibling.style.display='flex';
          "
        >

        <div
          class="pack-placeholder"
          style="display:none;"
        >

          <span
            class="pack-placeholder-icon"
          >
            📦
          </span>

          <span>
            PACK PARA AFILIADOS
          </span>

        </div>
      `
      : `
        <div
          class="pack-placeholder"
        >

          <span
            class="pack-placeholder-icon"
          >
            📦
          </span>

          <span>
            PACK PARA AFILIADOS
          </span>

        </div>
      `;


  const canal =
    pack.source_channel
      ? `@${pack.source_channel}`
      : "Origem encontrada";


  const botaoPack =
    pack.source_url
      ? `
        <a
          class="
            pack-button
            pack-button-primary
          "
          href="${escapar(
            pack.source_url
          )}"
          target="_blank"
          rel="noopener noreferrer"
          data-pack-link
        >
          📦 ABRIR PACK
        </a>
      `
      : `
        <span
          class="
            pack-button
            pack-button-disabled
          "
        >
          PACK INDISPONÍVEL
        </span>
      `;


  const botaoProduto =
    pack.product_url
      ? `
        <a
          class="
            pack-button
            pack-button-secondary
          "
          href="${escapar(
            pack.product_url
          )}"
          target="_blank"
          rel="noopener noreferrer"
          data-pack-link
        >
          🛒 VER PRODUTO
        </a>
      `
      : "";


  return `
    <article
      class="pack-card"
      data-pack-id="${escapar(
        pack.id
      )}"
    >

      <div
        class="pack-media"
      >

        ${media}

        <span
          class="pack-badge"
        >
          📦 PACK ENCONTRADO
        </span>

      </div>


      <div
        class="pack-content"
      >

        <div
          class="pack-label"
        >
          MATERIAL PARA AFILIADOS
        </div>


        <h3
          class="pack-title"
        >
          ${escapar(
            pack.title
          )}
        </h3>


        <div
          class="pack-channel"
        >
          ${escapar(
            canal
          )}
        </div>


        <div
          class="pack-info-grid"
        >

          <div
            class="pack-info"
          >

            <small>
              ORIGEM
            </small>

            <strong>
              ${
                pack.source_platform ===
                "telegram"
                  ? "Telegram"
                  : escapar(
                      pack.source_platform ||
                      "Encontrado"
                    )
              }
            </strong>

          </div>


          <div
            class="pack-info"
          >

            <small>
              PRODUTO
            </small>

            <strong>
              ${
                pack.has_product
                  ? "✓ ASSOCIADO"
                  : "—"
              }
            </strong>

          </div>

        </div>


        <div
          class="pack-actions"
        >

          ${botaoPack}

          ${botaoProduto}

        </div>

      </div>

    </article>
  `;

}


/* =========================================================
   RENDERIZAR GRID
========================================================= */

function renderizarGrid() {

  if (
    !productsGrid
  ) {
    return;
  }


  const lista =
    obterListaFinal();


  atualizarContadores();


  if (
    lista.length === 0
  ) {

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


  if (
    modoAtual === "packs"
  ) {

    productsGrid.innerHTML =
      lista
        .map(
          criarCardPack
        )
        .join("");

    return;

  }


  productsGrid.innerHTML =
    lista
      .map(
        criarCardProduto
      )
      .join("");

}


/* =========================================================
   LOADING PRINCIPAL
========================================================= */

function mostrarLoadingInicial() {

  if (
    !productsGrid
  ) {
    return;
  }


  const texto =
    modoAtual === "packs"
      ? "Buscando packs..."
      : "Consultando Radar...";


  productsGrid.innerHTML =
    `
      <div
        class="loading"
      >

        <div
          class="loader"
        ></div>

        <p>
          ${texto}
        </p>

      </div>
    `;

}


/* =========================================================
   CARREGAR RESULTADOS
========================================================= */

async function carregarResultados({
  reset = false
} = {}) {

  if (
    carregando
  ) {
    return;
  }


  if (
    !possuiMais &&
    !reset
  ) {
    return;
  }


  carregando =
    true;


  if (reset) {

    paginaAtual = 1;

    possuiMais = true;

    primeiraCarga = true;


    if (
      modoAtual === "packs"
    ) {

      packs = [];

    } else {

      produtos = [];

    }


    mostrarLoadingInicial();

  } else {

    if (infiniteLoader) {

      infiniteLoader.hidden =
        false;

    }

  }


  try {

    const dados =
      await buscarPagina(
        modoAtual,
        paginaAtual
      );


    const novaLista =
      extrairLista(
        dados,
        modoAtual
      );


    if (
      modoAtual === "packs"
    ) {

      const existentes =
        new Set(
          packs.map(
            (item) =>
              item.id
          )
        );


      for (
        const pack
        of novaLista
      ) {

        if (
          !existentes.has(
            pack.id
          )
        ) {

          packs.push(
            pack
          );

          existentes.add(
            pack.id
          );

        }

      }

    } else {

      const existentes =
        new Set(
          produtos.map(
            (item) =>
              item.id
          )
        );


      for (
        const produto
        of novaLista
      ) {

        if (
          !existentes.has(
            produto.id
          )
        ) {

          produtos.push(
            produto
          );

          existentes.add(
            produto.id
          );

        }

      }

    }


    possuiMais =
      descobrirHasMore(
        dados,
        novaLista.length
      );


    if (
      novaLista.length > 0
    ) {

      paginaAtual += 1;

    }


    primeiraCarga =
      false;


    renderizarGrid();


  } catch (erro) {

    console.error(
      "Erro ao carregar:",
      erro
    );


    if (
      productsGrid &&
      primeiraCarga
    ) {

      productsGrid.innerHTML =
        `
          <div
            class="empty-state"
            style="
              grid-column:1/-1;
            "
          >

            <div>
              ⚠️
            </div>

            <h3>
              Não foi possível carregar
            </h3>

            <p>
              ${escapar(
                erro.message ||
                "Tente novamente."
              )}
            </p>

          </div>
        `;

    }


  } finally {

    carregando =
      false;


    if (
      infiniteLoader
    ) {

      infiniteLoader.hidden =
        true;

    }

  }

}


/* =========================================================
   TROCAR DE MODO
========================================================= */

async function trocarModo(
  novoModo
) {

  if (
    ![
      "radar",
      "hot",
      "rating",
      "zero",
      "packs"
    ].includes(
      novoModo
    )
  ) {

    novoModo =
      "radar";

  }


  modoAtual =
    novoModo;


  document
    .querySelectorAll(
      "[data-filter]"
    )
    .forEach(
      (elemento) => {

        elemento.classList.toggle(
          "active",
          elemento.dataset.filter ===
            modoAtual
        );

      }
    );


  atualizarInterfaceModo();


  await carregarResultados({
    reset: true
  });

}


/* =========================================================
   MODAL DE PRODUTO
========================================================= */

function abrirModalProduto(
  produto
) {

  if (
    !productModal ||
    !modalBody
  ) {
    return;
  }


  const link =
    produto.affiliate_url ||
    produto.product_url ||
    "";


  modalBody.innerHTML =
    `
      <div
        style="
          padding-right:42px;
        "
      >

        <h2
          style="
            font-size:20px;
            line-height:1.2;
          "
        >
          ${escapar(
            produto.name
          )}
        </h2>

        <p
          style="
            margin-top:7px;
            color:#9299a8;
            font-size:12px;
          "
        >
          ${escapar(
            produto.shop_name
          )}
        </p>

      </div>


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
                max-height:330px;
                object-fit:contain;
                margin-top:18px;
                border-radius:14px;
                background:#fff;
              "
            >
          `
          : ""
      }


      <div
        style="
          display:grid;
          grid-template-columns:
            repeat(2,minmax(0,1fr));
          gap:8px;
          margin-top:14px;
        "
      >

        <div
          class="product-stat"
        >
          <span>
            VENDIDOS
          </span>

          <strong>
            ${numeroFormatado(
              produto.sales
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
            ${
              produto.rating > 0
                ? produto.rating.toFixed(1)
                : "—"
            }
          </strong>
        </div>


        <div
          class="product-stat"
        >
          <span>
            RADAR SCORE
          </span>

          <strong>
            ${inteiro(
              produto.score
            )}/100
          </strong>
        </div>


        <div
          class="product-stat"
        >
          <span>
            PREÇO
          </span>

          <strong>
            ${
              produto.price > 0
                ? dinheiro(
                    produto.price
                  )
                : "—"
            }
          </strong>
        </div>

      </div>


      ${
        link
          ? `
            <a
              href="${escapar(
                link
              )}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display:flex;
                align-items:center;
                justify-content:center;
                min-height:46px;
                margin-top:15px;
                padding:12px;
                border-radius:11px;
                background:#ff5a1f;
                color:#fff;
                text-decoration:none;
                font-size:12px;
                font-weight:900;
              "
            >
              🛒 ABRIR PRODUTO
            </a>
          `
          : ""
      }
    `;


  productModal.hidden =
    false;

}


/* =========================================================
   MODAL DE PACK
========================================================= */

function abrirModalPack(
  pack
) {

  if (
    !productModal ||
    !modalBody
  ) {
    return;
  }


  const canal =
    pack.source_channel
      ? `@${pack.source_channel}`
      : "Origem encontrada";


  modalBody.innerHTML =
    `
      <div
        class="pack-modal-header"
      >

        <h2>
          📦 Pack para Afiliados
        </h2>

        <div
          class="pack-modal-source"
        >
          ${escapar(
            canal
          )}
        </div>

      </div>


      <div
        class="pack-modal-box"
      >

        <strong>
          Material encontrado
        </strong>

        <p>
          Este material foi localizado
          em uma fonte pública para
          afiliados. Abra a publicação
          original para visualizar o pack.
        </p>

      </div>


      <div
        class="pack-modal-actions"
      >

        ${
          pack.source_url
            ? `
              <a
                href="${escapar(
                  pack.source_url
                )}"
                target="_blank"
                rel="noopener noreferrer"
                class="
                  pack-button-primary
                "
              >
                📦 ABRIR PACK
              </a>
            `
            : ""
        }


        ${
          pack.product_url
            ? `
              <a
                href="${escapar(
                  pack.product_url
                )}"
                target="_blank"
                rel="noopener noreferrer"
                class="
                  pack-button-secondary
                "
              >
                🛒 VER PRODUTO
              </a>
            `
            : ""
        }

      </div>
    `;


  productModal.hidden =
    false;

    }
/* =========================================================
   SHOPEE RADAR — APP.JS FINAL
   PARTE 3/3

   EVENTOS + INTERAÇÕES + INICIALIZAÇÃO
========================================================= */


/* =========================================================
   FECHAR MODAL
========================================================= */

function fecharModal() {

  if (!productModal) {
    return;
  }

  productModal.hidden = true;

  if (modalBody) {
    modalBody.innerHTML = "";
  }

}


/* =========================================================
   CLIQUES NO GRID
========================================================= */

productsGrid
  ?.addEventListener(
    "click",
    (evento) => {

      /*
        Se o usuário clicar diretamente
        em um link, deixamos o navegador
        abrir normalmente.

        Isso é especialmente importante
        para ABRIR PACK e VER PRODUTO.
      */

      const link =
        evento.target.closest("a");

      if (link) {
        return;
      }


      /* ===============================
         PACK
      =============================== */

      const cardPack =
        evento.target.closest(
          "[data-pack-id]"
        );


      if (cardPack) {

        const id =
          String(
            cardPack.dataset.packId ||
            ""
          );


        const pack =
          packs.find(
            (item) =>
              String(item.id) === id
          );


        if (pack) {

          abrirModalPack(
            pack
          );

        }


        return;

      }


      /* ===============================
         PRODUTO
      =============================== */

      const cardProduto =
        evento.target.closest(
          "[data-product-id]"
        );


      if (cardProduto) {

        const id =
          String(
            cardProduto.dataset.productId ||
            ""
          );


        const produto =
          produtos.find(
            (item) =>
              String(item.id) === id
          );


        if (produto) {

          abrirModalProduto(
            produto
          );

        }

      }

    }
  );


/* =========================================================
   FECHAR MODAL PELO X
========================================================= */

closeModal
  ?.addEventListener(
    "click",
    fecharModal
  );


/* =========================================================
   FECHAR MODAL PELO FUNDO
========================================================= */

productModal
  ?.querySelector(
    ".modal-overlay"
  )
  ?.addEventListener(
    "click",
    fecharModal
  );


/* =========================================================
   ESC FECHA MODAL
========================================================= */

document.addEventListener(
  "keydown",
  (evento) => {

    if (
      evento.key === "Escape" &&
      productModal &&
      !productModal.hidden
    ) {

      fecharModal();

    }

  }
);


/* =========================================================
   ABAS
========================================================= */

document
  .querySelectorAll(
    "[data-filter]"
  )
  .forEach(
    (botao) => {

      botao.addEventListener(
        "click",
        async () => {

          const filtro =
            String(
              botao.dataset.filter ||
              "radar"
            );


          if (
            filtro === modoAtual
          ) {

            return;

          }


          await trocarModo(
            filtro
          );

        }
      );

    }
  );


/* =========================================================
   PESQUISA
========================================================= */

searchInput
  ?.addEventListener(
    "input",
    () => {

      clearTimeout(
        debouncePesquisa
      );


      debouncePesquisa =
        setTimeout(
          () => {

            renderizarGrid();

          },
          180
        );

    }
  );


/* =========================================================
   FILTRO DE NICHO
========================================================= */

categoryFilter
  ?.addEventListener(
    "change",
    () => {

      /*
        Packs não possuem nicho
        confiável neste momento.
      */

      if (
        modoAtual === "packs"
      ) {

        return;

      }


      renderizarGrid();

    }
  );


/* =========================================================
   ORDENAÇÃO
========================================================= */

document
  .querySelectorAll(
    "[data-sort]"
  )
  .forEach(
    (botao) => {

      botao.addEventListener(
        "click",
        () => {

          ordenacaoAtual =
            String(
              botao.dataset.sort ||
              "relevance"
            );


          document
            .querySelectorAll(
              "[data-sort]"
            )
            .forEach(
              (item) => {

                item.classList.toggle(
                  "active",
                  item === botao
                );

              }
            );


          renderizarGrid();

        }
      );

    }
  );


/* =========================================================
   SCROLL INFINITO
========================================================= */

let observerScroll = null;


function iniciarScrollInfinito() {

  if (
    !scrollSentinel
  ) {

    return;

  }


  if (
    observerScroll
  ) {

    observerScroll.disconnect();

  }


  observerScroll =
    new IntersectionObserver(
      async (
        entradas
      ) => {

        const entrada =
          entradas[0];


        if (
          !entrada?.isIntersecting
        ) {

          return;

        }


        if (
          carregando ||
          !possuiMais ||
          primeiraCarga
        ) {

          return;

        }


        await carregarResultados({
          reset: false
        });

      },
      {
        root: null,

        rootMargin:
          "500px 0px",

        threshold: 0
      }
    );


  observerScroll.observe(
    scrollSentinel
  );

}


/* =========================================================
   ESTADO VISUAL DAS ABAS
========================================================= */

function sincronizarAbas() {

  document
    .querySelectorAll(
      "[data-filter]"
    )
    .forEach(
      (elemento) => {

        elemento.classList.toggle(
          "active",
          elemento.dataset.filter ===
            modoAtual
        );

      }
    );

}


/* =========================================================
   ESTADO VISUAL DA ORDENAÇÃO
========================================================= */

function sincronizarOrdenacao() {

  document
    .querySelectorAll(
      "[data-sort]"
    )
    .forEach(
      (elemento) => {

        elemento.classList.toggle(
          "active",
          elemento.dataset.sort ===
            ordenacaoAtual
        );

      }
    );

}


/* =========================================================
   CORRIGIR LINKS EXTERNOS

   Não fazemos fetch no Telegram pelo
   navegador.

   Apenas abrimos a publicação original
   em nova aba/app.
========================================================= */

document.addEventListener(
  "click",
  (evento) => {

    const link =
      evento.target.closest(
        "[data-pack-link]"
      );


    if (!link) {
      return;
    }


    evento.stopPropagation();

  }
);


/* =========================================================
   TRATAMENTO DE IMAGENS DE PRODUTO
========================================================= */

productsGrid
  ?.addEventListener(
    "error",
    (evento) => {

      const imagem =
        evento.target;


      if (
        !imagem ||
        imagem.tagName !== "IMG"
      ) {

        return;

      }


      if (
        imagem.classList.contains(
          "product-image"
        )
      ) {

        imagem.style.objectFit =
          "contain";

      }

    },
    true
  );


/* =========================================================
   ATUALIZAR EMPTY STATE
========================================================= */

function atualizarEmptyState() {

  if (
    !emptyState
  ) {
    return;
  }


  const quantidade =
    obterListaFinal().length;


  emptyState.hidden =
    quantidade > 0;


  const titulo =
    emptyState.querySelector(
      "h3"
    );


  const descricao =
    emptyState.querySelector(
      "p"
    );


  if (
    modoAtual === "packs"
  ) {

    if (titulo) {

      titulo.textContent =
        "Nenhum pack encontrado";

    }


    if (descricao) {

      descricao.textContent =
        "Tente outra pesquisa.";

    }


    return;

  }


  if (titulo) {

    titulo.textContent =
      "Nenhum produto encontrado";

  }


  if (descricao) {

    descricao.textContent =
      "Tente mudar sua pesquisa.";

  }

}


/* =========================================================
   OBSERVAR ALTERAÇÕES DE RENDERIZAÇÃO
========================================================= */

const renderOriginal =
  renderizarGrid;


renderizarGrid =
  function () {

    renderOriginal();

    atualizarEmptyState();

  };


/* =========================================================
   LIMPAR PESQUISA AO TROCAR ENTRE
   PRODUTOS E PACKS
========================================================= */

let modoAnterior =
  modoAtual;


const trocarModoOriginal =
  trocarModo;


trocarModo =
  async function (
    novoModo
  ) {

    const eraPack =
      modoAnterior === "packs";


    const vaiSerPack =
      novoModo === "packs";


    /*
      Ao entrar ou sair de Packs,
      limpamos a pesquisa para uma
      busca de produto não esconder
      todos os packs e vice-versa.
    */

    if (
      eraPack !== vaiSerPack &&
      searchInput
    ) {

      searchInput.value =
        "";

    }


    /*
      O nicho não se aplica aos packs.
      Ao voltar ao Radar ele continua
      disponível normalmente.
    */

    if (
      vaiSerPack &&
      categoryFilter
    ) {

      categoryFilter.value =
        "all";

    }


    await trocarModoOriginal(
      novoModo
    );


    modoAnterior =
      novoModo;

  };


/* =========================================================
   TEXTO DO LOADER INFINITO
========================================================= */

function atualizarTextoLoader() {

  if (
    !infiniteLoader
  ) {
    return;
  }


  const texto =
    infiniteLoader.querySelector(
      "span"
    );


  if (!texto) {
    return;
  }


  texto.textContent =
    modoAtual === "packs"
      ? "Buscando mais packs..."
      : "Buscando mais produtos...";

}


/* =========================================================
   OBSERVAR MUDANÇA DE MODO NO LOADER
========================================================= */

const atualizarInterfaceOriginal =
  atualizarInterfaceModo;


atualizarInterfaceModo =
  function () {

    atualizarInterfaceOriginal();

    atualizarTextoLoader();

  };


/* =========================================================
   GARANTIR QUE NÃO EXISTE FAVORITOS
   NA BARRA INFERIOR
========================================================= */

document
  .querySelectorAll(
    '.bottom-item[data-filter="favorites"]'
  )
  .forEach(
    (elemento) => {

      /*
        O index.html final já possui Packs.

        Este trecho é apenas uma proteção
        caso o navegador carregue HTML
        antigo do cache.
      */

      elemento.dataset.filter =
        "packs";


      const icone =
        elemento.querySelector(
          "span"
        );


      if (icone) {

        icone.textContent =
          "📦";

      }


      const nodes =
        Array.from(
          elemento.childNodes
        );


      nodes.forEach(
        (node) => {

          if (
            node.nodeType ===
            Node.TEXT_NODE &&
            String(
              node.textContent
            )
              .toLowerCase()
              .includes(
                "favoritos"
              )
          ) {

            node.textContent =
              " Packs";

          }

        }
      );

    }
  );


/* =========================================================
   REMOVER EVENTUAIS ABAS ANTIGAS DE
   "VÍDEOS EM ALTA"

   O menu correto agora é PACKS.
========================================================= */

document
  .querySelectorAll(
    '[data-filter="videos"]'
  )
  .forEach(
    (elemento) => {

      /*
        Não criamos uma quinta aba.

        Se sobrou uma aba "videos"
        de alguma versão antiga do HTML,
        ela é removida.
      */

      elemento.remove();

    }
  );


/* =========================================================
   EVITAR DUPLO CLIQUE EM LINKS
========================================================= */

document.addEventListener(
  "click",
  (evento) => {

    const link =
      evento.target.closest(
        ".pack-button"
      );


    if (!link) {
      return;
    }


    /*
      Não abre modal ao clicar
      no botão do próprio pack.
    */

    evento.stopPropagation();

  }
);


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function iniciarRadar() {

  /*
    O index.html já verifica a sessão.

    Aqui apenas confirmamos que existe
    um access token antes de chamar
    as Edge Functions.
  */

  const token =
    obterAccessToken();


  if (!token) {

    tratarNaoAutorizado();

    return;

  }


  modoAtual =
    "radar";


  ordenacaoAtual =
    "relevance";


  paginaAtual = 1;

  carregando = false;

  possuiMais = true;

  primeiraCarga = true;

  produtos = [];

  packs = [];


  sincronizarAbas();

  sincronizarOrdenacao();

  atualizarInterfaceModo();

  atualizarTextoLoader();

  iniciarScrollInfinito();


  await carregarResultados({
    reset: true
  });

}


/* =========================================================
   START
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    iniciarRadar
  );

} else {

  iniciarRadar();

}
