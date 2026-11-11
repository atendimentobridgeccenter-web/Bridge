Botão em pílula, como os botões do site. Use `br-btn` mais uma variante.

| Classe | Quando |
|---|---|
| `br-btn--primario` | A única ação principal da tela. Fundo `laranja-acao`, texto `on-laranja`, com o brilho `sombra-laranja` no hover |
| `br-btn--secundario` | Ações de apoio |
| `br-btn--fantasma` | Ação leve ou navegação, em `laranja-texto` |
| `br-btn--perigo` | Ação destrutiva, sempre com confirmação |
| `br-btn--icone` | Botão só com ícone. Exige `aria-label` |

**O consumidor fornece:** um rótulo com verbo no infinitivo ("Registrar pagamento") e, se quiser, um ícone de 18px antes. Durante o envio, adicione `br-btn--carregando` e `aria-busy="true"`.

**Não faça:** dois primários na mesma tela, gradiente no botão ou botão laranja em ação secundária.
