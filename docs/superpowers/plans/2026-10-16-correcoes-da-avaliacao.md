# Correções da avaliação de 16/10 — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir todos os pontos de falha e de confusão encontrados na avaliação de 16/10/2026 (crash do Administrador, tela de convênio que nega as redes, ficha do médico que mente sobre convênio, busca sem sugestão, mensagens erradas, importação que rebaixa cobertura, migração silenciosa, campo perdido, logo trocada), sem acrescentar funcionalidade nova (as ideias da "segunda rodada" ficam fora).

**Architecture:** Regras puras continuam em `lib/regras.ts` (testadas em `lib/dados.check.mjs`); telas em `app/(app)/*` só chamam essas regras. Dados seguem no `localStorage` via `lib/repositorio.ts`. Nenhum arquivo novo além de testes dentro do `dados.check.mjs`.

**Tech Stack:** Next.js 16 (App Router, `"use client"`), React 19, Tailwind 4, TypeScript. Testes: `node lib/dados.check.mjs` (imprime `ok`). Tipos: `npx tsc --noEmit`.

## Global Constraints

- Tudo em português do Brasil: código de UI, mensagens, commits.
- Não criar dependência nova. Não criar arquivo novo de componente; mexer nos existentes.
- Não usar `git add -A`: listar os arquivos no `git add`. Nunca adicionar `transcricao-audio*.txt`.
- Branch de trabalho: `correcoes-avaliacao-2026-10-16` (já criado, em cima do `origin/main` 2f9ed1a). Um commit por tarefa.
- Semente (`lib/semente.ts`) agora vem com cadastros reais do Pedro; não mexer nela, exceto onde o plano manda.
- Verificação mínima de toda tarefa: `node lib/dados.check.mjs` imprime `ok` e `npx tsc --noEmit` sai sem erro.
- Estilo: código enxuto (ponytail). Sem abstração nova para uso único.

---

### Task 1: Crash ao entrar numa unidade (hooks depois do return)

**Files:**
- Modify: `components/estrutura.tsx:285-330` (função `SeletorClinica`)

**Interfaces:** nenhuma.

- [ ] **Step 1: Reproduzir pela regra do React**

Em `SeletorClinica`, a linha `if (!clinica) return null;` (~285) vem ANTES do `useMemo` dos grupos (~302). Quando `clinica` vai de `null` para escolhida com o componente montado, o React lança "Rendered more hooks than during the previous render" (confirmado no navegador em 16/10: Administrador sem unidade lembrada clica "Entrar na unidade").

- [ ] **Step 2: Mover o return para depois de todos os hooks**

Deixe o `useMemo` dos grupos logo após o `useEffect` de fechar ao clicar fora, e só então o `if (!clinica) return null;`. O `useMemo` não pode depender de `clinica` sendo nula: ele já usa só `banco.organizacoes`, `clinicas` e `termo`, então basta mover. As constantes `varias`, `org`, `clinicasDaMesmaOrg`, `temNomeGrupoDiferente` e `escolher` ficam depois do return (não são hooks).

Resultado esperado (ordem dentro da função):

```tsx
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => { /* fecha ao clicar fora */ }, [aberto]);
  const grupos = useMemo(() => { /* igual ao atual */ }, [banco.organizacoes, clinicas, termo]);

  if (!clinica) return null;
  const varias = clinicas.length > 1;
  // ...resto igual
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit` → sem erro. Run: `node lib/dados.check.mjs` → `ok`.
Confirme por leitura que nenhum outro hook (`useMemo`, `useState`, `useEffect`, `useRef`, `useContext`) aparece depois de um `return` condicional em `components/estrutura.tsx` (procure por `return null` e olhe o que vem depois).

- [ ] **Step 4: Commit**

```bash
git add components/estrutura.tsx
git commit -m "Seletor de clínica: hooks antes do return, para o Administrador entrar na unidade sem erro"
```

---

### Task 2: Tela do convênio mostra as redes de verdade

**Files:**
- Modify: `lib/regras.ts` (nova função `resumoRedes`, `conflitosPlanos` ampliada)
- Modify: `lib/dados.check.mjs` (testes)
- Modify: `app/(app)/convenios/[id]/page.tsx` (aba "Planos e redes")
- Modify: `app/(app)/convenios/page.tsx` (cartão da lista)

**Interfaces:**
- Produces: `resumoRedes(c: Convenio, d: DadosClinica): { subtipo: Subtipo; consultas: number; exames: number; examesCobertos: number }[]` (um item por rede de `c.subtipos`, na mesma ordem).

Contexto: cada convênio tem `subtipos` (redes com id, usadas pela busca e pelo "quem atende") e `gruposPlanos` (texto livre em 3 grupos). A Humana tem 32 redes e os 3 grupos vazios, então a tela diz "0 planos" e "gold" não é encontrado. As redes são a verdade; os grupos são complemento.

- [ ] **Step 1: Teste de `resumoRedes` e do conflito "somente exames com médico de consulta"**

Acrescente ao final da seção `// --- regras ---` de `lib/dados.check.mjs` (antes de `// --- busca ---`):

```js
// resumoRedes: conta médicos e exames por rede
{
  const conv = { id: "h", clinicaId: "comn", nome: "Humana", cor: "#000", subtipos: [{ id: "h-gold", nome: "Gold" }, { id: "h-flex", nome: "Flex" }],
    gruposPlanos: [{ status: "somente_exames", titulo: "Somente exames", planos: ["Gold"] }] };
  const d = { especialidades: [], convenios: [conv],
    exames: [{ id: "x", clinicaId: "comn", nome: "Mamo", preparo: [], subtipos: ["h-gold"] }],
    profissionais: [{ ...medico({ "h-gold": "ce" }), id: "p1" }, { ...medico({ "h-gold": "e" }), id: "p2" }] };
  assert.deepEqual(resumoRedes(conv, d).map((r) => [r.subtipo.id, r.consultas, r.exames, r.examesCobertos]), [["h-gold", 1, 2, 1], ["h-flex", 0, 0, 0]]);
  // Gold está em "Somente exames" mas tem médico com consulta: é conflito
  assert.deepEqual(conflitosPlanos(conv, d), ["Gold"]);
}
```

E inclua `resumoRedes` no import de `./regras.ts` no topo do arquivo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `node lib/dados.check.mjs` → falha com `resumoRedes` não exportado.

- [ ] **Step 3: Implementar em `lib/regras.ts`**

Logo após `conflitosPlanos`:

```ts
// Por rede: quantos médicos atendem consulta, quantos atendem exame e quantos exames a rede cobre
export function resumoRedes(c: Convenio, d: DadosClinica) {
  return c.subtipos.map((subtipo) => ({
    subtipo,
    consultas: d.profissionais.filter((p) => atende(p, subtipo.id, "consulta")).length,
    exames: d.profissionais.filter((p) => atende(p, subtipo.id, "exame")).length,
    examesCobertos: d.exames.filter((e) => e.subtipos.includes(subtipo.id)).length,
  }));
}
```

E troque `conflitosPlanos` por:

```ts
// planos em "Não atendemos" que têm médico ou exame vinculado, e planos em "Somente exames" com médico de consulta
export function conflitosPlanos(c: Convenio, d: DadosClinica): string[] {
  const usadas = new Set([...d.profissionais.flatMap((p) => Object.keys(p.atende)), ...d.exames.flatMap((e) => e.subtipos)]);
  const comConsulta = new Set(c.subtipos.filter((s) => d.profissionais.some((p) => atende(p, s.id, "consulta"))).map((s) => slug(s.nome)));
  const nomesUsados = new Set(c.subtipos.filter((s) => usadas.has(s.id)).map((s) => slug(s.nome)));
  const grupos = c.gruposPlanos ?? [];
  return [
    ...grupos.filter((g) => g.status === "nao_atende").flatMap((g) => g.planos).filter((p) => nomesUsados.has(slug(p))),
    ...grupos.filter((g) => g.status === "somente_exames").flatMap((g) => g.planos).filter((p) => comConsulta.has(slug(p))),
  ];
}
```

Run: `node lib/dados.check.mjs` → `ok`.

- [ ] **Step 4: Aba "Planos e redes" em `app/(app)/convenios/[id]/page.tsx`**

Importe `resumoRedes` de `@/lib/regras`. Depois de `const observacoes = useMemo(...)`, acrescente:

```tsx
  const redes = useMemo(() => (conv ? resumoRedes(conv, dados) : []), [conv, dados]);
```

Depois de `const totalPlanosEncontrados = ...`, acrescente:

```tsx
  const redesFiltradas = redes.filter((r) => combina(r.subtipo.nome, termo));
  const todosGruposVazios = !gAtende.planos.length && !gSomente.planos.length && !gNao.planos.length;
```

Troque o `<input placeholder="Buscar plano da carteirinha..."` por `placeholder="Buscar rede ou plano da carteirinha..."`.

Troque o parágrafo de contagem (`{termo && (<p ...>{totalPlanosEncontrados} ...`) por:

```tsx
          {termo && (
            <p className="text-xs font-semibold uppercase tracking-wider text-suave">
              {redesFiltradas.length} {redesFiltradas.length === 1 ? "rede" : "redes"} e {totalPlanosEncontrados} {totalPlanosEncontrados === 1 ? "plano" : "planos"} para &ldquo;{buscaPlano}&rdquo;
            </p>
          )}
```

Na coluna da esquerda (`<div className="space-y-4">`), ANTES do `.map` dos três grupos, insira o cartão de redes:

```tsx
              <div className="entrar rounded-3xl border border-borda bg-superficie p-5 shadow-card">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold text-texto">Redes cadastradas</h2>
                  <span className="text-[13px] font-semibold text-suave">{redesFiltradas.length} de {redes.length}</span>
                </div>
                {redes.length === 0 ? (
                  <p className="text-sm text-suave">Nenhuma rede cadastrada. Edite o convênio para incluir as redes da carteirinha.</p>
                ) : redesFiltradas.length === 0 ? (
                  <p className="text-sm text-suave">Nenhuma rede com &ldquo;{buscaPlano}&rdquo;.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {redesFiltradas.map((r) => {
                      const vinculo = r.consultas || r.exames
                        ? `${r.consultas} consulta${r.consultas === 1 ? "" : "s"} · ${r.exames} exame${r.exames === 1 ? "" : "s"}`
                        : "sem médico";
                      return (
                        <button key={r.subtipo.id} type="button" onClick={() => { setSubId(r.subtipo.id); setAba("corpo"); }}
                          title="Ver quem atende nesta rede"
                          className={`pressionavel inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium shadow-sm transition ${r.consultas || r.exames ? "border-verde/30 bg-verde-claro/40 text-texto hover:border-verde" : "border-borda bg-fundo text-suave hover:border-alerta/60"}`}>
                          {r.subtipo.nome}
                          <span className="text-[12px] text-suave">{vinculo}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
```

E troque o `.map` dos três grupos para não mostrar três linhas "Nenhum plano em ..." quando todos estão vazios: envolva-o em `{todosGruposVazios && !termo ? (<p className="px-2 text-sm text-suave">Os grupos da carteirinha (atende, somente exames, não atendemos) ainda não foram preenchidos.</p>) : ( ...map atual... )}`.

Na aba "corpo", troque o texto `Selecione o tipo de rede técnica:` por `Rede ou plano:` e `Nenhuma rede técnica vinculada.` por `Nenhuma rede cadastrada.` e `Nenhum exame credenciado nesta rede técnica.` por `Nenhum exame credenciado nesta rede.`.

- [ ] **Step 5: Cartão da lista em `app/(app)/convenios/page.tsx`**

Importe `resumoRedes`. Dentro do `.map` dos cartões, depois de `const countNao = ...`, acrescente:

```tsx
            const redes = resumoRedes(conv, dados);
            const comMedico = redes.filter((r) => r.consultas || r.exames).length;
            const gruposVazios = !countAtende && !countSomente && !countNao;
```

Troque o bloco `<div className="mt-5 space-y-2 border-t ...">` por uma versão que mostra primeiro as redes e só depois os grupos quando preenchidos:

```tsx
                  <div className="mt-5 space-y-2 border-t border-borda/60 pt-4 text-[13px] font-medium">
                    <div className="flex items-center justify-between text-texto">
                      <span>Redes cadastradas</span>
                      <span className={`font-bold ${redes.length ? "text-texto" : "text-suave"}`}>{redes.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-texto">
                      <span>Redes com médico</span>
                      <span className={`font-bold ${comMedico ? "text-texto" : "text-alerta"}`}>{comMedico}</span>
                    </div>
                    {!gruposVazios && (
                      <>
                        <div className="flex items-center justify-between text-texto">
                          <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-verde" />Consultas e exames</span>
                          <span className="font-bold">{countAtende} planos</span>
                        </div>
                        <div className="flex items-center justify-between text-texto">
                          <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-alerta" />Somente exames</span>
                          <span className="font-bold">{countSomente} planos</span>
                        </div>
                        {countNao > 0 && (
                          <div className="flex items-center justify-between text-texto">
                            <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-perigo" />Não atendidos</span>
                            <span className="font-bold">{countNao} planos</span>
                          </div>
                        )}
                      </>
                    )}
                    {obs.length > 0 && ( /* bloco "Regras operacionais" igual ao atual */ )}
                  </div>
```

(Mantenha o bloco de "Regras operacionais" exatamente como está hoje.)

- [ ] **Step 6: Verificar**

Run: `npx tsc --noEmit` → sem erro. Run: `node lib/dados.check.mjs` → `ok`.

- [ ] **Step 7: Commit**

```bash
git add lib/regras.ts lib/dados.check.mjs "app/(app)/convenios/[id]/page.tsx" "app/(app)/convenios/page.tsx"
git commit -m "Convênio: redes cadastradas aparecem e são buscáveis na tela do convênio e no cartão da lista"
```

---

### Task 3: Ficha do médico não diz "atendido, mas não nesta rede" para convênio que ele não atende

**Files:**
- Modify: `app/(app)/profissionais/[id]/page.tsx:370-389`

- [ ] **Step 1: Corrigir o texto**

No bloco `{/* Convênios da clínica que este médico NÃO atende */}`, o `.map` recebe `({ convenio: c, naoCobre })`. Dentro dele, calcule `const atendeAlgumaRede = c.subtipos.some((s) => (p.atende[s.id] ?? "") !== "");` e troque o `<p className="text-[13px] text-suave">Convênio atendido, mas não nesta rede</p>` (e o `naoCobre.length > 0 &&` que o guarda) por:

```tsx
                      <p className="text-[13px] text-suave">
                        {atendeAlgumaRede ? "Convênio atendido, mas não nesta rede" : "Este médico não atende este convênio"}
                      </p>
```

Os chips `naoCobre` só fazem sentido quando `atendeAlgumaRede`; mantenha-os dentro de `{atendeAlgumaRede && naoCobre.length > 0 && (...)}`.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit` → sem erro. Leitura: para o Dr. Rodrigo (p1 da semente antiga) buscando "cassi", o texto agora é "Este médico não atende este convênio".

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/profissionais/[id]/page.tsx"
git commit -m "Ficha do médico: convênio que ele não atende não aparece como 'atendido, mas não nesta rede'"
```

---

### Task 4: Busca com menos falso positivo, "você quis dizer" e mensagem certa para unidade vazia

**Files:**
- Modify: `lib/regras.ts` (`achaPalavra`, nova `sugestaoParaBusca`)
- Modify: `lib/dados.check.mjs`
- Modify: `app/(app)/busca/page.tsx` (três estados vazios: ~417, ~518, ~580)
- Modify: `components/ui.tsx` (componente `Vazio` ganha `children` opcional) — só se `Vazio` ainda não aceitar filhos.

**Interfaces:**
- Produces: `sugestaoParaBusca(nomes: string[], q: string): string | undefined`.

- [ ] **Step 1: Testes**

Na seção `// --- busca ---` de `lib/dados.check.mjs`, acrescente:

```js
// tolerância a erro só a partir de 6 letras: "bruna" não acha Bruno, "punsao" acha punção
assert(!combina("Dr. Bruno Reis", "bruna"));
assert(!combina("Dra. Paula Lins", "paulo"));
assert(combina("Punção aspirativa", "punsao"));
assert(combina("Mamografia bilateral", "mamografa"));
// "você quis dizer": até dois erros numa palavra de 4+ letras
assert.equal(sugestaoParaBusca(["Punção aspirativa por agulha fina (PAAF)", "Mamografia"], "pulsão"), "Punção aspirativa por agulha fina (PAAF)");
assert.equal(sugestaoParaBusca(["Mamografia", "Mamotomia"], "mamografai"), "Mamografia");
assert.equal(sugestaoParaBusca(["Mamografia"], "xyz"), undefined);
assert.equal(sugestaoParaBusca(["Mamografia"], ""), undefined);
```

Inclua `sugestaoParaBusca` no import. Run: `node lib/dados.check.mjs` → falha.

- [ ] **Step 2: Implementar em `lib/regras.ts`**

Em `achaPalavra`, troque `w.length >= 5` por `w.length >= 6`. Depois de `resultadoPrincipal`, acrescente:

```ts
// Distância de edição clássica (troca, falta, sobra), para a sugestão "você quis dizer"
function distancia(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Quando a busca não acha nada: o nome cuja alguma palavra fica a até 2 erros de alguma palavra buscada
export function sugestaoParaBusca(nomes: string[], q: string): string | undefined {
  const ws = palavras(q).filter((w) => w.length >= 4);
  if (!ws.length) return undefined;
  let melhor: { nome: string; dist: number } | undefined;
  for (const nome of nomes) {
    for (const t of palavras(nome)) {
      for (const w of ws) {
        const dist = distancia(w, t.slice(0, Math.max(w.length, t.length)));
        if (dist <= 2 && (!melhor || dist < melhor.dist)) melhor = { nome, dist };
      }
    }
  }
  return melhor?.nome;
}
```

Run: `node lib/dados.check.mjs` → `ok`. Se algum teste antigo de 5 letras com erro quebrar, ajuste o teste antigo para uma palavra de 6 letras (a regra nova é a correta).

- [ ] **Step 3: Estados vazios em `app/(app)/busca/page.tsx`**

Importe `sugestaoParaBusca`. Antes do `return (`, acrescente:

```tsx
  const unidadeVazia = !dados.profissionais.length && !dados.exames.length && !dados.convenios.length;
  const sugestaoTexto = q ? sugestaoParaBusca([...dados.exames, ...dados.profissionais, ...dados.convenios, ...dados.especialidades].map((x) => x.nome), q) : undefined;
  const vazio = (oQue: string) => unidadeVazia
    ? <Vazio texto="Esta unidade ainda não tem cadastro. Quem coordena a unidade cadastra médicos, convênios e exames." />
    : !filtrando
      ? <Vazio texto={`Nenhum ${oQue} cadastrado nesta unidade.`} />
      : (
        <div className="space-y-2 text-center">
          <Vazio texto={`Nenhum ${oQue} encontrado com os filtros atuais.`} />
          {sugestaoTexto && (
            <button type="button" onClick={() => setTexto(sugestaoTexto)} className="pressionavel text-sm font-semibold text-verde hover:underline">
              Você quis dizer “{sugestaoTexto}”?
            </button>
          )}
        </div>
      );
```

Troque `<Vazio texto="Nenhum profissional encontrado com os filtros atuais." />` por `{vazio("profissional")}`, `<Vazio texto="Nenhum convênio encontrado com os filtros atuais." />` por `{vazio("convênio")}` e `<Vazio texto="Nenhum exame encontrado com os filtros atuais." />` por `{vazio("exame")}`. Se a aba de especialidades usar `Vazio` com texto fixo, troque por `{vazio("especialidade")}` também. Confira que `filtrando` já existe (é `!!(q || subtipo || espOk)`).

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit` → sem erro. Run: `node lib/dados.check.mjs` → `ok`.

- [ ] **Step 5: Commit**

```bash
git add lib/regras.ts lib/dados.check.mjs "app/(app)/busca/page.tsx"
git commit -m "Busca: erro de digitação só a partir de 6 letras, sugestão 'você quis dizer' e mensagem certa para unidade sem cadastro"
```

---

### Task 5: Consulta ou Exame deduzido do que a atendente digitou

**Files:**
- Modify: `app/(app)/busca/page.tsx` (~155 `principal`, ~234-247 `Segmentado` de atendimento)

Contexto: com plano escolhido, o padrão é "Consulta". Quem digita "mamografia" vê 5 médicos de consulta e não percebe que precisa trocar para "Exame". Regra: enquanto a atendente não clicar no seletor nesta busca, o tipo segue o resultado principal (exame → "exame"; profissional ou especialidade → "consulta").

- [ ] **Step 1: Implementar**

Logo após `const campo = useRef<HTMLInputElement>(null);`, acrescente `const tipoManual = useRef(false);`.

No `useEffect` que ouve `cartilha:nova-ligacao` (função `limpar`), acrescente `tipoManual.current = false;`. No `useEffect(() => { if (!q) clicouAba.current = false; }, [q]);` acrescente também `if (!q) tipoManual.current = false;`.

Depois da linha `const mostrarPrincipal = ...`, acrescente:

```tsx
  // sem clique no seletor, o atendimento segue o que foi digitado: exame → Exame, médico/especialidade → Consulta
  const tipoSugerido = principal?.aba === "exames" ? "exame" : principal?.aba === "profissionais" || principal?.aba === "especialidades" ? "consulta" : undefined;
  useEffect(() => {
    if (!plano || tipoManual.current || !tipoSugerido || plano.tipo === tipoSugerido) return;
    escolherPlano({ ...plano, tipo: tipoSugerido });
  }, [plano, tipoSugerido]); // eslint-disable-line react-hooks/exhaustive-deps
```

No `Segmentado` de atendimento, troque `onChange={(t) => plano && escolherPlano({ ...plano, tipo: t })}` por `onChange={(t) => { tipoManual.current = true; if (plano) escolherPlano({ ...plano, tipo: t }); }}`.

Abaixo do `Segmentado` (dentro da `<div className="flex-1">`), quando o tipo veio da busca, mostre a dica: `{plano && !tipoManual.current && tipoSugerido && <span className="mt-1 block text-[12px] text-suave">Definido pela busca</span>}`.

Nota: a lista de profissionais filtra por `tipo`, mas `principal` para exames vem de `examesFiltrados`, que não depende de `tipo`; portanto não há oscilação.

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit` → sem erro. Run: `node lib/dados.check.mjs` → `ok`. Se o projeto tiver eslint configurado, nada roda (não há config); ignore.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/busca/page.tsx"
git commit -m "Busca: Consulta ou Exame segue o que foi digitado até a atendente escolher"
```

---

### Task 6: Formulário não pergunta "descartar?" sem alteração e exame guarda "documentos"

**Files:**
- Modify: `components/formularios.tsx` (`Campo` ~16-24, usos em ~440-448, `FormExame` ~997-1040)

Contexto: `Campo` é um `<label>`. A matriz de convênios e o seletor de exames ficam dentro dele, e o primeiro controle do label é um checkbox oculto (`name="c:..."`). Clicar num texto da matriz (nome de rede, "Rede / Plano") dispara o checkbox oculto; o React devolve o valor, mas o evento `input` chega ao `onInput` da `Moldura` e marca o formulário como alterado. Confirmado em 16/10: abrir, digitar no filtro, cancelar → "Descartar as alterações?".

- [ ] **Step 1: `Campo` vira `div` quando agrupa controles**

```tsx
export function Campo({ rotulo, children, dica, grupo }: { rotulo: string; children: React.ReactNode; dica?: string; grupo?: boolean }) {
  const Tag = grupo ? "div" : "label";
  return (
    <Tag className="block" role={grupo ? "group" : undefined} aria-label={grupo ? rotulo : undefined}>
      <span className="mb-1.5 block text-sm font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-[13px] text-suave">{dica}</span>}
    </Tag>
  );
}
```

Use `grupo` em todo `<Campo>` cujo filho não é um único `input`/`select`/`textarea`: `Convênios atendidos` (MatrizConvenios), `Exames que realiza` (SeletorExamesProfissional) e qualquer outro que envolva lista com checkbox (procure por `<Campo rotulo=` e olhe o filho; no FormConvenio e no FormExame há listas de redes e de médicos também).

- [ ] **Step 2: Campo "Documentos" no exame**

Em `FormExame`, acrescente após o campo "Preparo":

```tsx
      <Campo rotulo="Documentos necessários" dica="O que o paciente precisa trazer além do preparo, ex.: pedido médico e carteirinha.">
        <input name="documentos" defaultValue={ex?.documentos} className={campo} />
      </Campo>
```

E em `salvar`, dentro de `novo`: `documentos: String(f.get("documentos") ?? "").trim() || undefined,`.

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit` → sem erro. Run: `node lib/dados.check.mjs` → `ok`. Leitura: nenhum `<label>` envolve outro `<label>` dentro de `Campo grupo` (HTML inválido evitado).

- [ ] **Step 4: Commit**

```bash
git add components/formularios.tsx
git commit -m "Formulários: listas de convênios e exames fora do label (sem 'descartar?' falso) e campo Documentos no exame"
```

---

### Task 7: Importar redes por médico une com o que já existia

**Files:**
- Modify: `lib/repositorio.ts:281-285` (`importarRedesPorMedico`)
- Modify: `lib/dados.check.mjs`
- Modify: `app/(app)/importar/page.tsx` (dica de texto)

- [ ] **Step 1: Teste**

Na seção de importação de `lib/dados.check.mjs` (procure `importarRedesPorMedico`), acrescente um caso: médico com `"ce"` na rede Gold; planilha diz `"c"` para Gold; depois de importar, `atende["<id da gold>"]` continua `"ce"`. Use a mesma montagem de banco dos testes existentes de `importarRedesPorMedico` (copie o padrão da linha onde eles criam o convênio e o médico). O assert final:

```js
assert.equal(depois.profissionais.find((p) => p.id === ID_DO_MEDICO).atende[ID_DA_GOLD], "ce", "importar consulta não tira o exame que já existia");
```

Run: `node lib/dados.check.mjs` → falha com `'c' !== 'ce'`.

- [ ] **Step 2: Implementar**

Em `importarRedesPorMedico`, troque `atende: { ...p.atende, ...mapa }` por:

```ts
    const unido = Object.fromEntries(Object.entries(mapa).map(([id, v]) => [id, unirAtendimento(p.atende[id] as "c" | "e" | "ce" | undefined, v)]));
    novo = salvarProfissional(novo, u, { ...p, atende: { ...p.atende, ...unido } });
```

Run: `node lib/dados.check.mjs` → `ok`.

- [ ] **Step 3: Dica na tela de importação**

Em `app/(app)/importar/page.tsx`, onde explica o formato por médico (procure "consulta" ou "exame" no texto de ajuda), acrescente a frase: `Coluna de atendimento vazia vale "consulta e exame". O que o médico já tinha é mantido; a planilha só acrescenta.`

- [ ] **Step 4: Verificar e commit**

Run: `npx tsc --noEmit` → sem erro.

```bash
git add lib/repositorio.ts lib/dados.check.mjs "app/(app)/importar/page.tsx"
git commit -m "Importar por médico: une com a cobertura existente em vez de sobrescrever"
```

---

### Task 8: Dados antigos não somem em silêncio e cópia inválida é recusada

**Files:**
- Modify: `lib/repositorio.ts` (`migrar` ~34-55, `carregarProtegido` ~73-83)
- Modify: `lib/store.tsx` (~85-120, onde chama `carregarProtegido`)
- Modify: `app/(app)/usuarios/page.tsx` (lista de cópias automáticas)
- Modify: `lib/dados.check.mjs`

**Interfaces:**
- Produces: `carregarProtegido(): { banco: Banco; protegido: boolean; copiaGuardada: boolean }`; `listarCopias(): { chave: string; quando: string; texto: string }[]`.

- [ ] **Step 1: Testes**

Na seção de repositório de `lib/dados.check.mjs`, acrescente:

```js
// migrar recusa ficha que depois derrubaria a tela
{
  const base = pontoZero();
  assert.equal(migrar({ ...base, exames: [{ id: "x", clinicaId: "comn", nome: "Sem listas" }] }), null, "exame sem preparo/subtipos");
  assert.equal(migrar({ ...base, usuarios: [{ id: "u", nome: "U", email: "u@x", papel: "recepcao" }] }), null, "usuário sem clinicas");
  assert.ok(migrar(base), "semente passa");
}
```

Run → falha (os dois `migrar` devolvem o banco em vez de `null`).

- [ ] **Step 2: `migrar` confere exames e usuários**

Em `migrar`, depois da checagem de convênios, acrescente:

```ts
  if (!banco.exames.every((e) => e && listas(e, ["preparo", "subtipos"]))) return null;
  if (!banco.usuarios.every((u) => u && listas(u, ["clinicas"]))) return null;
```

Run: `node lib/dados.check.mjs` → `ok`.

- [ ] **Step 3: Avisar quando recomeçou do zero e listar cópias**

Em `carregarProtegido`, devolva também `copiaGuardada`:

```ts
export function carregarProtegido(): { banco: Banco; protegido: boolean; copiaGuardada: boolean } {
  let bruto: string | null;
  try { bruto = localStorage.getItem(CHAVE); } catch { return { banco: pontoZero(), protegido: false, copiaGuardada: false }; }
  if (!bruto) return { banco: pontoZero(), protegido: false, copiaGuardada: false };
  try {
    const b = migrar(JSON.parse(bruto));
    if (b) return { banco: b, protegido: false, copiaGuardada: false };
  } catch {}
  const guardou = guardarCopia(bruto);
  return { banco: pontoZero(), protegido: !guardou, copiaGuardada: guardou };
}

// Cópias automáticas guardadas quando o formato não foi reconhecido (mais recente primeiro)
export function listarCopias(): { chave: string; quando: string; texto: string }[] {
  const lista: { chave: string; quando: string; texto: string }[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${CHAVE_BACKUP}:`)) lista.push({ chave: k, quando: k.slice(CHAVE_BACKUP.length + 1), texto: localStorage.getItem(k) ?? "" });
    }
  } catch {}
  return lista.sort((a, b) => b.quando.localeCompare(a.quando));
}
```

Em `lib/store.tsx`, onde `carregarProtegido()` é chamado e `setProtegido(c.protegido)` roda (duas ocorrências, ~91 e ~115), acrescente: `if (c.copiaGuardada) avisar("Os dados guardados eram de um formato antigo e o sistema recomeçou do zero. Uma cópia foi guardada: o Administrador pode baixá-la em Usuários.", true);`.

Em `app/(app)/usuarios/page.tsx`, abaixo do bloco "Baixar cópia / Restaurar cópia", liste as cópias automáticas (só se houver):

```tsx
        {copias.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold">Cópias guardadas automaticamente</p>
            {copias.map((c) => (
              <div key={c.chave} className="flex items-center justify-between rounded-xl border border-borda px-3 py-2 text-sm">
                <span>{new Date(c.quando).toLocaleString("pt-BR")}</span>
                <Botao variante="secundario" onClick={() => baixarTexto(c.texto, `cartilha-copia-${c.quando.slice(0, 10)}.json`)}><Download className="size-4" />Baixar</Botao>
              </div>
            ))}
          </div>
        )}
```

com `const copias = useMemo(() => listarCopias(), []);` (importe `listarCopias` de `@/lib/repositorio` e `useMemo` do React) e uma função local `baixarTexto(texto, nome)` que cria o `Blob` e dispara o download, igual à função `baixar` já existente nessa página (reaproveite: extraia o trecho do `Blob`/`URL.createObjectURL` para `baixarTexto` e faça `baixar` chamar `baixarTexto(exportarBackup(banco), "cartilha-copia.json")`).

- [ ] **Step 4: Verificar e commit**

Run: `npx tsc --noEmit` → sem erro. Run: `node lib/dados.check.mjs` → `ok`.

```bash
git add lib/repositorio.ts lib/store.tsx lib/dados.check.mjs "app/(app)/usuarios/page.tsx"
git commit -m "Dados: aviso quando o formato antigo é guardado como cópia, lista de cópias em Usuários e cópia inválida recusada"
```

---

### Task 9: Textos honestos, botão de exemplo, logo e cartões alinhados

**Files:**
- Modify: `app/(app)/exames/page.tsx:44`
- Modify: `components/paineis.tsx:185`
- Modify: `app/(app)/convenios/page.tsx` (rótulos do botão modelo)
- Modify: `public/logos/oncoclinicas-mossoro.webp` e `.png` (trocar pelo arquivo da Oncoclínicas)
- Modify: `components/ui.tsx` (`CartaoProfissional`, ~405)

- [ ] **Step 1: "Só particular" vira "sem convênio cadastrado"**

`app/(app)/exames/page.tsx:44`: troque o texto `Só particular` por `Sem convênio cadastrado`.
`components/paineis.tsx:185`: troque `<Vazio texto="Disponível exclusivamente para atendimento Particular." />` por `<Vazio texto="Nenhum convênio marcado para este exame. Se for só particular, o valor está acima; se não, edite o exame e marque as redes." />`.

- [ ] **Step 2: Botão de exemplo deixa claro que é fictício**

Em `app/(app)/convenios/page.tsx`, troque `Carregar modelo (Saúde Mais)` por `Inserir exemplo fictício (Saúde Mais)` e `Inserir convênio modelo (Saúde Mais)` por `Inserir exemplo fictício (Saúde Mais)`. A mensagem de sucesso vira `Convênio de exemplo (fictício) adicionado. Apague antes de usar com dados reais.`.

- [ ] **Step 3: Logo da Oncoclínicas Mossoró**

O arquivo atual é a logo da Nossa Clínica (mesmo tamanho em bytes do `logos/Logo Nossa Clinica.png`). Não há logo própria de Mossoró no repositório; use a da Oncoclínicas (mesma marca):

```bash
cp public/logos/oncoclinicas.webp public/logos/oncoclinicas-mossoro.webp
cp public/logos/oncoclinicas.png public/logos/oncoclinicas-mossoro.png
```

- [ ] **Step 4: Cartões da busca com a mesma altura na linha**

Em `components/ui.tsx`, `CartaoProfissional`: acrescente `h-full` à className do `Link` (`"entrar pressionavel levanta group flex h-full w-full flex-col gap-4 ..."`). Confira se `.entrar` em `app/globals.css` define `align-self` ou `height`; se definir, remova para o cartão esticar na linha da grade.

- [ ] **Step 5: Verificar e commit**

Run: `npx tsc --noEmit` → sem erro. Run: `node lib/dados.check.mjs` → `ok`.

```bash
git add "app/(app)/exames/page.tsx" components/paineis.tsx "app/(app)/convenios/page.tsx" public/logos/oncoclinicas-mossoro.webp public/logos/oncoclinicas-mossoro.png components/ui.tsx
git commit -m "Textos honestos para exame sem convênio, exemplo fictício nomeado, logo da Oncoclínicas Mossoró e cartões alinhados"
```

---

## Fora deste plano (registrado, não feito)

- Troca do localStorage pelo Postgres (funções síncronas, Desfazer com banco inteiro, sigilo da Recepção só visual): é a fase do banco, não cabe em correção.
- Menu do topo abaixo de 1024 px corta o último item: é tela de celular/tablet, fora do uso real (monitores).
- Falsos positivos de prefixo ("gold" acha "Golden") são busca por prefixo, intencional.
