# Refinos de UX/UI e funcionalidades da cartilha — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os bugs e aplicar os refinos de UX/UI e de funcionalidade levantados na revisão de 14/10/2026, para a cartilha ficar pronta para o cadastro inicial e para o uso da central ao telefone.

**Architecture:** Next.js 16 (App Router) + Tailwind 4, tudo no cliente. Dados em `localStorage` (`cartilha:v1`) atrás de `lib/repositorio.ts` (funções puras `Banco → Banco` que checam permissão). Regras puras em `lib/regras.ts`. Estado em `lib/store.tsx`. Telas em `app/(app)/**`, componentes em `components/`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, lucide-react. Testes: `node lib/dados.check.mjs` (asserts com `node:assert`, imprime `ok`).

## Global Constraints

- Tudo em português do Brasil: textos de tela, nomes de funções, variáveis, comentários e mensagens de commit.
- Nenhuma dependência nova no `package.json`.
- Não usar `alert()`, `confirm()` nem `prompt()`: confirmação é sempre dentro da interface.
- Toda gravação passa por `lib/repositorio.ts` e confere permissão lá (o repositório é o "servidor" do protótipo).
- Seguir o estilo do código vizinho: comentários curtos e raros, componentes em português, classes Tailwind com os tokens de `app/globals.css` (`fundo`, `superficie`, `borda`, `texto`, `suave`, `verde`, `verde-claro`, `azul`, `azul-claro`, `alerta`, `alerta-claro`).
- Lógica nova em `lib/` ganha asserts em `lib/dados.check.mjs`.
- Verificação de cada tarefa: `node lib/dados.check.mjs` imprime `ok` e `npx tsc --noEmit` não mostra erro.
- Um commit por tarefa, terminando com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Não fazer push.
- Não mexer em `transcricao-audio-2.txt`, `CLAUDE.md`, `.claude/`.
- Sem dado clínico de paciente.

## Mapa de arquivos

| Arquivo | Responsabilidade | Tarefas |
|---|---|---|
| `lib/regras.ts` | busca por palavras, cobertura de rede, ids de rede, horários, tempo desde | 1, 6 |
| `lib/importar.ts` (novo) | ler tabela colada/CSV e planejar importação | 11 |
| `lib/repositorio.ts` | carregar/migrar/backup, salvar, excluir, validar, limpar órfãos, importar | 2, 3, 4, 5, 6, 9, 11 |
| `lib/modelo.ts` | tipos (papel `central`, observações internas, atualização) | 4, 6 |
| `lib/permissoes.ts` | papéis e `podeVerInterno` | 4 |
| `lib/store.tsx` | plano do paciente, desfazer, sincronizar abas, memo | 2, 5, 7 |
| `lib/logo.ts` | logo menor (WebP 256 px) | 2 |
| `lib/semente.ts` | usuário central com papel `central` | 4 |
| `components/ui.tsx` | Janela (painel lateral), SeletorConvenio acessível, Destaque, Atualizado, Avatar | 1, 6, 7, 8, 10 |
| `components/formularios.tsx` | Enter não salva, descartar com confirmação, redes com id fixo, restrição por rede, excluir, editar especialidade/usuário | 2, 3, 4, 5 |
| `components/paineis.tsx` | painel do exame | 1, 8 |
| `components/estrutura.tsx` | menu, Ctrl+K, chip do plano do paciente, toast com Desfazer | 5, 7, 10, 11 |
| `app/(app)/busca/page.tsx` | busca rápida | 1, 7 |
| `app/(app)/exames/page.tsx`, `convenios/page.tsx`, `convenios/[id]/page.tsx`, `profissionais/[id]/page.tsx`, `especialidades/page.tsx`, `usuarios/page.tsx`, `page.tsx` | refinos de tela | 5, 6, 9, 10 |
| `app/(app)/importar/page.tsx` (novo) | importar planilha | 11 |
| `app/globals.css` | tokens de cor e tamanho | 10 |

---

### Task 1: Busca por palavras, tolerante a erro, e cobertura de rede

Corrige "Humana Gold não encontra nada" em todas as telas e dá à busca do painel do exame e da ficha do médico o resultado "rede existe, mas não cobre".

**Files:**
- Modify: `lib/regras.ts`
- Modify: `lib/dados.check.mjs`
- Modify (trocar comparações `includes`/`semAcento` por `combina`): `app/(app)/busca/page.tsx`, `components/paineis.tsx` (`ChecadorConveniosExame`, `temTexto`), `app/(app)/profissionais/[id]/page.tsx` (`ChecadorConveniosProfissional`), `components/ui.tsx` (`SeletorConvenio`), `components/formularios.tsx` (filtros das matrizes e seletores), `app/(app)/exames/page.tsx`, `app/(app)/convenios/page.tsx`, `app/(app)/convenios/[id]/page.tsx`

**Interfaces (Produces):**
- `palavras(t: string): string[]`
- `combina(texto: string, q: string): boolean` — todas as palavras de `q` aparecem em `texto`, em qualquer ordem, sem acento/maiúscula; palavras com 5+ letras aceitam 1 erro (troca, falta, sobra ou inversão de letras). `q` vazio → `true`.
- `pontuacao(texto: string, q: string): number` — 0 quando não combina; maior quando o texto começa com a busca.
- `coberturaDaBusca(convenios: Convenio[], cobre: (s: Subtipo) => boolean, q: string): { convenio: Convenio; cobre: Subtipo[]; naoCobre: Subtipo[] }[]`
- `novaRedeId(convenioId: string, nome: string, usados: Set<string>): string`
- `juntarRedes(convenioId: string, existentes: Subtipo[], nomes: string[]): Subtipo[]`
- `idsDeRedes(d: Pick<DadosClinica, "convenios">): Set<string>`
- `gruposHorarios(hs: Horario[]): string[]` (e `resumoHorarios` passa a ser `gruposHorarios(hs).join("  |  ")`, mesmo resultado de antes)

- [ ] **Step 1: Escrever os asserts que falham** — acrescentar em `lib/dados.check.mjs`, logo após os asserts de `resumoHorarios`, e incluir os novos nomes no `import` de `./regras.ts`:

```js
// --- busca ---
assert(combina("Humana Saúde Gold", "humana gold"), "convênio + rede");
assert(combina("Humana Saúde Gold", "gold humana"), "qualquer ordem");
assert(combina("Dra. Helena Duarte Mastologia", "helena mastologia"));
assert(combina("Mamografia bilateral", "mamogarfia"), "letras invertidas");
assert(combina("Mamografia bilateral", "mamografa"), "uma letra a menos");
assert(combina("Mamografia bilateral", "mamo"), "começo da palavra");
assert(!combina("Humana Saúde Gold", "humana platinum"));
assert(!combina("Humana Saúde", "ana"), "pedaço curto no meio não conta");
assert(combina("qualquer coisa", "   "), "busca vazia combina");
assert(pontuacao("Mamografia bilateral", "mamo") > pontuacao("Ultrassom e mamografia", "mamo"));
assert.equal(pontuacao("Ultrassom", "mamo"), 0);

const humana = { id: "h", clinicaId: "comn", nome: "Humana Saúde", cor: "#000", subtipos: [
  { id: "h-gold", nome: "Gold" }, { id: "h-flex", nome: "Flex" }, { id: "h-gold-plus", nome: "Gold Plus" }] };
const cob = coberturaDaBusca([humana], (s) => s.id === "h-flex", "humana gold");
assert.equal(cob.length, 1);
assert.deepEqual(cob[0].cobre.map((s) => s.id), []);
assert.deepEqual(cob[0].naoCobre.map((s) => s.id), ["h-gold", "h-gold-plus"], "rede existe mas não cobre aparece");
assert.deepEqual(coberturaDaBusca([humana], () => true, "humana")[0].cobre.length, 3);
assert.deepEqual(coberturaDaBusca([{ ...humana, subtipos: [] }], () => true, "humana")[0], { convenio: { ...humana, subtipos: [] }, cobre: [], naoCobre: [] });
assert.deepEqual(coberturaDaBusca([humana], () => true, "unimed"), []);

// --- redes ---
assert.equal(novaRedeId("h", "Gold", new Set()), "h-gold");
assert.equal(novaRedeId("h", "Gold", new Set(["h-gold"])), "h-gold-2");
assert.equal(novaRedeId("h", "Gold", new Set(["h-gold", "h-gold-2"])), "h-gold-3");
const juntas = juntarRedes("h", humana.subtipos, ["gold", "Prático", "Pratico", " Novo  ", ""]);
assert.deepEqual(juntas.map((s) => s.nome), ["Gold", "Flex", "Gold Plus", "Prático", "Novo"], "não repete por acento/maiúscula");
assert.equal(juntas[0].id, "h-gold", "rede existente mantém o id");
assert.deepEqual([...idsDeRedes({ convenios: [humana] })], ["h-gold", "h-flex", "h-gold-plus"]);
assert.deepEqual(
  gruposHorarios([{ dia: "Sex", inicio: "08:00", fim: "12:00" }, { dia: "Seg", inicio: "08:00", fim: "12:00" }, { dia: "Ter", inicio: "14:00", fim: "18:00" }]),
  ["Seg e Sex · 08:00–12:00", "Ter · 14:00–18:00"],
);
```

- [ ] **Step 2: Rodar e ver falhar** — `node lib/dados.check.mjs` → erro de import (`combina` não existe).

- [ ] **Step 3: Implementar em `lib/regras.ts`** (adicionar `Subtipo` e `DadosClinica` ao import de tipos; `semAcento` e `slug` continuam):

```ts
export const palavras = (t: string) => semAcento(t).split(/[^a-z0-9]+/).filter(Boolean);

// Um erro de digitação: troca, falta, sobra ou inversão de duas letras vizinhas
function umErro(a: string, b: string) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1)
    || a.slice(i + 1) === b.slice(i)
    || a.slice(i) === b.slice(i + 1)
    || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
}

const achaPalavra = (w: string, ts: string[]) =>
  ts.some((t) => t.startsWith(w) || (w.length >= 4 && t.includes(w))
    || (w.length >= 5 && (umErro(w, t) || umErro(w, t.slice(0, w.length)))));

// "humana gold" acha "Humana Saúde · Gold": todas as palavras, em qualquer ordem
export function combina(texto: string, q: string) {
  const ws = palavras(q);
  if (!ws.length) return true;
  const ts = palavras(texto);
  return ws.every((w) => achaPalavra(w, ts));
}

export function pontuacao(texto: string, q: string) {
  if (!combina(texto, q)) return 0;
  const ws = palavras(q);
  const ts = palavras(texto);
  let p = 1;
  if (ts.join(" ").startsWith(ws.join(" "))) p += 4;
  if (ws.every((w) => ts.some((t) => t.startsWith(w)))) p += 2;
  if (ws.every((w) => ts.includes(w))) p += 1;
  return p;
}

// Para "o convênio do paciente cobre?": separa as redes encontradas entre as que cobrem e as que não
export function coberturaDaBusca(convenios: Convenio[], cobre: (s: Subtipo) => boolean, q: string) {
  return convenios.flatMap((c) => {
    if (!c.subtipos.length) return combina(c.nome, q) ? [{ convenio: c, cobre: [] as Subtipo[], naoCobre: [] as Subtipo[] }] : [];
    const achadas = c.subtipos.filter((s) => combina(`${c.nome} ${s.nome}`, q));
    return achadas.length ? [{ convenio: c, cobre: achadas.filter(cobre), naoCobre: achadas.filter((s) => !cobre(s)) }] : [];
  });
}

// O id da rede nasce do nome, mas não muda depois: renomear mantém o id
export function novaRedeId(convenioId: string, nome: string, usados: Set<string>) {
  const base = `${convenioId}-${slug(nome) || "rede"}`;
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  return id;
}

export function juntarRedes(convenioId: string, existentes: Subtipo[], nomes: string[]): Subtipo[] {
  const vistos = new Set(existentes.map((s) => slug(s.nome)));
  const usados = new Set(existentes.map((s) => s.id));
  const novas: Subtipo[] = [];
  for (const bruto of nomes) {
    const nome = bruto.trim().replace(/\s+/g, " ");
    if (!nome || vistos.has(slug(nome))) continue;
    vistos.add(slug(nome));
    const id = novaRedeId(convenioId, nome, usados);
    usados.add(id);
    novas.push({ id, nome });
  }
  return [...existentes, ...novas];
}

export const idsDeRedes = (d: Pick<DadosClinica, "convenios">) => new Set(d.convenios.flatMap((c) => c.subtipos.map((s) => s.id)));
```

Refatorar `resumoHorarios` em `gruposHorarios` (mesmo algoritmo, devolvendo o array) e `export function resumoHorarios(hs) { return hs.length ? gruposHorarios(hs).join("  |  ") : "Horários não informados"; }`. `gruposHorarios([])` devolve `[]`.

- [ ] **Step 4: Rodar** `node lib/dados.check.mjs` → `ok`.

- [ ] **Step 5: Trocar as buscas das telas por `combina`/`pontuacao`/`coberturaDaBusca`.**
  - `app/(app)/busca/page.tsx`: cada lista (profissionais, especialidades, convênios, exames) filtra com `combina(<texto do item>, q)` e ordena por `pontuacao` decrescente quando há `q`. O texto do profissional inclui nome + especialidade + procedimentos + nomes dos exames; do convênio inclui nome + nomes das redes; do exame inclui nome.
  - `components/paineis.tsx` → `ChecadorConveniosExame`: com busca, usar `coberturaDaBusca(dados.convenios, (s) => ex.subtipos.includes(s.id), busca)`. Para cada resultado: se `cobre.length`, cartão azul "✓ Coberto" com as redes que cobrem; se `naoCobre.length`, chips `tom="alerta"` "‹rede› · não cobre"; se as duas listas estão vazias (convênio sem redes), linha "Sem redes cadastradas". Lista vazia → mensagem "Nenhum convênio ou rede com “‹busca›” nesta unidade." Remover `temTexto` e usar `combina` também no filtro de médicos.
  - `app/(app)/profissionais/[id]/page.tsx` → `ChecadorConveniosProfissional`: mesma troca, com `cobre = (s) => atende(p, s.id, tipo)` (tipo atual da tela, ou "consulta ou exame" quando a tela não tiver tipo: `(p.atende[s.id] ?? "") !== ""`). Mostrar o terceiro grupo "Convênio atendido, mas não nesta rede" com os chips de `naoCobre` quando `cobre` está vazio.
  - `components/ui.tsx` → `SeletorConvenio`: o filtro de redes usa `combina(\`${c.nome} ${s.nome}\`, q)`.
  - `components/formularios.tsx`, `exames/page.tsx`, `convenios/page.tsx`, `convenios/[id]/page.tsx`: todo filtro de lista por texto usa `combina`.
  - Contagens de redes em `exames/page.tsx` e `busca/page.tsx` contam só ids que existem: `e.subtipos.filter((id) => validos.has(id)).length` com `validos = idsDeRedes(dados)`.

- [ ] **Step 6: Verificar** — `node lib/dados.check.mjs` → `ok`; `npx tsc --noEmit` sem erro; `grep -rn "semAcento(" app components` só pode sobrar em usos que não são filtro de busca (justificar no relatório).

- [ ] **Step 7: Commit** — `git commit -m "Busca por palavras em qualquer ordem, tolerante a erro, e cobertura de rede"`.

---

### Task 2: Proteção dos dados (backup, migração, Enter, descartar, armazenamento)

**Files:**
- Modify: `lib/repositorio.ts`, `lib/store.tsx`, `lib/logo.ts`, `lib/dados.check.mjs`
- Modify: `components/formularios.tsx` (`Moldura`), `components/ui.tsx` (`Gaveta`)
- Modify: `app/(app)/usuarios/page.tsx` (botões de cópia de segurança, só Administrador)

**Interfaces (Produces):**
- `migrar(b: unknown): Banco | null` — devolve o banco na versão atual ou `null` se não reconhecer. Hoje só aceita `versao === VERSAO`; a Task 4 acrescenta o passo 3→4.
- `CHAVE_BACKUP = "cartilha:backup"`
- `exportarBackup(b: Banco): string`
- `importarBackup(b: Banco, u: Usuario, texto: string): Banco` (só Administrador)

- [ ] **Step 1: Asserts que falham** em `lib/dados.check.mjs` (importar `migrar`, `exportarBackup`, `importarBackup`):

```js
// --- backup e migração ---
assert.equal(migrar(null), null);
assert.equal(migrar({ versao: 1 }), null, "formato desconhecido não vira banco");
assert.deepEqual(migrar(pontoZero()), pontoZero());
const copia = exportarBackup(b1);
assert.deepEqual(importarBackup(b0, adm, copia), b1);
assert.throws(() => importarBackup(b0, com, copia), ErroRepositorio, "só o Administrador restaura");
assert.throws(() => importarBackup(b0, adm, "{não é json"), ErroRepositorio);
```

(Colocar depois da seção `// --- repositório ---`, onde `b0`, `b1`, `adm`, `com` existem.)

- [ ] **Step 2: Rodar e ver falhar.**

- [ ] **Step 3: Implementar em `lib/repositorio.ts`:**

```ts
export const CHAVE_BACKUP = "cartilha:backup";

// Leva um banco guardado para a versão atual; null quando não reconhece o formato
export function migrar(b: unknown): Banco | null {
  if (!b || typeof b !== "object" || !Array.isArray((b as Banco).clinicas)) return null;
  const banco = b as Banco;
  return banco.versao === VERSAO ? banco : null;
}

export function carregar(): Banco {
  let bruto: string | null;
  try { bruto = localStorage.getItem(CHAVE); } catch { return pontoZero(); }
  if (!bruto) return pontoZero();
  try {
    const b = migrar(JSON.parse(bruto));
    if (b) return b;
  } catch {}
  // formato que esta versão não entende: guarda uma cópia antes de recomeçar, para não perder cadastro
  try { localStorage.setItem(`${CHAVE_BACKUP}:${new Date().toISOString()}`, bruto); } catch {}
  return pontoZero();
}

export const exportarBackup = (b: Banco) => JSON.stringify(b, null, 2);

export function importarBackup(_b: Banco, u: Usuario, texto: string): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador restaura uma cópia.");
  let novo: Banco | null = null;
  try { novo = migrar(JSON.parse(texto)); } catch {}
  exigir(!!novo, "Esse arquivo não é uma cópia da cartilha.");
  return novo!;
}
```

- [ ] **Step 4: Rodar** → `ok`.

- [ ] **Step 5: Store e logo.**
  - `lib/store.tsx`: tirar `avisouFalha`; avisar **toda** vez que `gravar` falhar ("Não deu para salvar no navegador: o espaço acabou. Baixe uma cópia de segurança em Usuários."). Ouvir o evento `storage` do `window` para a chave `CHAVE`: quando outra aba gravar, `setBanco(carregar())`.
  - `lib/logo.ts`: padrão `max = 256` e `canvas.toDataURL("image/webp", 0.85)`.

- [ ] **Step 6: Formulários.**
  - `Moldura` (`components/formularios.tsx`): no `<form>`, `onKeyDown` que faz `preventDefault()` quando `e.key === "Enter"` e o alvo é um `<input>` (textarea continua aceitando Enter). Marcar o formulário como "alterado" no primeiro `onInput`/`onChange`.
  - `Gaveta` (`components/ui.tsx`) ganha prop opcional `alterado?: boolean`. Ao tentar fechar (Esc, clique no fundo, botão Cancelar/X) com `alterado`, em vez de fechar mostra uma barra fixa no rodapé da gaveta: "Descartar as alterações?" com botões "Continuar editando" e "Descartar" (este fecha). Sem `alterado`, fecha como hoje. `Moldura` passa o estado para a `Gaveta` (via contexto simples ou elevando o estado em `Formularios`, o que ficar menor).

- [ ] **Step 7: Cópia de segurança na tela Usuários** (só `podeCriarUsuario`): seção "Cópia de segurança" com "Baixar cópia" (cria `Blob` de `exportarBackup(banco)` e baixa `cartilha-AAAA-MM-DD.json` com `<a download>` criado no clique) e "Restaurar cópia" (input `type=file` `.json` → lê o texto → pede confirmação dentro da tela: "Isto substitui todos os dados deste navegador. Restaurar?" → `executar((b, u) => importarBackup(b, u, texto), "Cópia restaurada")`).

- [ ] **Step 8: Verificar** `node lib/dados.check.mjs` e `npx tsc --noEmit`. **Commit:** `"Proteção dos dados: cópia antes de descartar, backup, Enter não salva e aviso ao descartar"`.

---

### Task 3: Redes com id fixo e limpeza de vínculos órfãos

**Files:**
- Modify: `lib/repositorio.ts` (`salvarConvenio`), `lib/dados.check.mjs`
- Modify: `components/formularios.tsx` (`FormConvenio`: edição das redes)
- Modify: `app/(app)/convenios/[id]/page.tsx` (aviso de conflito planos × redes)

**Interfaces:**
- Consumes: `juntarRedes`, `novaRedeId`, `idsDeRedes` (Task 1).
- Produces: `salvarConvenio` passa a remover dos médicos (`atende`, `restricoes[].subtipoId`) e exames (`subtipos`) da mesma clínica os ids de rede que saíram do convênio. `conflitosPlanos(c: Convenio, d: DadosClinica): string[]` em `lib/regras.ts` — nomes de planos em "Não atendemos" que também são redes com médico ou exame vinculado.

- [ ] **Step 1: Asserts que falham:**

```js
// --- redes órfãs ---
const convR = { id: "cr", clinicaId: "comn", nome: "Humana", cor: "#000", subtipos: [{ id: "cr-gold", nome: "Gold" }, { id: "cr-flex", nome: "Flex" }] };
let bR = salvarConvenio(b0, com, convR);
bR = salvarProfissional(bR, com, ficha("comn", { atende: { "cr-gold": "ce", "cr-flex": "c" }, restricoes: [{ texto: "x", subtipoId: "cr-gold" }] }));
bR = salvarExame(bR, com, { id: "xr", clinicaId: "comn", nome: "ECG", preparo: [], documentos: "", subtipos: ["cr-gold", "cr-flex"] });
// renomear mantém o id: nada se perde
const renomeado = salvarConvenio(bR, com, { ...convR, subtipos: [{ id: "cr-gold", nome: "Gold Nacional" }, { id: "cr-flex", nome: "Flex" }] });
assert.deepEqual(renomeado.profissionais[0].atende, { "cr-gold": "ce", "cr-flex": "c" });
// tirar a rede limpa os vínculos
const semGold = salvarConvenio(bR, com, { ...convR, subtipos: [{ id: "cr-flex", nome: "Flex" }] });
assert.deepEqual(semGold.profissionais[0].atende, { "cr-flex": "c" });
assert.equal(semGold.profissionais[0].restricoes[0].subtipoId, undefined);
assert.deepEqual(semGold.exames[0].subtipos, ["cr-flex"]);
assert.deepEqual(conflitosPlanos({ ...convR, gruposPlanos: [{ status: "nao_atende", titulo: "Não atendemos", planos: ["gold"] }] }, dadosDaClinica(bR, "comn")), ["gold"]);
```

- [ ] **Step 2: Ver falhar. Step 3: Implementar.**

```ts
// lib/repositorio.ts
export function salvarConvenio(b: Banco, u: Usuario, c: Convenio): Banco {
  const antes = b.convenios.find((x) => x.id === c.id);
  conferirClinica(u, c, antes);
  const ficam = new Set(c.subtipos.map((s) => s.id));
  const sairam = new Set((antes?.subtipos ?? []).map((s) => s.id).filter((id) => !ficam.has(id)));
  if (!sairam.size) return { ...b, convenios: gravarEm(b.convenios, c) };
  // rede que saiu do convênio não pode continuar marcada em médico nem em exame
  return {
    ...b,
    convenios: gravarEm(b.convenios, c),
    profissionais: b.profissionais.map((p) => p.clinicaId !== c.clinicaId ? p : {
      ...p,
      atende: Object.fromEntries(Object.entries(p.atende).filter(([id]) => !sairam.has(id))),
      restricoes: p.restricoes.map((r) => r.subtipoId && sairam.has(r.subtipoId) ? { texto: r.texto } : r),
    }),
    exames: b.exames.map((e) => e.clinicaId !== c.clinicaId ? e : { ...e, subtipos: e.subtipos.filter((id) => !sairam.has(id)) }),
  };
}
```

```ts
// lib/regras.ts
export function conflitosPlanos(c: Convenio, d: DadosClinica): string[] {
  const usadas = new Set([...d.profissionais.flatMap((p) => Object.keys(p.atende)), ...d.exames.flatMap((e) => e.subtipos)]);
  const nomesUsados = new Set(c.subtipos.filter((s) => usadas.has(s.id)).map((s) => slug(s.nome)));
  return (c.gruposPlanos ?? []).filter((g) => g.status === "nao_atende").flatMap((g) => g.planos).filter((p) => nomesUsados.has(slug(p)));
}
```

- [ ] **Step 4: Ver passar.**

- [ ] **Step 5: `FormConvenio` — redes como lista com id fixo.** Trocar a caixa de texto de redes por uma lista de linhas: cada rede existente é um `<input>` com o nome (nome do campo `rede:<id>`) e um botão "Remover" (ícone `X`, `aria-label="Remover rede ‹nome›"`). Abaixo, uma caixa "Acrescentar redes" (textarea; vírgula ou uma por linha, aceita colar a coluna da planilha) e um aviso de quantas são novas e quantas já existem (usar `juntarRedes` para pré-visualizar). Ao salvar: redes existentes = linhas que ficaram, com o nome editado e o **mesmo id**; novas = `juntarRedes(id, existentes, linhasDaCaixa)`. Se a mesma rede aparecer duas vezes (mesmo `slug`), mantém uma. Remover rede usada por médicos/exames mostra antes, inline, "Gold está marcada em 3 médicos e 2 exames. Remover mesmo assim?".

- [ ] **Step 6: Aviso de conflito** em `convenios/[id]/page.tsx`: se `conflitosPlanos(c, dados).length`, faixa `alerta` no topo: "‹planos› estão em “Não atendemos”, mas aparecem como cobertos em médicos ou exames. Confira o cadastro."

- [ ] **Step 7: Verificar e commit** — `"Redes com id fixo: renomear não quebra vínculos e remover limpa médicos e exames"`.

---

### Task 4: Papel Central, observações internas e restrição por rede

**Files:**
- Modify: `lib/modelo.ts`, `lib/permissoes.ts`, `lib/semente.ts`, `lib/repositorio.ts` (`migrar`, `dadosDaClinica`), `lib/store.tsx`, `lib/dados.check.mjs`
- Modify: `components/formularios.tsx` (`FormProfissional`: restrições com rede; campo de observações internas em médico e exame; `FormUsuario`: papel Central)
- Modify: `app/(app)/profissionais/[id]/page.tsx`, `components/paineis.tsx` (mostrar observações internas com selo "Interno")

**Interfaces (Produces):**
- `Papel = "administrador" | "comercial" | "coordenador" | "central" | "recepcao"`; `VERSAO = 4`.
- `Profissional.observacoesInternas?: string`, `Exame.observacoesInternas?: string`.
- `podeVerInterno(u: Usuario): boolean` (todos menos `recepcao`).
- `dadosDaClinica(b: Banco, clinicaId: string, u?: Usuario): DadosClinica` — sem `u` ou com `podeVerInterno(u)` devolve tudo; com recepção, devolve médicos e exames sem `observacoesInternas`.
- `podeGerenciarUnidades` passa a ser `u.papel !== "recepcao" && u.papel !== "central"`.

- [ ] **Step 1: Asserts que falham:**

```js
// --- central × recepção ---
const central = quem("central-comn");
assert.equal(central.papel, "central");
assert(podeVerInterno(central) && !podeVerInterno(recComn));
assert(!podeEditar(central, "comn") && podeVer(central, "comn"), "Central só consulta");
const bI = salvarProfissional(b0, coord, ficha("comn", { observacoesInternas: "só a central" }));
assert.equal(dadosDaClinica(bI, "comn", central).profissionais[0].observacoesInternas, "só a central");
assert.equal(dadosDaClinica(bI, "comn", recComn).profissionais[0].observacoesInternas, undefined, "recepção não vê");
// migração da versão 3: a central vira papel central
const v3 = { ...pontoZero(), versao: 3, usuarios: pontoZero().usuarios.map((u) => u.id === "central-comn" ? { ...u, papel: "recepcao" } : u) };
assert.equal(migrar(v3).versao, VERSAO);
assert.equal(migrar(v3).usuarios.find((u) => u.id === "central-comn").papel, "central");
```

E ajustar o assert existente de `b.usuarios.length` (continua 7) e o de `restaurarDemonstracao` (continua igual).

- [ ] **Step 2: Ver falhar. Step 3: Implementar.**
  - `lib/modelo.ts`: `Papel` com `"central"`; `VERSAO = 4`; campos opcionais acima.
  - `lib/permissoes.ts`: `PAPEIS.central = { rotulo: "Central", descricao: "Consulta, inclusive observações internas" }`; `PAPEIS.recepcao = { rotulo: "Recepção", descricao: "Consulta, sem observações internas" }`; `export const podeVerInterno = (u: Usuario) => u.papel !== "recepcao";` e o novo `podeGerenciarUnidades`.
  - `lib/semente.ts`: `central-comn` com `papel: "central"`.
  - `migrar`: antes de comparar a versão, `if (banco.versao === 3) banco = { ...banco, versao: 4, usuarios: banco.usuarios.map((u) => u.id === "central-comn" && u.papel === "recepcao" ? { ...u, papel: "central" } : u) };`
  - `dadosDaClinica(b, clinicaId, u?)`: quando `u && !podeVerInterno(u)`, mapear profissionais e exames removendo `observacoesInternas` (`({ observacoesInternas: _, ...resto }) => resto`).
  - `lib/store.tsx`: chamar `dadosDaClinica(banco, clinica.id, usuario)`.
  - `salvarUsuario`: `central` também precisa de clínica vinculada (mesma regra da recepção).

- [ ] **Step 4: Ver passar.**

- [ ] **Step 5: Formulários.**
  - `FormProfissional`: trocar a textarea de restrições por linhas editáveis: cada linha tem o texto e um seletor opcional "Vale só para a rede…" (`SeletorConvenio` compacto, valor `""` = vale para tudo); botão "Acrescentar restrição"; remover linha. Ao salvar, gravar `{ texto, subtipoId }` (sem `subtipoId` quando vazio) e **manter** o `subtipoId` das restrições que já existiam.
  - Médico e exame ganham o campo "Observações internas" com dica "A recepção não vê. Só central, coordenação e gestão."
  - `FormUsuario`: o seletor de papel lista os cinco papéis com a descrição de `PAPEIS`.
- [ ] **Step 6: Telas.** Ficha do médico, `QuemRealiza` e painel do exame mostram `observacoesInternas` (quando vier) num bloco com selo `Chip` "Interno". Restrição com `subtipoId` mostra o nome "‹Convênio› · ‹Rede›" junto do texto.
- [ ] **Step 7: Verificar e commit** — `"Papel Central, observações internas que a recepção não vê e restrição por rede"`.

---

### Task 5: Excluir com desfazer, editar especialidade e usuário

**Files:**
- Modify: `lib/repositorio.ts`, `lib/store.tsx`, `lib/dados.check.mjs`
- Modify: `components/formularios.tsx`, `components/estrutura.tsx` (toast com ação), `app/(app)/especialidades/page.tsx`, `app/(app)/usuarios/page.tsx`

**Interfaces (Produces):**
- `excluirProfissional(b, u, id)`, `excluirExame(b, u, id)` (tira o id de `profissionais[].exames`), `excluirConvenio(b, u, id)` (tira as redes dele de `atende`, `restricoes` e `exames[].subtipos`), `excluirEspecialidade(b, u, id)` (recusa se algum médico usa: "Mova os N médicos desta especialidade antes de excluir."), `excluirUsuario(b, u, id)` (só Administrador; recusa excluir a si mesmo). Todas `Banco → Banco` e conferem `podeEditar` da clínica do item.
- Store: `executar(op, sucesso, opcoes?: { desfazer?: boolean })` — com `desfazer`, guarda o banco anterior e o toast mostra o botão "Desfazer" (restaura o anterior). `aviso` ganha `acao?: { rotulo: string; fazer: () => void }`; o toast com ação dura 6 s.
- `Formulario`: `{ tipo: "especialidade"; id?: string }` e `{ tipo: "usuario"; id?: string }`.

- [ ] **Step 1: Asserts que falham:**

```js
// --- excluir ---
const bE = salvarExame(salvarProfissional(b0, coord, ficha("comn", { exames: ["xe"] })), coord, { id: "xe", clinicaId: "comn", nome: "ECG", preparo: [], documentos: "", subtipos: [] });
const semExame = excluirExame(bE, coord, "xe");
assert.equal(semExame.exames.length, 0);
assert.deepEqual(semExame.profissionais[0].exames, [], "médico deixa de apontar para o exame");
assert.equal(excluirProfissional(bE, coord, "m1").profissionais.length, 0);
assert.throws(() => excluirProfissional(bE, recComn, "m1"), ErroRepositorio);
assert.throws(() => excluirProfissional(b2, coord, "m1"), ErroRepositorio, "não exclui de outra clínica");
const semConv = excluirConvenio(bR, com, "cr");
assert.equal(semConv.convenios.length, 0);
assert.deepEqual(semConv.profissionais[0].atende, {});
assert.deepEqual(semConv.exames[0].subtipos, []);
const bEsp = salvarProfissional(salvarEspecialidade(b0, coord, { id: "e1", clinicaId: "comn", nome: "Cardio", icone: "" }), coord, ficha("comn", { especialidadeId: "e1" }));
assert.throws(() => excluirEspecialidade(bEsp, coord, "e1"), ErroRepositorio, "especialidade com médico não sai");
assert.equal(excluirEspecialidade(salvarEspecialidade(b0, coord, { id: "e2", clinicaId: "comn", nome: "X", icone: "" }), coord, "e2").especialidades.length, 0);
assert.equal(excluirUsuario(b0, adm, "recepcao-oncy").usuarios.length, 6);
assert.throws(() => excluirUsuario(b0, adm, "administrador"), ErroRepositorio, "não exclui a si mesmo");
assert.throws(() => excluirUsuario(b0, com, "recepcao-oncy"), ErroRepositorio);
```

(Depois da seção da Task 3, onde `bR` existe.)

- [ ] **Step 2: Ver falhar. Step 3: Implementar** as funções seguindo o padrão de `salvar*` (procurar o item, `exigir(!!item, "Não encontrado.")`, `conferirClinica(u, item)`, devolver banco novo sem mutar o anterior). Para `excluirConvenio`, reaproveitar a mesma limpeza da Task 3 (extrair um helper interno `limparRedes(b, clinicaId, ids: Set<string>)` usado por `salvarConvenio` e `excluirConvenio`).
- [ ] **Step 4: Ver passar.**
- [ ] **Step 5: UI.**
  - `Moldura` ganha prop opcional `onExcluir?: () => void` e `rotuloExcluir?: string`; mostra no rodapé, à esquerda, um botão texto vermelho "Excluir". O clique troca o rodapé por "Excluir ‹nome›? Esta ação some da cartilha para todos." + "Cancelar" e "Excluir" (vermelho). Confirmar chama `executar(op, "‹Nome› excluído", { desfazer: true })` e fecha a gaveta.
  - Ligar `onExcluir` nos formulários de profissional, exame, convênio, especialidade e usuário (só ao editar, nunca ao criar).
  - `FormEspecialidade` e `FormUsuario` aceitam `id` e editam. Botões "Editar" nas listas de `especialidades/page.tsx` e `usuarios/page.tsx` para quem pode.
  - Toast (`estrutura.tsx`) renderiza `aviso.acao` como botão "Desfazer".
- [ ] **Step 6: Verificar e commit** — `"Excluir com desfazer e editar especialidade e usuário"`.

---

### Task 6: Data da última atualização e copiar na ficha do médico e do convênio

**Files:**
- Modify: `lib/modelo.ts`, `lib/repositorio.ts`, `lib/regras.ts`, `lib/dados.check.mjs`
- Modify: `components/ui.tsx` (componente `Atualizado`), `app/(app)/profissionais/[id]/page.tsx`, `components/paineis.tsx`, `app/(app)/convenios/[id]/page.tsx`

**Interfaces (Produces):**
- `Convenio`, `Exame`, `Profissional` ganham `atualizadoEm?: string` (ISO) e `atualizadoPor?: string` (nome do usuário).
- `salvarProfissional`, `salvarExame`, `salvarExameComProfissionais`, `salvarConvenio` gravam `atualizadoEm: new Date().toISOString()` e `atualizadoPor: u.nome`.
- `tempoDesde(iso: string, agora?: Date): string` — "hoje", "ontem", "há N dias" (até 30), "há N meses", "há mais de um ano".
- `DIAS_PARA_REVISAR = 90`.
- `<Atualizado em={iso} por={nome} />` em `components/ui.tsx`: "Atualizado há 12 dias por Letícia"; com mais de 90 dias, tom `alerta` e texto extra "· pode estar desatualizado"; sem data, não renderiza nada.

- [ ] **Step 1: Asserts:**

```js
// --- atualização ---
const agora = new Date("2026-10-14T12:00:00Z");
assert.equal(tempoDesde("2026-10-14T08:00:00Z", agora), "hoje");
assert.equal(tempoDesde("2026-10-13T08:00:00Z", agora), "ontem");
assert.equal(tempoDesde("2026-10-02T08:00:00Z", agora), "há 12 dias");
assert.equal(tempoDesde("2026-06-10T08:00:00Z", agora), "há 4 meses");
assert.equal(tempoDesde("2025-01-10T08:00:00Z", agora), "há mais de um ano");
const bAt = salvarProfissional(b0, coord, ficha("comn"));
assert.equal(bAt.profissionais[0].atualizadoPor, coord.nome);
assert(!Number.isNaN(Date.parse(bAt.profissionais[0].atualizadoEm)));
```

- [ ] **Step 2–4:** ver falhar, implementar, ver passar. (Atenção: os asserts antigos que comparam médicos com `deepEqual` podem precisar ignorar `atualizadoEm`; ajustar comparando só os campos relevantes, sem afrouxar o que eles testam.)
- [ ] **Step 5: UI.** `Atualizado` no cabeçalho da ficha do médico, no painel do exame (abaixo do valor) e no cabeçalho do convênio. Botão "Copiar" na ficha do médico (texto: nome, especialidade, horários com `gruposHorarios`, restrições, observações (não as internas), procedimentos) e "Copiar regras" no convênio (nome + observações gerais + grupos de planos), reaproveitando o padrão de `copiar` do painel do exame (`navigator.clipboard.writeText` + `avisar`).
- [ ] **Step 6: Verificar e commit** — `"Mostra quando cada informação foi atualizada e copia ficha do médico e regras do convênio"`.

---

### Task 7: Busca rápida reorganizada, plano do paciente e atalhos

**Files:**
- Modify: `lib/store.tsx`, `components/estrutura.tsx`, `app/(app)/busca/page.tsx`, `components/ui.tsx` (`SeletorConvenio` acessível, `Destaque`)

**Interfaces:**
- Consumes: `combina`, `pontuacao`, `coberturaDaBusca` (Task 1); `atende` (regras).
- Produces (store): `plano: { subtipoId: string; tipo: Tipo } | null`, `escolherPlano(p: { subtipoId: string; tipo: Tipo } | null): void`, `novaLigacao(): void` (limpa o plano e dispara o evento `cartilha:nova-ligacao` que a busca escuta para limpar o texto). O plano fica em `sessionStorage` (`cartilha:plano:<clinicaId>`) e zera ao trocar de unidade.
- Produces (ui): `<Destaque texto={string} q={string} />` — envolve em `<mark className="rounded bg-verde-claro px-0.5 text-texto">` os trechos cujas palavras começam com alguma palavra de `q` (sem acento).

- [ ] **Step 1: Plano do paciente no store e no topo.** `estrutura.tsx`: quando há `plano`, mostrar no topo do conteúdo (acima de `children`, em todas as telas com unidade) uma faixa compacta: logo do convênio + "Paciente: ‹Convênio› · ‹Rede› · ‹Consulta|Exame›" + botão "Trocar" (abre o `SeletorConvenio`) + botão "Nova ligação". Sem plano, nada.
- [ ] **Step 2: Busca rápida.**
  - Filtros: o `SeletorConvenio` passa a ler e gravar `plano` do store (o estado local `subtipo` sai). O `Segmentado` Consulta/Exame ganha o rótulo "Atendimento" à esquerda e só fica ativo com plano escolhido. O filtro de especialidade vira um seletor no **mesmo estilo** do seletor de convênio (botão + lista com busca), sem `<select>` nativo.
  - Mostrar o filtro ativo **uma vez**: tirar o chip "Filtros ativos" e o cartão "Rede ativa" (a faixa do Step 1 já mostra o plano).
  - Os 4 cartões grandes viram uma barra de abas compacta (`role="tablist"`): "Profissionais 10", "Exames 2", "Convênios 0", "Especialidades 5", com a aba ativa marcada por fundo `verde-claro` e texto `verde`; sem selo "ATIVO" e sem animação de contador.
  - Ao digitar: se a aba atual fica com 0 resultados e outra tem resultados, trocar para a de mais resultados (só enquanto a pessoa não clicou numa aba nesta busca).
  - Sugestão de plano: quando `q` tem 2+ letras e `coberturaDaBusca(dados.convenios, () => true, q)` acha redes cuja combinação usa o nome da rede (não só o do convênio), mostrar até 3 botões abaixo do campo: "Usar ‹Convênio› · ‹Rede› como plano do paciente". Clicar chama `escolherPlano({ subtipoId, tipo: "consulta" })` e limpa o texto.
  - Resultados com `Destaque` no nome.
  - Estado na URL: `q`, `aba`, `esp` em `searchParams` (`router.replace` sem rolar), lidos na carga. Voltar da ficha do médico devolve a mesma busca.
  - Recentes: ao abrir médico ou exame a partir da busca, guardar `{ tipo, id }` em `localStorage` `cartilha:recentes:<clinicaId>` (máx. 8, sem repetir, com try/catch). Com `q` vazio, mostrar "Abertos recentemente" acima da lista.
  - O botão "Filtrar médicos" do cartão de convênio abre o `SeletorConvenio` já filtrado com o nome do convênio (em vez de escolher a primeira rede).
- [ ] **Step 3: Atalhos.** Em `estrutura.tsx`, `Ctrl+K` (e `/` fora de campos de texto) leva para `/busca` e foca o campo (evento `cartilha:focar-busca` que a busca escuta). Mostrar a dica "Ctrl K" no campo de busca no lugar do "/".
- [ ] **Step 4: `SeletorConvenio` acessível.** Fecha com Esc; setas ↑/↓ movem a opção ativa (`aria-activedescendant`), Enter escolhe; o "limpar" vira um `<button>` irmão (não `span` dentro de `button`); itens com `text-sm` (14 px).
- [ ] **Step 5: Verificar** `npx tsc --noEmit`, `node lib/dados.check.mjs`, e no navegador: digitar "humana gold" mostra a sugestão; "mamo" troca para Exames; voltar da ficha mantém a busca. **Commit:** `"Busca rápida: abas compactas, plano do paciente, sugestão de rede, busca na URL, recentes e Ctrl+K"`.

---

### Task 8: Painel do exame como painel lateral de verdade

**Files:**
- Modify: `components/ui.tsx` (`Janela`, remover `Luz`), `components/paineis.tsx`, `components/estrutura.tsx` (exame na URL)

- [ ] **Step 1: `Janela`.** Painel lateral à direita, altura total, largura `min(560px, 100vw)`, fundo escurecido leve atrás (clique fecha). Cabeçalho fixo com o título e um botão "Fechar" visível (ícone `X` + `aria-label="Fechar"`). Esc fecha. Ao abrir, foco vai para o botão Fechar; ao fechar, volta para o elemento que abriu. Sem as bolinhas de janela de Mac (`Luz` sai). `role="dialog"`, `aria-modal="true"`, `aria-labelledby` no título.
- [ ] **Step 2: Painel do exame.**
  - Título só uma vez (o `h2` do conteúdo vira o título da `Janela`; o cabeçalho interno fica com ícone, valor particular, `Atualizado` e botões).
  - Com `plano` no store: logo no topo, resposta grande: "✓ ‹Convênio› · ‹Rede› cobre este exame" (verde) ou "✗ ‹Convênio› · ‹Rede› não cobre este exame" (alerta), com "Particular: R$ …" ao lado quando não cobre.
  - Convênios que cobrem: lista **visível** (sem botão "Ver todos"): uma linha por convênio com logo, nome e selo "Todas as redes (N)" ou "N de M redes"; clicar abre as redes (chips), com busca quando houver mais de 6. Acima da lista, a busca "O plano do paciente cobre?" usando `coberturaDaBusca` (como na Task 1).
  - Quem realiza: mantém o comportamento atual (abre observações e restrições), com observações internas da Task 4.
- [ ] **Step 3: Exame na URL.** Abrir o painel acrescenta `?exame=<id>` (sem perder os outros parâmetros); fechar remove; carregar a página com `?exame=` abre o painel.
- [ ] **Step 4: Verificar no navegador** (abrir, Esc fecha, X fecha, link com `?exame=` abre) e commit — `"Painel do exame lateral com botão fechar, resposta do plano do paciente e convênios visíveis"`.

---

### Task 9: Refinos das telas Exames, Convênios, Convênio, Médico, Unidades e validações

**Files:**
- Modify: `app/(app)/exames/page.tsx`, `app/(app)/convenios/page.tsx`, `app/(app)/convenios/[id]/page.tsx`, `app/(app)/profissionais/[id]/page.tsx`, `app/(app)/page.tsx`, `lib/repositorio.ts`, `lib/dados.check.mjs`

- [ ] **Step 1: Validações no repositório (asserts primeiro):**

```js
// --- validações ---
assert.throws(() => salvarProfissional(b0, coord, ficha("comn", { horarios: [{ dia: "Seg", inicio: "14:00", fim: "08:00" }] })), ErroRepositorio);
const bEs = salvarEspecialidade(b0, coord, { id: "e1", clinicaId: "comn", nome: "Mastologia", icone: "" });
assert.throws(() => salvarEspecialidade(bEs, coord, { id: "e9", clinicaId: "comn", nome: "mastologia ", icone: "" }), ErroRepositorio, "especialidade repetida");
assert.equal(salvarEspecialidade(bEs, coord, { id: "e1", clinicaId: "comn", nome: "Mastologia", icone: "" }).especialidades.length, 1, "editar a mesma não acusa repetição");
assert.throws(() => salvarUsuario(b0, adm, { ...novoUsuario, id: "n2", email: "RECEPCAO.COMN@exemplo.com.br" }), ErroRepositorio, "e-mail repetido");
```

Mensagens: "Horário de ‹dia›: o início precisa ser antes do fim.", "Já existe a especialidade ‹nome› nesta clínica.", "Já existe um usuário com este e-mail." Implementar e ver passar.

- [ ] **Step 2: Exames (`exames/page.tsx`).** Cartão: nome (até 2 linhas), valor particular em destaque (`verde`) ou "Valor não cadastrado", linha "N médicos · cobre M convênios" (convênios distintos com alguma rede válida), selo "Só particular" quando não há convênio, selo "Nenhum médico vinculado" (alerta) quando não há médico. Com `plano`: selo "✓ cobre" ou "✗ não cobre". Sem ícone de frasco repetido e sem seta ↗; o cartão inteiro é um `<button>` que abre o painel. Rodapés alinhados (cartão `flex flex-col`, rodapé `mt-auto`).
- [ ] **Step 3: Convênios (`convenios/page.tsx`).** Título "Convênios e manuais de atendimento". Tirar o selo "COMN" (e o fallback fixo "COMN" de `convenios/page.tsx` e `convenios/[id]/page.tsx`). "0 planos" em cinza (`suave`); números com dados em `texto`. O cartão inteiro é o link; tirar o link duplicado "Abrir guia do convênio".
- [ ] **Step 4: Convênio (`convenios/[id]/page.tsx`).** Observações gerais só na coluna da direita (tirar a aba duplicada) — ou só na aba; ficar com a coluna. Rótulos das abas numa linha só (`whitespace-nowrap`, rolagem horizontal se faltar espaço). Grupos de planos vazios viram uma linha discreta "Nenhum plano em ‹grupo›" sem cartão grande. Tirar o texto inventado "Regra ativa para atendimento presencial e recepção". Seleção de rede com mais de 6 redes usa o `SeletorConvenio`/lista com busca em vez do `Segmentado`. Excluir observação: botão visível também no foco (`focus-visible:opacity-100`) e com "Desfazer" (Task 5); ao adicionar observação, só limpar o campo se `executar` devolver `true`.
- [ ] **Step 5: Médico (`profissionais/[id]/page.tsx`).** Tirar "Disponível na clínica em outras especialidades". "Voltar para a busca" aponta para `/busca`; o "Voltar" usa `history.back()` só se `history.length > 1`, senão `/busca`. Link direto de médico ou convênio de outra unidade: procurar em `banco` (não só em `dados`), conferir `podeVer(usuario, item.clinicaId)` e chamar `escolherClinica(item.clinicaId)`; sem permissão, "Você não tem acesso a esta unidade."
- [ ] **Step 6: Unidades (`page.tsx`).** Com uma unidade só, entrar direto na busca (`router.replace("/busca")` depois de escolher). Cartão sem o nome repetido quando a logo já mostra o nome? Não: manter o nome (é a única informação textual), mas tirar o degradê do botão (Task 10 cuida da cor).
- [ ] **Step 7: Verificar e commit** — `"Refinos de Exames, Convênios, ficha do médico e validações de cadastro"`.

---

### Task 10: Sistema visual (contraste, tamanhos, um acento, nomes e horários)

**Files:**
- Modify: `app/globals.css`, `components/ui.tsx`, `components/estrutura.tsx`, `app/(app)/**` onde houver as classes citadas, `lib/store.tsx` (memo)

- [ ] **Step 1: Tokens.** `--color-suave: #4b6470` (contraste ≥ 5:1 sobre `fundo`). Conferir que `text-suave/60` não é usado em texto que precisa ser lido (só ícone decorativo).
- [ ] **Step 2: Tamanhos.** Nenhum texto de conteúdo abaixo de 13 px: trocar `text-[11px]` e `text-[10px]` de conteúdo por `text-xs` (12 px) só em rótulos em maiúsculas/contadores, e por `text-[13px]` em textos lidos (placeholders, itens de lista, "Coberto por…", dicas). Placeholders dos campos de busca em 14–15 px.
- [ ] **Step 3: Um acento.** Botões primários e "Continuar na unidade": fundo `verde` sólido (hover um tom mais escuro), sem `gradiente-marca` (manter a classe só na marca/logo, se usada lá). Azul fica só para o que é de exame (ícone/selos de exame e redes).
- [ ] **Step 4: Avatar.** Fundo `verde-claro`, texto `verde`, cantos `rounded-xl` (sem cor aleatória por nome).
- [ ] **Step 5: Cartão de médico (`CartaoProfissional` e listas).** Nome com `line-clamp-2` em vez de `truncate`; horários com `gruposHorarios` (um grupo por linha, sem `|`).
- [ ] **Step 6: Textos.** Títulos em caixa de frase ("Todos os profissionais", "Profissionais encontrados"); nome do usuário e da organização na barra lateral quebram em 2 linhas em vez de cortar.
- [ ] **Step 7: Desempenho.** `Icone` em `components/ui.tsx` deixa de importar `* as Icones`: mapa explícito com os ícones usados como ícone de especialidade (procurar os valores de `icone` usados no código/formulário) e um padrão (`Stethoscope`). No store, `dados` com `useMemo` (dependências `banco`, `clinica?.id`, `usuario`) e o objeto do contexto com `useMemo`.
- [ ] **Step 8: Verificar no navegador** (busca, exames, convênios, ficha do médico em 1280 px e em 400 px de largura) e commit — `"Sistema visual: contraste, tamanhos mínimos, um acento só, nomes e horários legíveis"`.

---

### Task 11: Importar planilha de redes (por convênio e por médico)

**Files:**
- Create: `lib/importar.ts`, `app/(app)/importar/page.tsx`
- Modify: `lib/repositorio.ts`, `lib/dados.check.mjs`, `components/estrutura.tsx` (item de menu "Importar", só para quem edita a unidade atual)
- Ler antes: `.claude/skills/importar-planilha/SKILL.md` (formato combinado com a cliente).

**Interfaces (Produces):**
- `lerTabela(texto: string): string[][]` — aceita colagem do Excel (tab), CSV com `;` ou `,`, aspas; ignora linhas vazias; tira espaços.
- `semCabecalho(linhas: string[][]): string[][]` — tira a 1ª linha quando a 1ª célula, sem acento, é `rede`, `plano`, `produto`, `medico` ou `profissional`.
- `planejarRedes(c: Convenio, nomes: string[]): { novas: string[]; existentes: string[]; repetidas: string[] }`
- `planejarRedesPorMedico(d: DadosClinica, c: Convenio, linhas: string[][]): { itens: { profissionalId: string; medico: string; rede: string; atendimento: "c" | "e" | "ce" }[]; semMedico: string[] }` — colunas: médico, rede, atendimento opcional ("consulta" → c, "exame" → e, vazio/"ambos" → ce). Médico achado por `combina(p.nome, celula)` com exatamente 1 resultado; senão vai para `semMedico`.
- Repositório: `importarRedes(b, u, convenioId, nomes: string[]): Banco` (usa `juntarRedes`) e `importarRedesPorMedico(b, u, convenioId, itens): Banco` (cria as redes que faltam com `juntarRedes`, depois grava `atende[subtipoId] = atendimento` em cada médico). Ambos conferem `podeEditar`.

- [ ] **Step 1: Asserts:**

```js
// --- importar ---
assert.deepEqual(lerTabela("Rede\nGold\n\nFlex  \n"), [["Rede"], ["Gold"], ["Flex"]]);
assert.deepEqual(lerTabela("Médico\tRede\nDra. Ana\tGold"), [["Médico", "Rede"], ["Dra. Ana", "Gold"]]);
assert.deepEqual(lerTabela('a;"b; c"\n1;2'), [["a", "b; c"], ["1", "2"]]);
assert.deepEqual(semCabecalho([["Rede"], ["Gold"]]), [["Gold"]]);
assert.deepEqual(semCabecalho([["Gold"]]), [["Gold"]]);
assert.deepEqual(planejarRedes(humana, ["gold", "Nacional", "Nacional", "Prata"]), { novas: ["Nacional", "Prata"], existentes: ["gold"], repetidas: ["Nacional"] });
const dI = { especialidades: [], exames: [], convenios: [humana], profissionais: [
  { ...medico({}), id: "pa", nome: "Dra. Ana Lima" }, { ...medico({}), id: "pb", nome: "Dr. Bruno Reis" }] };
const plano = planejarRedesPorMedico(dI, humana, [["Ana Lima", "Gold", "consulta"], ["Bruno", "Nacional", ""], ["Carlos", "Gold", ""]]);
assert.deepEqual(plano.itens, [
  { profissionalId: "pa", medico: "Dra. Ana Lima", rede: "Gold", atendimento: "c" },
  { profissionalId: "pb", medico: "Dr. Bruno Reis", rede: "Nacional", atendimento: "ce" }]);
assert.deepEqual(plano.semMedico, ["Carlos"]);
let bImp = salvarConvenio(b0, com, { ...humana, clinicaId: "comn" });
bImp = salvarProfissional(salvarProfissional(bImp, com, { ...medico({}), id: "pa", clinicaId: "comn", nome: "Dra. Ana Lima" }), com, { ...medico({}), id: "pb", clinicaId: "comn", nome: "Dr. Bruno Reis" });
bImp = importarRedesPorMedico(bImp, com, "h", plano.itens);
assert.equal(bImp.convenios[0].subtipos.at(-1).nome, "Nacional", "rede que faltava é criada");
assert.equal(bImp.profissionais.find((p) => p.id === "pa").atende["h-gold"], "c");
assert.equal(bImp.profissionais.find((p) => p.id === "pb").atende["h-nacional"], "ce");
assert.equal(importarRedes(bImp, com, "h", ["Prata", "gold"]).convenios[0].subtipos.length, 5);
assert.throws(() => importarRedes(bImp, recComn, "h", ["X"]), ErroRepositorio);
```

(Depois dos asserts da Task 1, onde `humana` existe, e da seção de repositório.)

- [ ] **Step 2–4:** ver falhar, implementar `lib/importar.ts` e as funções do repositório, ver passar. Base do leitor:

```ts
function dividir(linha: string, sep: string) {
  const celulas: string[] = [];
  let atual = "", aspas = false;
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas;
    else if (ch === sep && !aspas) { celulas.push(atual); atual = ""; }
    else atual += ch;
  }
  celulas.push(atual);
  return celulas;
}

export function lerTabela(texto: string): string[][] {
  const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const sep = ["\t", ";", ","].find((s) => linhas.some((l) => l.includes(s)));
  return linhas.map((l) => (sep ? dividir(l, sep) : [l]).map((c) => c.trim()));
}
```

- [ ] **Step 5: Tela `/importar`.** Passo 1: escolher o convênio da unidade (lista com busca). Passo 2: escolher o modo — "Redes do convênio (uma por linha)" ou "Redes por médico (médico, rede, atendimento)". Passo 3: colar da planilha (textarea grande) **ou** escolher um arquivo `.csv` (`FileReader`). Passo 4: prévia — modo redes: "N novas · M já existiam · K repetidas", com as listas; modo por médico: tabela médico → rede → atendimento e a lista "Médicos não encontrados" (com dica "confira o nome como está no cadastro"). Botão "Importar" só com algo a importar; chama `executar(..., "N redes importadas", { desfazer: true })`. Item "Importar" no menu para quem `podeEditarAtual`.
- [ ] **Step 6: Verificar** (colar 3 redes na Humana e ver na página do convênio; colar 2 linhas por médico e ver na ficha) e commit — `"Importa redes de planilha, por convênio e por médico"`.

---

## Depois das tarefas

1. Revisão final de todo o diff (agente revisor, sem editar), correção do que ele confirmar.
2. `node lib/dados.check.mjs`, `npx tsc --noEmit`, `npx next build`.
3. Conferência no navegador das telas de antes, com os mesmos dados de exemplo.
4. `git pull --rebase`, `git push`.
