# Visual v2 — cópia do Guia Comercial com linguagem nova

Data: 2026-10-19. Repositório: `central-clinica-v2` (cópia de `central-clinica`, dados e regras em `lib/` intocados).

## Referências
Dois reels salvos pelo Péricles na pasta "IA" do Instagram:
- `_code_and_chill_` — "Sales pipeline CRM dashboard": fundo creme quente com manchas de gradiente, abas em pílula no topo (ativa preta), trilho vertical escuro flutuante com ícones, cartões brancos de canto grande com número grande, kanban com cartões sólidos amarelo / verde-escuro / laranja-tijolo, troca de tela com desfoque e esmaecimento, toast preto em pílula com "Undo".
- `code.xr` — "Dashboard V14": branco minimalista, mesma barra em pílulas, cartões de KPI com um único cartão em degradê laranja, hover com elevação (Framer Motion), entrada escalonada.

Decisões do Péricles: nova pasta + novo repositório + novo projeto Vercel; base do reel 1 com a limpeza do reel 2; todas as telas na primeira entrega.

## Linguagem visual
- **Cores** (`app/globals.css`, paleta de saúde desde 20/10): fundo menta `#eef5f3`, superfície branca, tinta preto-esverdeada `#0f2321` (texto e ação primária), suave `#5f7370`, mata verde-azulado cirúrgico `#0b7a73` (cor da marca; o login usa `.gradiente-saude`), acento laranja-tijolo `#e4552b` e sol amarelo `#f4c43a` só como acentos, perigo `#c23b2e`, cada um com variante clara. Os nomes antigos (`verde`, `azul`, `alerta`) continuam como apelidos durante a migração e saem no fim.
- **Semântica**: consulta / atende / "sim" = mata; exame = acento; aviso / restrição = sol; erro / "não" = perigo; ação primária = tinta (preto).
- **Tipografia**: Manrope. Título de página grande (34–40 px, peso 600, tracking -0.02em), rótulos pequenos em caixa alta com tracking largo, números tabulares.
- **Forma**: cantos 20–28 px em cartões, pílulas (`rounded-full`) em botões, chips e abas; bordas quase invisíveis; sombra suave.
- **Movimento** (`components/movimento.tsx`, biblioteca `motion`): entrada escalonada de listas, troca de tela com desfoque + esmaecimento, pílula ativa que desliza (`layoutId`), hover com elevação, blocos que abrem animando a altura, toast que sobe. `MotionConfig reducedMotion="user"` respeita a preferência do sistema.

## Casca (`components/estrutura.tsx`)
- Barra superior fixa e translúcida: logo à esquerda, abas em pílula no centro (ativa preta deslizante), à direita busca (Ctrl K), e avatar do usuário com menu (nome, papel, sair).
- Trilho escuro flutuante à esquerda (≥ lg): unidade ativa (abre o seletor de unidades), buscar, nova ligação, adicionar (quem edita), importar (quem edita), sair.
- Celular: barra superior com abas roláveis; trilho some.
- Ligação atual (plano do paciente) vira um cartão escuro no topo do conteúdo.
- Toast preto em pílula, "Desfazer" em amarelo.

## Telas
Mesmo conteúdo e mesmas regras das telas atuais; muda a composição: cabeçalho grande com indicadores (3 KPIs), grades de cartões com entrada escalonada, cartões sólidos coloridos para status (atende / só exames / não atende), listas em tabela com chips de status, painéis laterais com cabeçalho grande.

## Fora de escopo
Mudanças de dados, de regras ou de permissões. Banco e importação iguais ao projeto original.

## Guia de implementação das telas (para quem migra uma tela)

Fundação já pronta e **não deve ser editada** pelas telas: `app/globals.css`, `components/movimento.tsx`, `components/ui.tsx`, `components/estrutura.tsx`, `app/login/page.tsx`. Precisa de algo novo? Crie local na própria tela e anote no relatório.

### Primitivas de movimento (`@/components/movimento`)
- `Entrada` — bloco isolado que sobe e aparece; prop `i` atrasa (`i * 60ms`). Para cabeçalhos, barras de filtro, blocos únicos.
- `Lista` + `Item` — grade/lista com filhos entrando escalonados (`Lista` em volta, `Item` em cada filho). `Item` com `i` anima sozinho (fora de `Lista`).
- `Desdobra aberto={bool}` — abre e fecha animando a altura (substitui `.desdobra` + `inert`).
- `motion`, `AnimatePresence`, `MOLA`, `SUAVE`, `toque` — exportados para casos especiais (`<motion.div {...toque}>` = hover sobe 3px e toque encolhe).
- `Contador valor={n}` — número que conta até o valor; `Indicador` já usa quando `valor` é número.
- `TituloContexto` (`@/components/ui`) — `CabecalhoPagina` registra o título; a barra encolhe ao rolar e mostra esse título. Tela com cabeçalho próprio registra com `useContext(TituloContexto)` num `useEffect` (ver ficha do médico).
- `PilhaAvatares nomes max?` (`@/components/pilha-avatares`) — avatares sobrepostos com "+N".
- Um cartão em `gradiente-acento` por tela, no máximo: hoje é a ligação atual e a resposta "não atende" da ficha.
- Não usar `ViewTransition` do React nem `.entrar` em código novo. `.pressionavel` (resposta ao clique) continua útil em botões.

### Componentes (`@/components/ui`)
- `CabecalhoPagina titulo sub? acao? voltar?` — título grande; `voltar={{href, rotulo}}` mostra a pílula de voltar.
- `Indicadores` + `Indicador icone valor rotulo tom? onClick? i?` — a fileira de 3 KPIs do topo (como na referência). Toda tela de lista começa com cabeçalho + indicadores.
- `Botao variante="primario|secundario|acento|fantasma|perigo" tamanho="sm|md|lg"` — pílulas; primário é preto. `BotaoIcone` para só ícone.
- `Chip tom="neutro|mata|acento|sol|perigo|tinta" solido?` — os tons antigos `verde|azul|alerta` ainda funcionam, mas migre: consulta/atende/sim = `mata`, exame = `acento`, aviso/restrição = `sol`, erro/não = `perigo`.
- `Abas abas valor onChange contagem?` — abas em pílula com a ativa preta deslizando (use no lugar de tablists feitos à mão).
- `Segmentado` (pílula deslizante), `Filtro` (`grande` para a busca principal), `SeletorBusca/SeletorConvenio/SeletorEspecialidade`, `Avatar tamanho="sm|md|lg|xl"`, `LogoMarca`, `Secao titulo icone i? acao?`, `Vazio texto icone?`, `Linhas itens=[{rotulo, valor, tom?}]` (pares rótulo/valor com divisórias), `CartaoProfissional`, `FaixaSemana`, `Gaveta`, `Janela titulo sobre?`, `Destaque`, `Atualizado`, `ObservacaoInterna`, `TipoBadge`, `useHoje`.

### Classes utilitárias (`globals.css`)
- `.cartao` (branco, canto 24px, borda sutil, sombra), `.cartao-tinta` (preto), `.cartao-sol` (amarelo), `.cartao-mata` (verde), `.cartao-acento` (laranja) — cartões sólidos para status e destaque, como o kanban da referência.
- `.rotulo` (11px caixa alta), `.numero` (número grande tabular), `.vidro`, `.rolagem-fina`, `.sem-rolagem`.
- Cores Tailwind: `fundo superficie borda texto suave tinta tinta-2 acento acento-escuro acento-claro sol sol-escuro sol-claro mata mata-escuro mata-claro perigo perigo-claro`.

### Regras de composição
- Botões, chips, abas e campos são pílulas (`rounded-full`); cartões têm canto 24px (`rounded-3xl` ou `.cartao`); painéis 28px.
- Texto: títulos `font-semibold tracking-[-0.02em]`; rótulos `.rotulo`; números `tabular-nums`. Nada de `text-[13px]` solto: use `text-xs`/`text-sm`.
- Cartão clicável: `<Item>` por fora, `<motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={MOLA}>` por dentro, `.cartao` no elemento clicável, seta `ArrowUpRight` num círculo que fica preto no hover (ver `CartaoProfissional`).
- Cor é informação: um acento por cartão. Fundo creme já tem as manchas; não pinte fundos de seção.
- Toda lista vazia usa `Vazio` com ícone.
- Acessibilidade mantida: `aria-*`, teclado e foco iguais ou melhores que antes. Toda lógica de dados, filtros, URL e permissões fica **igual**: só muda apresentação.

### Verificação
`npx tsc --noEmit` sem erro. O dev server da cópia já roda em http://localhost:3001 (não iniciar outro). Não usar o navegador: a revisão visual é feita depois pelo mestre.
