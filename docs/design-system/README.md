O Bridge é o sistema de gestão do Bridge Cultural Center, a escola que é ponte entre o Brasil e o Japão. A interface usa a mesma marca do logo e do site: o disco laranja com a ponte sobre o livro aberto, o grafite profundo do topo do site, o creme das seções e a serifa dos títulos. A promessa da marca, "aqui você não está sozinho", vira uma regra de interface: cada tela mostra com clareza onde a pessoa está e qual é o próximo passo.

## Princípios

1. **A marca está no trilho.** O menu lateral é grafite (`trilho`), com o símbolo laranja no topo. O conteúdo fica em cartões brancos (`superficie`) sobre o creme (`fundo`).
2. **O laranja é a ação.** O botão primário é `laranja-acao`, um por tela. O laranja do logo (`laranja`) pinta formas: o símbolo, o Arco, o indicador do menu, as etapas feitas da Jornada. Texto laranja usa sempre `laranja-texto`.
3. **A ponte é o desenho.** O arco do logo é o elemento de assinatura: ele vira o medidor (Arco), liga as etapas da pessoa (Jornada) e aparece no estado vazio. Não invente outros enfeites.
4. **Números grandes, em serifa.** Como no site ("500+", "92%"), o número principal de um resumo vai em `numero-destaque` (Noto Serif JP). No máximo três por tela.
5. **Estado sempre com palavra.** Cor nunca é a única pista: toda Etiqueta tem ícone e texto.

## Conteúdo e tom

- Fale como a secretaria fala com a família brasileira no Japão: acolhedor, direto, tratando por "você".
- Use verbos concretos nos botões: "Registrar pagamento", "Trocar de turma", "Cobrar". Evite "Gerenciar" e "Otimizar".
- Use maiúscula só no começo da frase. Não force caixa alta em rótulos.
- Escreva datas e dinheiro como no dia a dia da escola: "10/11", "¥ 12.800", "R$ 480,00". Escreva os nomes completos, como "Kaori Nishimura Albuquerque".
- O kanji de apoio (`kanji`, em `texto-mute`) acompanha títulos de seção, como no site: 生徒 (alunos), 授業 (aulas), 会計 (financeiro), 今日 (hoje), 出席 (presença), 在籍 (matrícula). Ele é sempre decorativo; o português vem antes.
- Sem emoji.
- O estado vazio diz o que falta e de onde aquilo vem: "Quando o professor fizer a chamada pelo portal, a aula aparece aqui."

## Cor

| Token | Use para |
|---|---|
| `fundo` | Área de trabalho (creme) |
| `superficie` / `superficie-2` | Cartões e tabelas / cabeçalho de tabela e realce |
| `linha` / `borda-controle` | Divisórias / borda de controles (≥ 3:1) |
| `texto` / `texto-sub` / `texto-mute` | Principal / secundário / terciário |
| `laranja` | O laranja do logo, em formas (3,3:1 sobre branco: nunca em texto no tema claro) |
| `laranja-acao` + `on-laranja` | Botão primário |
| `laranja-texto` / `laranja-suave` | Texto e link laranja / fundo de seleção |
| `ok`, `atencao`, `erro`, `info` + `-fundo` | Estados |
| `trilho`, `trilho-ativo`, `trilho-texto`, `trilho-sub`, `trilho-linha` | Menu lateral, escuro nos dois temas |
| `foco` | Anel de foco de teclado |

- Todo texto passa de 4,5:1 sobre as superfícies que o próprio token indica, nos dois temas. A exceção é `texto-mute` sobre `superficie-2` no tema claro (4,45:1): não use essa combinação.
- `erro` é carmim, puxado para o rosa, para nunca parecer o laranja da marca.
- No tema escuro, o botão primário vira o laranja do logo com texto grafite (`on-laranja`).
- Componentes não usam hexadecimal: toda cor sai de um token.

## Tipografia

- **Noto Serif JP** (`titulo`): título da página (`pagina`, 32px), títulos de seção (`secao`, 20px), números em destaque (`numero-destaque`, 36px), o nível JLPT e o kanji de apoio. É a serifa do site e combina com o nome no logo.
- **IBM Plex Sans JP** (`texto`): toda a interface. `corpo` 15px é o texto padrão e `dado` 14px é o menor texto de leitura. Rótulos usam `rotulo` 13px. Nada abaixo de 13px. Ela escreve japonês e tem algarismos tabulares: use `.num` em valores e datas de tabela.

## Forma, espaço e sombra

- A escala de espaço é de 4px (`space-1` a `space-12`). Cartão leva `space-6` de padding; entre cartões vai `space-5`; entre seções, `space-8`.
- Botões e etiquetas de estado são pílulas (`radius-pilula`), como no site. Campos e itens de menu usam `radius-controle` (10px), e cartões e tabelas usam `radius-cartao` (16px).
- Use `sombra-cartao` em todo cartão sobre o fundo, `sombra-flutua` só no que flutua e `sombra-laranja` só no hover do botão primário.
- Monte as telas em grade com colunas desiguais (1,7fr / 1fr; 1,5fr / 1fr / 1fr). Não use três cartões iguais lado a lado.
- Botões e campos têm pelo menos 42px de altura, e botões só com ícone têm 42 × 42px.

## Movimento

- O hover do botão primário sobe 1px e acende o brilho laranja em 220ms com `cubic-bezier(.22,.68,0,1.2)`, a curva do site. No clique, o botão afunda (`scale(.98)`).
- O Arco se enche em 900ms quando aparece. É o único movimento de entrada.
- `prefers-reduced-motion` desliga tudo isso (já está no `bundle.css`).

## Logo e iconografia

- No menu, use o símbolo `assets/Logos/bridge-simbolo-256.png` em 36px, com "BRIDGE / CULTURAL CENTER" na serifa ao lado.
- O logo horizontal (`bridge-horizontal.png`) vai em telas de login e em documentos impressos sobre fundo claro. Sobre fundo escuro, use `bridge-principal-branco.png`. Não recolora o laranja do disco e não redesenhe a ponte.
- Ícones de traço com 1,75px e cantos redondos, em 18px no menu e nos botões e em 14px nas etiquetas, sempre de uma só família. O código atual usa `lucide-react`, que já segue esse traço.

## Proibido

Gradiente em botão ou texto, glassmorphism, cartão com borda colorida à esquerda, três cartões iguais lado a lado, rótulo em caixa alta com espaçamento largo, texto abaixo de 13px, laranja do logo como cor de texto no tema claro, roxo ou azul como cor de marca, emoji e qualquer versão redesenhada do logo.
