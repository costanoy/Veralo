// =============================================
//  Cyberp - logica da primeira versao
// =============================================

// 1. Conecta no seu banco usando as credenciais do config.js.
//    "db" e o objeto que usamos pra falar com o Supabase daqui pra frente.
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Atalho pra pegar elementos da tela pelo id (escreve menos)
const $ = (id) => document.getElementById(id);

const telaLogin = $('tela-login');
const telaApp = $('tela-app');


// ---------------------------------------------
//  LOGIN
// ---------------------------------------------

// Quando clicar em "Entrar"
$('btn-entrar').addEventListener('click', async () => {
  $('login-erro').textContent = '';

  // Pede pro Supabase conferir email e senha
  const { data, error } = await db.auth.signInWithPassword({
    email: $('login-email').value.trim(),
    password: $('login-senha').value,
  });

  if (error) {
    console.log('Erro real do login:', error.message);
    $('login-erro').textContent = 'E-mail ou senha invalidos.';
    return;
  }
  mostrarApp(); // deu certo: troca de tela
});

// Botao "Sair"
$('btn-sair').addEventListener('click', async () => {
  await db.auth.signOut();
  telaApp.classList.add('escondido');
  telaLogin.classList.remove('escondido');
});

// Esconde o login, mostra o app e carrega os produtos
function mostrarApp() {
  console.log('   telaLogin existe?', telaLogin);
  console.log('   telaApp existe?', telaApp);

  telaLogin.classList.add('escondido');
  telaApp.classList.remove('escondido');

  carregarProdutos();
}

// Se a pessoa ja estava logada de antes, pula direto pro app
async function verificarSessao() {
  const { data } = await db.auth.getSession();
  if (data.session) mostrarApp();
}
verificarSessao();


// ---------------------------------------------
//  PRODUTOS
// ---------------------------------------------

// Le os produtos e desenha na tabela
async function carregarProdutos() {
  // Por causa da RLS, este select ja traz SOMENTE os produtos
  // da loja do usuario logado. Nao precisamos filtrar na mao.
  const { data: produtos, error } = await db
    .from('produtos')
    .select('*')
    .order('nome');

  if (error) {
    console.error(error);
    return;
  }

  const lista = $('lista-produtos');
  lista.innerHTML = ''; // limpa antes de redesenhar

  // Mostra o aviso "nenhum produto" so quando a lista esta vazia
  $('lista-vazia').style.display = produtos.length ? 'none' : 'block';

  produtos.forEach((p) => {
    const linha = document.createElement('tr');
    linha.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.codigo_barras || '-'}</td>
      <td>R$ ${Number(p.preco_venda).toFixed(2)}</td>
      <td>${p.estoque_atual}</td>
    `;
    lista.appendChild(linha);
  });
}

// Salva um novo produto
$('btn-salvar-produto').addEventListener('click', async () => {
  $('prod-erro').textContent = '';

  const nome = $('prod-nome').value.trim();
  if (!nome) {
    $('prod-erro').textContent = 'O nome e obrigatorio.';
    return;
  }

  // Descobre a loja do usuario pra preencher o loja_id do produto
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

  // Limpa o formulario e atualiza a lista
  $('prod-nome').value = '';
  $('prod-codigo').value = '';
  $('prod-preco').value = '';
  $('prod-estoque').value = '';
  carregarProdutos();
});

// Descobre o loja_id do usuario logado (consultando a tabela usuarios)
async function minhaLoja() {
  const { data: { user } } = await db.auth.getUser();
  const { data } = await db
    .from('usuarios')
    .select('loja_id')
    .eq('id', user.id)
    .single();
  return data.loja_id;
}