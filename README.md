# Veralo (protótipo)

Primeiro protótipo do **Veralo**, um ERP para comércios físicos e food deliveries que automatiza o estoque com um design simples. Esta versão, que ainda se chamava *Cyberp*, cobre o básico de uma loja:

- **Login** da equipe (Supabase Auth)
- **Cadastro de produtos** com código de barras, preço de venda e estoque
- **Frente de caixa**: bipe o código de barras (ou digite e aperte Enter), o produto entra no carrinho e a venda é registrada de uma vez, com baixa no estoque
- Cada loja só enxerga os próprios produtos, garantido pelas políticas de RLS do banco

> O Veralo está sendo construído em [veralo.com.br](https://veralo.com.br). Este repositório guarda o protótipo.

## Como funciona

HTML, CSS e JavaScript puro, sem etapa de build. O navegador fala direto com o [Supabase](https://supabase.com) usando a chave pública (anon), e quem garante a segurança é o banco.

| Arquivo | O que tem |
|---|---|
| `index.html`, `style.css` | As telas: login, produtos e venda |
| `app.js` | Toda a lógica |
| `config.js` | URL e chave pública do projeto no Supabase |

O banco precisa de:

- tabelas `produtos` (`id`, `loja_id`, `nome`, `codigo_barras`, `preco_venda`, `estoque_atual`) e `usuarios` (`id`, `loja_id`), com RLS ligada para cada usuário ver só a própria loja;
- a função `registrar_venda(p_forma_pagamento, p_itens)`, que grava a venda e os itens e dá baixa no estoque numa transação só (tudo ou nada).

## Rodando

Sirva a pasta com qualquer servidor estático, por exemplo:

```bash
npx serve .
```

e abra o endereço que aparecer. Para usar outro projeto do Supabase, troque os valores em `config.js`.

---

Feito por [Vinícius Costa Magalhães](https://portfolio.cyberhat.com.br).
