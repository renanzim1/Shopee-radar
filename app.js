// ==========================================
// SHOPEE RADAR
// ==========================================

// DADOS DO SUPABASE
const SUPABASE_URL = "COLE_AQUI_SUA_API_URL";
const SUPABASE_KEY = "COLE_AQUI_SUA_PUBLISHABLE_KEY";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

// Converte valores como "310,4mil" para número
function numero(valor) {
  if (valor === null || valor === undefined) return 0;

  if (typeof valor === "number") return valor;

  let texto = String(valor)
    .toLowerCase()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if (texto.includes("mil")) {
    return parseFloat(texto.replace("mil", "")) * 1000;
  }

  return parseFloat(texto.replace(/[^\d.]/g, "")) || 0;
}

// Calcula oportunidade:
// muitas vendas + poucos afiliados
function calcularScore(vendas, afiliados) {
  vendas = numero(vendas);
  afiliados = numero(afiliados);

  if (vendas <= 0) return 0;

  const proporcao = vendas / Math.max(afiliados, 1);

  return Math.round(proporcao * 10) / 10;
}

// Busca produtos no Supabase
async function carregarProdutos() {
  try {
    const resposta = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=*`,
      { headers }
    );

    if (!resposta.ok) {
      throw new Error(`Erro Supabase: ${resposta.status}`);
    }

    const produtos = await resposta.json();

    produtos.forEach(produto => {
      produto.score = calcularScore(
        produto.sales || produto.vendas,
        produto.affiliates || produto.afiliados
      );
    });

    produtos.sort((a, b) => b.score - a.score);

    mostrarProdutos(produtos);

  } catch (erro) {
    console.error(erro);

    const area = document.getElementById("products");

    if (area) {
      area.innerHTML = `
        <div class="empty">
          Não foi possível carregar os produtos.
        </div>
      `;
    }
  }
}

// Mostra os produtos
function mostrarProdutos(produtos) {
  const area = document.getElementById("products");

  if (!area) return;

  if (!produtos.length) {
    area.innerHTML = `
      <div class="empty">
        Nenhum produto encontrado.
      </div>
    `;
    return;
  }

  area.innerHTML = produtos.map(produto => {

    const nome =
      produto.name ||
      produto.nome ||
      "Produto Shopee";

    const vendas =
      produto.sales ||
      produto.vendas ||
      0;

    const afiliados =
      produto.affiliates ||
      produto.afiliados ||
      0;

    const comissao =
      produto.commission ||
      produto.comissao ||
      "-";

    return `
      <div class="card">

        <span class="badge">
          🔥 Oportunidade
        </span>

        <h3>${nome}</h3>

        <div class="stats">

          <div class="stat">
            <span>VENDAS</span>
            <strong>${vendas}</strong>
          </div>

          <div class="stat">
            <span>AFILIADOS</span>
            <strong>${afiliados}</strong>
          </div>

          <div class="stat">
            <span>COMISSÃO</span>
            <strong>${comissao}</strong>
          </div>

          <div class="stat">
            <span>VENDAS / AFILIADO</span>
            <strong>
              ${calcularScore(vendas, afiliados)}
            </strong>
          </div>

        </div>

        <div class="score">
          <span>Radar Score</span>

          <span class="score-number">
            ${produto.score}
          </span>
        </div>

      </div>
    `;
  }).join("");
}

// Inicia o Radar
document.addEventListener("DOMContentLoaded", () => {
  carregarProdutos();
});
