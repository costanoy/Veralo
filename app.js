// =============================================
//  Cyberp - Lógica
// =============================================

// --- Conexão com o banco ---
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

// Monta uma linha da tabela com textContent (e nao innerHTML), para que um
// nome de produto como "<img onerror=...>" apareca como texto e nao rode.
function linhaDaTabela(valores) {
  const linha = document.createElement('tr');
  valores.forEach((valor) => {
    const celula = document.createElement('td');
    celula.textContent = valor;
    linha.appendChild(celula);
  });
  return linha;
}

const telaLogin = $('tela-login');
const telaApp = $('tela-app');


// ---------------------------------------------
//  LOGIN
// ---------------------------------------------
$('btn-entrar').addEventListener('click', async () => {
  $('login-erro').textContent = '';
  const { data, error } = await db.auth.signInWithPassword({
    email: $('login-email').value.trim(),
    password: $('login-senha').value,
  });
  if (error) {
    $('login-erro').textContent = 'E-mail ou senha invalidos.';
    return;
  }
  mostrarApp();
});

$('btn-sair').addEventListener('click', async () => {
  await db.auth.signOut();
  telaApp.classList.add('escondido');
  telaLogin.classList.remove('escondido');
});

function mostrarApp() {
  telaLogin.classList.add('escondido');
  telaApp.classList.remove('escondido');
  carregarProdutos();
}

async function verificarSessao() {
  const { data } = await db.auth.getSession();
  if (data.session) mostrarApp();
}
verificarSessao();


// ---------------------------------------------
//  NAVEGAÇÃO entre as seções (Produtos / Venda)
// ---------------------------------------------
const secaoProdutos = $('secao-produtos');
const secaoVenda = $('secao-venda');

$('nav-produtos').addEventListener('click', () => {
  secaoVenda.classList.add('escondido');
  secaoProdutos.classList.remove('escondido');
});
$('nav-venda').addEventListener('click', () => {
  secaoProdutos.classList.add('escondido');
  secaoVenda.classList.remove('escondido');
  $('venda-codigo').focus(); // ja deixa o cursor no campo do leitor
})


// ---------------------------------------------
// PRODUTOS
// ---------------------------------------------
async function carregarProdutos() {
  // A RLS garante: este select so traz produtos da SUA loja
  const { data: produtos, error } = await db
    .from('produtos').select('*').order('nome');
    if (error) { console.error(error); return; }

  const lista = $('lista-produtos');
  lista.innerHTML = '';
  $('lista-vazia').style.display = produtos.length ? 'none' : 'block';

  produtos.forEach((p) => {
    lista.appendChild(linhaDaTabela([
      p.nome,
      p.codigo_barras || '-',
      'R$ ' + Number(p.preco_venda).toFixed(2),
      p.estoque_atual,
    ]));
  });
}

$('btn-salvar-produto').addEventListener('click', async () => {
  $('prod-erro').textContent = '';
  const nome = $('prod-nome').value.trim();
  if (!nome) { $('prod-erro').textContent = 'O nome é obrigatório.'; return; }

  const lojaId = await minhaLoja();
  const { error } = await db.from('produtos').insert({
    loja_id: lojaId,
    nome: nome,
    codigo_barras: $('prod-codigo').value.trim() || null,
    preco_venda: Number($('prod-preco').value) || 0,
    estoque_atual: Number($('prod-estoque').value) || 0,
  });
  if (error) {
    console.error(error);
    $('prod-erro').textContent = 'Nao foi possivel salvar. Veja o console (F12).';
    return;
  }
  $('prod-nome').value = '';
  $('prod-codigo').value = '';
  $('prod-preco').value = '';
  $('prod-estoque').value = '';
  carregarProdutos();
});

async function minhaLoja() {
  const { data: { user } } = await db.auth.getUser();
  const { data } = await db.from('usuarios')
    .select('loja_id').eq('id', user.id).single();
  return data.loja_id;
}


// ---------------------------------------------
// VENDA
// ---------------------------------------------

// O carrinho vive so na memória do navegador até a venda ser finalizada.
let carrinho = [];

// Quando bipar (ou digitar) um código e apertar Enter
$('venda-codigo').addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;          // so reage ao Enter
  const codigo = $('venda-codigo').value.trim();
  $('venda-codigo').value = '';           // limpa pro proximo bip
  if (!codigo) return;

  // Procura o produto pelo codigo de barras (RLS: só acha da sua loja)
  const { data: produto } = await db
    .from('produtos').select('*')
    .eq('codigo_barras', codigo).maybeSingle();

  if (!produto) {
    $('venda-msg').textContent = 'Produto não encontrado: ' + codigo;
    return;
  }
  $('venda-msg').textContent = '';
  adicionarAoCarrinho(produto);
});

function adicionarAoCarrinho(produto) {
  // Se o produto já está no carrinho, só soma +1 na quantidade
  const existente = carrinho.find((i) => i.produto_id === produto.id);
  if (existente) {
    existente.quantidade += 1;
  } else {
    carrinho.push({
      produto_id: produto.id,
      nome: produto.nome,
      preco_unitario: Number(produto.preco_venda),
      quantidade: 1,
    });
  }
  desenharCarrinho();
}

function desenharCarrinho() {
  const corpo = $('lista-carrinho');
  corpo.innerHTML = '';
  let total = 0;

  carrinho.forEach((item) => {
    const subtotal = item.quantidade * item.preco_unitario;
    total += subtotal;
    corpo.appendChild(linhaDaTabela([
      item.nome,
      item.quantidade,
      'R$ ' + item.preco_unitario.toFixed(2),
      'R$ ' + subtotal.toFixed(2),
    ]));
  });

  $('venda-total').textContent = 'R$ ' + total.toFixed(2);
  $('carrinho-vazio').style.display = carrinho.length ? 'none' : 'block';
}

// Finalizar a venda: chama a função do banco (o tudo-ou-nada)
$('btn-finalizar').addEventListener('click', async () => {
  if (carrinho.length === 0) {
    $('venda-msg').textContent = 'O carrinho está vazio.';
    return;
  }

  // Monta a lista de itens no formato que a função espera
  const itens = carrinho.map((i) => ({
    produto_id: i.produto_id,
    quantidade: i.quantidade,
    preco_unitario: i.preco_unitario,
  }));

  // db.rpc() chama a função registrar_venda lá no banco
  const { error } = await db.rpc('registrar_venda', {
    p_forma_pagamento: $('venda-pagamento').value,
    p_itens: itens,
  });

  if (error) {
    console.error(error);
    $('venda-msg').textContent = 'Erro ao registrar a venda. Veja o console (F12).';
    return;
  }

  // Deu certo: esvazia o carrinho e recarrega os produtos
  carrinho = [];
  desenharCarrinho();
  $('venda-msg').textContent = 'Venda registrada com sucesso!';
  carregarProdutos();     // o estoque já aparece atualizado
});