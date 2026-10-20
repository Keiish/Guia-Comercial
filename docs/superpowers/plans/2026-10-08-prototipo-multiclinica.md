# Protótipo multiclínica: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o protótipo atual (clínicas de exemplo e setores) no protótipo multiclínica da especificação: organizações, clínicas, quatro papéis, logos, dados guardados no navegador e ponto zero vazio para cadastro ao vivo.

**Architecture:** Os dados viram listas planas no formato das futuras tabelas (`lib/modelo.ts`). Um único módulo (`lib/repositorio.ts`) lê, grava e confere permissões (`lib/permissoes.ts`) com funções puras do tipo `(banco, usuario, item) => banco`; ele também guarda o JSON no `localStorage`. O `store` React só segura a sessão (usuário e clínica atual), chama o repositório e redesenha; as telas recebem os dados da clínica atual no mesmo formato de hoje (`dados.especialidades`, `dados.convenios`...).

**Tech Stack:** Next.js 16.4 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, lucide-react. Testes de lógica com `node:assert` rodando direto em Node 24 (`node lib/dados.check.mjs`, que remove os tipos sozinho).

**Especificação:** `docs/superpowers/specs/2026-10-08-prototipo-multiclinica-design.md`

## Global Constraints

- Tudo em português do Brasil: textos de tela, nomes de campos, mensagens de erro, nomes de variáveis e funções novas.
- Nenhuma menção a "Mountain" no sistema. Papéis aparecem como: Administrador, Comercial, Coordenador, Recepção/Central.
- Sem dependências novas. Usar só o que está no `package.json` (next, react, lucide-react, tailwindcss).
- Next.js 16 tem APIs diferentes das versões antigas: antes de usar uma API do Next que não aparece no código atual, ler o guia em `node_modules/next/dist/docs/`.
- Dentro de `lib/`, imports de valor entre arquivos `.ts` usam caminho relativo **com** a extensão (`./modelo.ts`), porque o teste roda esses arquivos direto no Node. Componentes e páginas continuam importando com `@/lib/...` sem extensão.
- Arquivos em `lib/` lidos pelo teste só podem usar TypeScript "apagável": nada de `enum`, `namespace` ou parâmetros de construtor com modificador (`constructor(private x)`).
- Nunca usar `window.alert`, `window.confirm` ou `window.prompt`. Confirmação e erro aparecem dentro da tela (aviso do `store` ou bloco na própria página).
- Animações: reaproveitar as classes de `app/globals.css` (`entrar` com `--i`, `pressionavel`, `levanta`, `gaveta`). Nada de biblioteca de animação.
- Chave do `localStorage` dos dados: `cartilha:v1`. Sessão: `cartilha:usuario` e `cartilha:clinica`.
- Ids de registros novos são gerados por `novoId(prefixo)`, nunca a partir do nome (dois convênios "Unimed" em clínicas diferentes não podem colidir).
- Comandos de verificação, todos na raiz do projeto: `node lib/dados.check.mjs` (imprime `ok`), `npx tsc --noEmit` (sem saída), `npm run build` (termina com a tabela de rotas, sem erro).
- O servidor de desenvolvimento roda com `npm run dev` em http://localhost:3000.

---

## Mapa de arquivos

| Arquivo | Situação | Responsabilidade |
|---|---|---|
| `lib/modelo.ts` | novo | Tipos (um por futura tabela), `DIAS`, `VERSAO`, `Banco`, `DadosClinica` |
| `lib/regras.ts` | novo | Funções puras usadas pelas telas: `atende`, `subtipoInfo`, `resumoHorarios`, `semAcento`, `slug`, `iniciais`, `novoId`, `corDoIndice` |
| `lib/semente.ts` | novo | `pontoZero()`: organizações, clínicas e usuários de teste |
| `lib/permissoes.ts` | novo | `PAPEIS` e as funções `podeVer`, `podeEditar`, `podeCriarClinica`, `podeCriarUsuario`, `podeVerTelaClinicas` |
| `lib/repositorio.ts` | novo | `carregar`/`gravar` no `localStorage`, leituras, gravações com checagem de permissão, `ErroRepositorio` |
| `lib/logo.ts` | novo | `reduzirImagem(arquivo)` no navegador |
| `lib/dados.check.mjs` | reescrito | Testes de regras, ponto zero, permissões e repositório |
| `lib/store.tsx` | reescrito | Sessão, clínica atual, `executar`, painéis, formulários, avisos |
| `lib/dados.ts` | removido | Substituído pelos novos módulos |
| `components/estrutura.tsx` | reescrito | Casca do app, menu por papel, seletor de clínica |
| `components/formularios.tsx` | reescrito | Formulários na gaveta lateral |
| `components/ui.tsx` | editado | Tipos novos; tira o selo de setor; ganha `LogoMarca` e `EnvioLogo` |
| `components/paineis.tsx` | editado | Permissão de edição; logo do convênio |
| `app/login/page.tsx` | reescrito | Usuários de teste do ponto zero |
| `app/(app)/page.tsx`, `especialidades`, `convenios`, `exames`, `profissionais/[id]` | editados | Imports novos, permissão, textos de vazio, logos |
| `app/(app)/clinicas/page.tsx` | recriado | Organizações e clínicas |
| `app/(app)/usuarios/page.tsx` | recriado | Usuários e "Restaurar demonstração" |
| `tsconfig.json` | editado | `allowImportingTsExtensions` |

---

### Task 1: Modelo, regras e ponto zero

**Files:**
- Create: `lib/modelo.ts`, `lib/regras.ts`, `lib/semente.ts`
- Modify: `tsconfig.json`
- Rewrite: `lib/dados.check.mjs`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `lib/modelo.ts`: tipos `Tipo`, `Papel`, `Horario`, `Restricao`, `Organizacao`, `Clinica`, `Usuario`, `Especialidade`, `Subtipo`, `Convenio`, `Exame`, `Profissional`, `Banco`, `DadosClinica`; constantes `DIAS`, `VERSAO`.
  - `lib/regras.ts`: `atende(p: Profissional, subtipoId: string, tipo: Tipo): boolean`, `subtipoInfo(d: DadosClinica, subtipoId: string): { convenio: Convenio; subtipo: Subtipo } | undefined`, `resumoHorarios(hs: Horario[]): string`, `semAcento(t: string): string`, `slug(t: string): string`, `iniciais(nome: string): string`, `novoId(prefixo: string): string`, `CORES: string[]`, `corDoIndice(n: number): string`.
  - `lib/semente.ts`: `pontoZero(): Banco`.

- [ ] **Step 1: Registrar o estado atual como linha de base**

O código das rodadas anteriores (setores, página do médico) está sem commit. Registre antes de mexer, para os diffs das tarefas seguintes ficarem legíveis.

```bash
git add -A
git status --short   # confira: nenhum .md da raiz, nem .claude/, nem transcricao-audio.txt (estão no .gitignore)
git commit -m "Protótipo com clínicas, setores e página do médico (linha de base)"
```

- [ ] **Step 2: Escrever o teste que vai falhar**

Substitua todo o conteúdo de `lib/dados.check.mjs`:

```js
// Roda com: node lib/dados.check.mjs   (imprime "ok" quando tudo passa)
import assert from "node:assert";
import { atende, corDoIndice, iniciais, novoId, resumoHorarios, slug, subtipoInfo } from "./regras.ts";
import { pontoZero } from "./semente.ts";
import { VERSAO } from "./modelo.ts";

// --- regras ---
const medico = (atendeMapa) => ({
  id: "m", clinicaId: "comn", especialidadeId: "e", nome: "Dra. Teste", horarios: [],
  procedimentos: [], exames: [], atende: atendeMapa, restricoes: [], observacoes: "",
});
// regra da skill modelo-dados-clinica: quem só atende exame não aparece na busca por consulta
assert(!atende(medico({ s1: "e" }), "s1", "consulta"));
assert(atende(medico({ s1: "e" }), "s1", "exame"));
assert(atende(medico({ s1: "ce" }), "s1", "consulta"));
assert(!atende(medico({}), "s1", "exame"));

const dados = {
  especialidades: [], exames: [], profissionais: [],
  convenios: [{ id: "c1", clinicaId: "comn", nome: "Unimed", cor: "#000", subtipos: [{ id: "c1-flex", nome: "Flex" }] }],
};
assert.equal(subtipoInfo(dados, "c1-flex").convenio.nome, "Unimed");
assert.equal(subtipoInfo(dados, "nao-existe"), undefined);

assert.equal(resumoHorarios([]), "Horários não informados");
assert.equal(
  resumoHorarios([{ dia: "Sex", inicio: "08:00", fim: "12:00" }, { dia: "Seg", inicio: "08:00", fim: "12:00" }, { dia: "Ter", inicio: "14:00", fim: "18:00" }]),
  "Seg e Sex · 08:00–12:00  |  Ter · 14:00–18:00",
);
assert.equal(resumoHorarios(["Seg", "Ter", "Qua", "Qui", "Sex"].map((dia) => ({ dia, inicio: "07:00", fim: "13:00" }))), "Seg a Sex · 07:00–13:00");

assert.equal(slug("Clínica São Marcos"), "clinica-sao-marcos");
assert.equal(slug("  Rede fechada! "), "rede-fechada");
assert.equal(iniciais("Dra. Helena Duarte"), "HD");
assert.equal(iniciais("COMN"), "CO");
assert.equal(iniciais("Clínica de Oncologia e Mastologia"), "CO");
assert.equal(iniciais("Promater"), "PR");
assert.notEqual(novoId("conv"), novoId("conv"));
assert(novoId("conv").startsWith("conv-"));
assert.equal(corDoIndice(0), corDoIndice(8));

// --- ponto zero ---
const b = pontoZero();
assert.equal(b.versao, VERSAO);
assert.equal(b.organizacoes.length, 7);
assert.equal(b.clinicas.length, 8);
assert.equal(b.usuarios.length, 7);
assert.deepEqual(
  b.clinicas.filter((c) => c.organizacaoId === "oncologia-mastologia").map((c) => c.nome),
  ["COMN", "ONCY"],
);
for (const c of b.clinicas) assert(b.organizacoes.some((o) => o.id === c.organizacaoId), `${c.id} sem organização`);
for (const u of b.usuarios) for (const id of u.clinicas) assert(b.clinicas.some((c) => c.id === id), `${u.id}: clínica ${id}`);
assert.deepEqual([b.especialidades, b.convenios, b.exames, b.profissionais].map((l) => l.length), [0, 0, 0, 0]);
assert(!JSON.stringify(b).toLowerCase().includes("mountain"));
assert.notEqual(pontoZero(), pontoZero(), "cada chamada devolve um objeto novo");

console.log("ok");
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node lib/dados.check.mjs`
Expected: erro `ERR_MODULE_NOT_FOUND` apontando para `lib/regras.ts`.

- [ ] **Step 4: Permitir imports com extensão `.ts`**

Em `tsconfig.json`, dentro de `"compilerOptions"`, logo depois de `"noEmit": true,`, acrescente:

```json
    "allowImportingTsExtensions": true,
```

- [ ] **Step 5: Criar `lib/modelo.ts`**

```ts
// Tipos do protótipo, um por futura tabela do banco. Ids são texto.

export type Tipo = "consulta" | "exame";
export type Papel = "administrador" | "comercial" | "coordenador" | "recepcao";

export const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
// ponytail: um intervalo por dia; dois turnos separados no mesmo dia viram lista por dia
export type Horario = { dia: string; inicio: string; fim: string };
export type Restricao = { texto: string; subtipoId?: string };

export type Organizacao = { id: string; nome: string };
export type Clinica = { id: string; organizacaoId: string; nome: string; logo?: string };
// clinicas vazio = todas; só vale para Administrador e Comercial
export type Usuario = { id: string; nome: string; email: string; papel: Papel; clinicas: string[] };

export type Especialidade = { id: string; clinicaId: string; nome: string; icone: string };
export type Subtipo = { id: string; nome: string };
export type Convenio = { id: string; clinicaId: string; nome: string; cor: string; logo?: string; subtipos: Subtipo[] };
export type Exame = { id: string; clinicaId: string; nome: string; preparo: string[]; documentos: string; subtipos: string[] };
// `atende` mapeia subtipo → "c" (consulta), "e" (exame) ou "ce" (ambos)
export type Profissional = {
  id: string;
  clinicaId: string;
  especialidadeId: string;
  nome: string;
  horarios: Horario[];
  idadeMinima?: number;
  procedimentos: string[];
  exames: string[];
  atende: Record<string, string>;
  restricoes: Restricao[];
  observacoes: string;
};

// Sobe quando o formato muda; dado guardado com outra versão é descartado
export const VERSAO = 1;
export type Banco = {
  versao: number;
  organizacoes: Organizacao[];
  clinicas: Clinica[];
  usuarios: Usuario[];
  especialidades: Especialidade[];
  convenios: Convenio[];
  exames: Exame[];
  profissionais: Profissional[];
};

// O que as telas de consulta recebem: os dados de uma clínica
export type DadosClinica = Pick<Banco, "especialidades" | "convenios" | "exames" | "profissionais">;
```

- [ ] **Step 6: Criar `lib/regras.ts`**

```ts
import { DIAS, type DadosClinica, type Horario, type Profissional, type Tipo } from "./modelo.ts";

// A pergunta mais comum da central: "quem atende o convênio X para Y?"
export function atende(p: Profissional, subtipoId: string, tipo: Tipo) {
  return (p.atende[subtipoId] ?? "").includes(tipo === "consulta" ? "c" : "e");
}

export function subtipoInfo(d: DadosClinica, subtipoId: string) {
  for (const convenio of d.convenios) {
    const subtipo = convenio.subtipos.find((s) => s.id === subtipoId);
    if (subtipo) return { convenio, subtipo };
  }
}

// "Seg, Qua e Sex · 08:00–12:00"; dias seguidos viram "Seg a Sex"
export function resumoHorarios(hs: Horario[]) {
  if (!hs.length) return "Horários não informados";
  const pos = (d: string) => DIAS.indexOf(d as (typeof DIAS)[number]);
  const grupos = new Map<string, string[]>();
  for (const x of [...hs].sort((a, b) => pos(a.dia) - pos(b.dia))) {
    const k = `${x.inicio}–${x.fim}`;
    grupos.set(k, [...(grupos.get(k) ?? []), x.dia]);
  }
  const seguidos = (d: string[]) => d.length >= 3 && pos(d[d.length - 1]) - pos(d[0]) === d.length - 1;
  const lista = (d: string[]) =>
    seguidos(d) ? `${d[0]} a ${d[d.length - 1]}` : d.length > 1 ? `${d.slice(0, -1).join(", ")} e ${d[d.length - 1]}` : d[0];
  return [...grupos].map(([faixa, d]) => `${lista(d)} · ${faixa}`).join("  |  ");
}

export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const slug = (t: string) => semAcento(t).trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const LIGACOES = /^(de|da|do|das|dos|e)$/i;
// "Dra. Helena Duarte" → "HD"; "COMN" → "CO"; "Clínica de Oncologia" → "CO"
export function iniciais(nome: string) {
  const partes = nome.replace(/^Dr[a]?\.\s*/, "").split(/\s+/).filter((p) => p && !LIGACOES.test(p));
  if (!partes.length) return "?";
  return (partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[1][0]).toUpperCase();
}

export const novoId = (prefixo: string) =>
  `${prefixo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Cor automática de convênio novo (fallback quando não há logo)
export const CORES = ["#0d9b86", "#2d6be0", "#d1344b", "#ea7a1a", "#7c3aed", "#0891b2", "#ca8a04", "#db2777"];
export const corDoIndice = (n: number) => CORES[n % CORES.length];
```

- [ ] **Step 7: Criar `lib/semente.ts`**

```ts
import { VERSAO, type Banco, type Organizacao, type Usuario } from "./modelo.ts";

// Ponto zero da demonstração: organizações, clínicas e usuários de teste. O resto começa vazio.
const ESTRUTURA: { org: Organizacao; clinicas: [id: string, nome: string][] }[] = [
  { org: { id: "oncologia-mastologia", nome: "Clínica de Oncologia e Mastologia" }, clinicas: [["comn", "COMN"], ["oncy", "ONCY"]] },
  { org: { id: "promater", nome: "Promater" }, clinicas: [["promater", "Promater"]] },
  { org: { id: "nossa-clinica", nome: "Nossa Clínica" }, clinicas: [["nossa-clinica", "Nossa Clínica"]] },
  { org: { id: "oncology-group-mossoro", nome: "Oncology Group - Mossoró" }, clinicas: [["oncology-group-mossoro", "Oncology Group - Mossoró"]] },
  { org: { id: "oncoclinicas", nome: "Oncoclínicas" }, clinicas: [["oncoclinicas", "Oncoclínicas"]] },
  { org: { id: "oncoclinicas-mossoro", nome: "Oncoclínicas Mossoró" }, clinicas: [["oncoclinicas-mossoro", "Oncoclínicas Mossoró"]] },
  { org: { id: "sao-marcos", nome: "Clínica São Marcos" }, clinicas: [["sao-marcos", "Clínica São Marcos"]] },
];

const USUARIOS: Usuario[] = [
  { id: "administrador", nome: "Administrador", email: "administrador@exemplo.com.br", papel: "administrador", clinicas: [] },
  { id: "comercial", nome: "Comercial", email: "comercial@exemplo.com.br", papel: "comercial", clinicas: [] },
  { id: "coordenador-comn", nome: "Coordenador COMN", email: "coordenacao.comn@exemplo.com.br", papel: "coordenador", clinicas: ["comn"] },
  { id: "central-comn", nome: "Central de atendimento COMN", email: "central.comn@exemplo.com.br", papel: "recepcao", clinicas: ["comn"] },
  { id: "recepcao-comn", nome: "Recepção COMN", email: "recepcao.comn@exemplo.com.br", papel: "recepcao", clinicas: ["comn"] },
  { id: "recepcao-oncy", nome: "Recepção ONCY", email: "recepcao.oncy@exemplo.com.br", papel: "recepcao", clinicas: ["oncy"] },
  { id: "usuario-promater", nome: "Usuário Promater", email: "usuario@promater.exemplo.com.br", papel: "recepcao", clinicas: ["promater"] },
];

export function pontoZero(): Banco {
  return {
    versao: VERSAO,
    organizacoes: ESTRUTURA.map((e) => ({ ...e.org })),
    clinicas: ESTRUTURA.flatMap((e) => e.clinicas.map(([id, nome]) => ({ id, organizacaoId: e.org.id, nome }))),
    usuarios: USUARIOS.map((u) => ({ ...u, clinicas: [...u.clinicas] })),
    especialidades: [],
    convenios: [],
    exames: [],
    profissionais: [],
  };
}
```

- [ ] **Step 8: Rodar o teste**

Run: `node lib/dados.check.mjs`
Expected: `ok` (pode vir antes um aviso `MODULE_TYPELESS_PACKAGE_JSON`; é só aviso).

- [ ] **Step 9: Conferir tipos e build**

Run: `npx tsc --noEmit` → sem saída.
Run: `npm run build` → termina com a tabela de rotas, sem erro. (O app ainda usa `lib/dados.ts`; os módulos novos só existem ao lado.)

- [ ] **Step 10: Commit**

```bash
git add tsconfig.json lib/modelo.ts lib/regras.ts lib/semente.ts lib/dados.check.mjs
git commit -m "Modelo em tabelas, regras puras e ponto zero da demonstração"
```

---

### Task 2: Permissões e repositório

**Files:**
- Create: `lib/permissoes.ts`, `lib/repositorio.ts`
- Modify: `lib/dados.check.mjs`

**Interfaces:**
- Consumes: tipos de `lib/modelo.ts`, `pontoZero()` de `lib/semente.ts`.
- Produces:
  - `lib/permissoes.ts`: `PAPEIS: Record<Papel, { rotulo: string; descricao: string }>`, `podeVer(u: Usuario, clinicaId: string): boolean`, `podeEditar(u: Usuario, clinicaId: string): boolean`, `podeCriarClinica(u: Usuario): boolean`, `podeCriarUsuario(u: Usuario): boolean`, `podeVerTelaClinicas(u: Usuario): boolean`.
  - `lib/repositorio.ts`: `CHAVE = "cartilha:v1"`, `class ErroRepositorio extends Error`, `carregar(): Banco`, `gravar(b: Banco): boolean`, `clinicasDo(b: Banco, u: Usuario): Clinica[]`, `dadosDaClinica(b: Banco, clinicaId: string): DadosClinica`, e as gravações `(b: Banco, u: Usuario, item) => Banco`: `salvarProfissional`, `salvarExame`, `salvarConvenio`, `salvarEspecialidade`, `salvarClinica`, `salvarOrganizacao`, `salvarUsuario`, além de `restaurarDemonstracao(b: Banco, u: Usuario): Banco`. Toda gravação recusada lança `ErroRepositorio` com mensagem em português.

- [ ] **Step 1: Escrever os testes que vão falhar**

Em `lib/dados.check.mjs`, acrescente aos imports do topo:

```js
import { podeCriarClinica, podeCriarUsuario, podeEditar, podeVer, podeVerTelaClinicas } from "./permissoes.ts";
import {
  ErroRepositorio, clinicasDo, dadosDaClinica, restaurarDemonstracao, salvarClinica, salvarConvenio,
  salvarEspecialidade, salvarExame, salvarOrganizacao, salvarProfissional, salvarUsuario,
} from "./repositorio.ts";
```

E, logo **antes** da linha final `console.log("ok");`, acrescente:

```js
// --- permissões ---
const b0 = pontoZero();
const quem = (id) => b0.usuarios.find((u) => u.id === id);
const adm = quem("administrador"), com = quem("comercial"), coord = quem("coordenador-comn");
const recComn = quem("recepcao-comn"), recOncy = quem("recepcao-oncy");

assert(podeVer(recOncy, "oncy") && !podeVer(recOncy, "comn"), "Recepção ONCY não vê a COMN");
assert(podeVer(recComn, "comn") && !podeVer(recComn, "oncy"), "Recepção COMN não vê a ONCY");
assert.deepEqual(clinicasDo(b0, recOncy).map((c) => c.id), ["oncy"]);
assert.equal(clinicasDo(b0, com).length, 8);
assert(podeEditar(coord, "comn") && !podeEditar(coord, "oncy"), "Coordenador COMN edita só a COMN");
assert(podeEditar(com, "oncy") && podeCriarClinica(com) && !podeCriarUsuario(com), "Comercial edita tudo e não cria usuário");
assert(!podeEditar(recComn, "comn"), "Recepção não edita");
assert(podeCriarUsuario(adm) && !podeCriarClinica(coord));
assert(podeVerTelaClinicas(coord) && !podeVerTelaClinicas(recComn));

// --- repositório ---
const ficha = (clinicaId, extra = {}) => ({ ...medico({}), id: "m1", clinicaId, ...extra });
const b1 = salvarProfissional(b0, coord, ficha("comn"));
assert.equal(dadosDaClinica(b1, "comn").profissionais.length, 1);
assert.equal(dadosDaClinica(b1, "oncy").profissionais.length, 0);
assert.equal(b0.profissionais.length, 0, "gravar não altera o banco anterior");
assert.throws(() => salvarProfissional(b0, coord, ficha("oncy")), ErroRepositorio);
assert.throws(() => salvarProfissional(b0, recComn, ficha("comn")), ErroRepositorio, "Recepção não grava nada");
// não dá para puxar um médico de clínica proibida trocando o clinicaId
const b2 = salvarProfissional(b0, com, ficha("oncy"));
assert.throws(() => salvarProfissional(b2, coord, ficha("comn")), ErroRepositorio);
// editar substitui, não duplica
const b3 = salvarProfissional(b1, coord, ficha("comn", { nome: "Dra. Outra" }));
assert.deepEqual(dadosDaClinica(b3, "comn").profissionais.map((p) => p.nome), ["Dra. Outra"]);

const conv = (id, clinicaId) => ({ id, clinicaId, nome: "Unimed", cor: "#000", subtipos: [] });
const b4 = salvarConvenio(salvarConvenio(b0, com, conv("c1", "comn")), com, conv("c2", "oncy"));
assert.equal(dadosDaClinica(b4, "comn").convenios.length, 1, "mesmo nome em clínicas diferentes não se mistura");
assert.throws(() => salvarConvenio(b0, recOncy, conv("c3", "oncy")), ErroRepositorio);
assert.equal(salvarExame(b0, coord, { id: "x1", clinicaId: "comn", nome: "ECG", preparo: [], documentos: "", subtipos: [] }).exames.length, 1);
assert.throws(() => salvarEspecialidade(b0, coord, { id: "e1", clinicaId: "oncy", nome: "Cardio", icone: "Stethoscope" }), ErroRepositorio);

// clínicas e organizações
const nova = { id: "nova", organizacaoId: "promater", nome: "Nova" };
assert.throws(() => salvarClinica(b0, coord, nova), ErroRepositorio, "Coordenador não cria clínica");
assert.equal(salvarClinica(b0, com, nova).clinicas.length, 9);
assert.throws(() => salvarClinica(b0, com, { ...nova, organizacaoId: "nao-existe" }), ErroRepositorio);
const comn = b0.clinicas.find((c) => c.id === "comn");
assert.equal(salvarClinica(b0, coord, { ...comn, logo: "data:image/png;base64,AA" }).clinicas.find((c) => c.id === "comn").logo, "data:image/png;base64,AA");
assert.throws(() => salvarClinica(b0, coord, { ...b0.clinicas.find((c) => c.id === "oncy"), nome: "X" }), ErroRepositorio);
assert.throws(() => salvarOrganizacao(b0, coord, { id: "o", nome: "O" }), ErroRepositorio);
assert.equal(salvarOrganizacao(b0, com, { id: "o", nome: "O" }).organizacoes.length, 8);

// usuários
const novoUsuario = { id: "n1", nome: "Recepção nova", email: "n@exemplo.com.br", papel: "recepcao", clinicas: ["comn", "oncy"] };
assert.equal(salvarUsuario(b0, adm, novoUsuario).usuarios.length, 8);
assert.throws(() => salvarUsuario(b0, com, novoUsuario), ErroRepositorio, "Comercial não cria usuário");
assert.throws(() => salvarUsuario(b0, adm, { ...novoUsuario, clinicas: [] }), ErroRepositorio, "Recepção precisa de clínica");
assert.deepEqual(salvarUsuario(b0, adm, { ...novoUsuario, papel: "comercial" }).usuarios.at(-1).clinicas, [], "Comercial vale para todas");

// restaurar
assert.deepEqual(restaurarDemonstracao(b3, adm), pontoZero());
assert.throws(() => restaurarDemonstracao(b3, com), ErroRepositorio);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node lib/dados.check.mjs`
Expected: `ERR_MODULE_NOT_FOUND` apontando para `lib/permissoes.ts`.

- [ ] **Step 3: Criar `lib/permissoes.ts`**

```ts
import type { Papel, Usuario } from "./modelo.ts";

export const PAPEIS: Record<Papel, { rotulo: string; descricao: string }> = {
  administrador: { rotulo: "Administrador", descricao: "Vê e edita todas as clínicas e cria usuários." },
  comercial: { rotulo: "Comercial", descricao: "Vê e edita todas as clínicas; não cria usuários." },
  coordenador: { rotulo: "Coordenador", descricao: "Edita só as clínicas vinculadas." },
  recepcao: { rotulo: "Recepção/Central", descricao: "Só consulta as clínicas vinculadas." },
};

// Administrador e Comercial enxergam todas as clínicas
const global = (u: Usuario) => u.papel === "administrador" || u.papel === "comercial";

export const podeVer = (u: Usuario, clinicaId: string) => global(u) || u.clinicas.includes(clinicaId);
export const podeEditar = (u: Usuario, clinicaId: string) =>
  global(u) || (u.papel === "coordenador" && u.clinicas.includes(clinicaId));
export const podeCriarClinica = (u: Usuario) => global(u);
export const podeCriarUsuario = (u: Usuario) => u.papel === "administrador";
export const podeVerTelaClinicas = (u: Usuario) => u.papel !== "recepcao";
```

- [ ] **Step 4: Criar `lib/repositorio.ts`**

```ts
// Única porta de leitura e gravação dos dados. Hoje guarda um JSON no navegador;
// na v1 estas mesmas funções passam a chamar o servidor, e as checagens de permissão vão junto.
import { VERSAO, type Banco, type Clinica, type Convenio, type DadosClinica, type Especialidade, type Exame, type Organizacao, type Profissional, type Usuario } from "./modelo.ts";
import { podeCriarClinica, podeCriarUsuario, podeEditar, podeVer } from "./permissoes.ts";
import { pontoZero } from "./semente.ts";

export const CHAVE = "cartilha:v1";

export class ErroRepositorio extends Error {}

const SEM_PERMISSAO = "Seu usuário não pode editar esta clínica.";

function exigir(ok: boolean, mensagem: string) {
  if (!ok) throw new ErroRepositorio(mensagem);
}

function gravarEm<T extends { id: string }>(lista: T[], item: T): T[] {
  return lista.some((x) => x.id === item.id) ? lista.map((x) => (x.id === item.id ? item : x)) : [...lista, item];
}

// Confere a clínica nova e, se o item já existia, também a antiga (não dá para "puxar" item de outra clínica)
function conferirClinica(u: Usuario, item: { clinicaId: string }, antes?: { clinicaId: string }) {
  exigir(podeEditar(u, item.clinicaId) && (!antes || podeEditar(u, antes.clinicaId)), SEM_PERMISSAO);
}

// --- armazenamento ---

export function carregar(): Banco {
  try {
    const b = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (b && b.versao === VERSAO) return b as Banco;
  } catch {
    // navegador bloqueando o armazenamento ou JSON corrompido: recomeça do ponto zero
  }
  return pontoZero();
}

export function gravar(b: Banco): boolean {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(b));
    return true;
  } catch {
    return false;
  }
}

// --- leitura ---

export const clinicasDo = (b: Banco, u: Usuario): Clinica[] => b.clinicas.filter((c) => podeVer(u, c.id));

export const dadosDaClinica = (b: Banco, clinicaId: string): DadosClinica => ({
  especialidades: b.especialidades.filter((x) => x.clinicaId === clinicaId),
  convenios: b.convenios.filter((x) => x.clinicaId === clinicaId),
  exames: b.exames.filter((x) => x.clinicaId === clinicaId),
  profissionais: b.profissionais.filter((x) => x.clinicaId === clinicaId),
});

// --- gravação: sempre confere a permissão antes ---

export function salvarProfissional(b: Banco, u: Usuario, p: Profissional): Banco {
  conferirClinica(u, p, b.profissionais.find((x) => x.id === p.id));
  return { ...b, profissionais: gravarEm(b.profissionais, p) };
}

export function salvarExame(b: Banco, u: Usuario, e: Exame): Banco {
  conferirClinica(u, e, b.exames.find((x) => x.id === e.id));
  return { ...b, exames: gravarEm(b.exames, e) };
}

export function salvarConvenio(b: Banco, u: Usuario, c: Convenio): Banco {
  conferirClinica(u, c, b.convenios.find((x) => x.id === c.id));
  return { ...b, convenios: gravarEm(b.convenios, c) };
}

export function salvarEspecialidade(b: Banco, u: Usuario, e: Especialidade): Banco {
  conferirClinica(u, e, b.especialidades.find((x) => x.id === e.id));
  return { ...b, especialidades: gravarEm(b.especialidades, e) };
}

export function salvarClinica(b: Banco, u: Usuario, c: Clinica): Banco {
  const existe = b.clinicas.some((x) => x.id === c.id);
  exigir(existe ? podeEditar(u, c.id) : podeCriarClinica(u), existe ? SEM_PERMISSAO : "Só Administrador e Comercial criam clínicas.");
  exigir(b.organizacoes.some((o) => o.id === c.organizacaoId), "Escolha uma organização válida.");
  return { ...b, clinicas: gravarEm(b.clinicas, c) };
}

export function salvarOrganizacao(b: Banco, u: Usuario, o: Organizacao): Banco {
  exigir(podeCriarClinica(u), "Só Administrador e Comercial criam organizações.");
  return { ...b, organizacoes: gravarEm(b.organizacoes, o) };
}

export function salvarUsuario(b: Banco, u: Usuario, novo: Usuario): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador cria usuários.");
  const todas = novo.papel === "administrador" || novo.papel === "comercial";
  exigir(todas || novo.clinicas.length > 0, "Vincule pelo menos uma clínica.");
  return { ...b, usuarios: gravarEm(b.usuarios, todas ? { ...novo, clinicas: [] } : novo) };
}

export function restaurarDemonstracao(_b: Banco, u: Usuario): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador restaura a demonstração.");
  return pontoZero();
}
```

- [ ] **Step 5: Rodar o teste**

Run: `node lib/dados.check.mjs`
Expected: `ok`.

- [ ] **Step 6: Conferir tipos**

Run: `npx tsc --noEmit`
Expected: sem saída.

- [ ] **Step 7: Commit**

```bash
git add lib/permissoes.ts lib/repositorio.ts lib/dados.check.mjs
git commit -m "Permissões dos quatro papéis e repositório com gravação conferida"
```

---

### Task 3: Ligar as telas ao repositório

Troca o `store` e a casca do app para o modelo novo, adapta as telas existentes e remove setores, clínicas de exemplo e `lib/dados.ts`. As telas Clínicas e Usuários saem nesta tarefa e voltam reescritas nas Tasks 5 e 6.

**Files:**
- Rewrite: `lib/store.tsx`, `components/estrutura.tsx`, `components/formularios.tsx`, `app/login/page.tsx`
- Modify: `components/ui.tsx`, `components/paineis.tsx`, `app/(app)/page.tsx`, `app/(app)/especialidades/page.tsx`, `app/(app)/convenios/page.tsx`, `app/(app)/exames/page.tsx`, `app/(app)/profissionais/[id]/page.tsx`
- Delete: `lib/dados.ts`, `app/(app)/clinicas/page.tsx`, `app/(app)/usuarios/page.tsx`

**Interfaces:**
- Consumes: tudo de `lib/modelo.ts`, `lib/regras.ts`, `lib/permissoes.ts`, `lib/repositorio.ts`, `lib/semente.ts`.
- Produces (`lib/store.tsx`, via `useStore()`):
  - `banco: Banco`, `usuario: Usuario | null`, `carregado: boolean`
  - `clinicas: Clinica[]` (as que o usuário pode ver), `clinica: Clinica | null` (atual), `dados: DadosClinica` (da clínica atual), `podeEditarAtual: boolean`
  - `escolherClinica(id: string): void`, `entrar(usuarioId: string): void`, `sair(): void`
  - `executar(op: (b: Banco, u: Usuario) => Banco, sucesso: string): boolean`: aplica uma gravação do repositório; mostra `sucesso` ou a mensagem do erro; devolve se deu certo
  - `painel`, `abrir`, `form`, `abrirForm`, `aviso`, `avisar` (como hoje)
  - tipo `Formulario` com: `profissional (id?)`, `especialidade`, `convenio (id?)`, `exame (id?)`, `organizacao`, `clinica (id?)`, `usuario`
- Produces (`components/formularios.tsx`): `EditorHorarios({ valor })`, `lerHorarios(f: FormData): Horario[]`, `Campo`, `Moldura`, `campo` (classe CSS), exportados para as Tasks 4 a 6.

- [ ] **Step 1: Reescrever `lib/store.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Banco, Clinica, DadosClinica, Usuario } from "./modelo";
import { podeEditar } from "./permissoes";
import { carregar, clinicasDo, dadosDaClinica, gravar } from "./repositorio";
import { pontoZero } from "./semente";

export type Painel = { tipo: "exame"; id: string } | null;
export type Formulario =
  | { tipo: "profissional"; id?: string }
  | { tipo: "especialidade" }
  | { tipo: "convenio"; id?: string }
  | { tipo: "exame"; id?: string }
  | { tipo: "organizacao" }
  | { tipo: "clinica"; id?: string }
  | { tipo: "usuario" }
  | null;

type Store = {
  banco: Banco;
  usuario: Usuario | null;
  carregado: boolean;
  // clínicas que o usuário pode ver e a atual
  clinicas: Clinica[];
  clinica: Clinica | null;
  // dados da clínica atual, no formato que as telas de consulta usam
  dados: DadosClinica;
  podeEditarAtual: boolean;
  escolherClinica: (id: string) => void;
  entrar: (usuarioId: string) => void;
  sair: () => void;
  // aplica uma gravação do repositório; mostra o aviso de sucesso ou a mensagem de recusa
  executar: (op: (b: Banco, u: Usuario) => Banco, sucesso: string) => boolean;
  painel: Painel;
  abrir: (p: Painel) => void;
  form: Formulario;
  abrirForm: (f: Formulario) => void;
  aviso: string | null;
  avisar: (t: string) => void;
};

const Ctx = createContext<Store | null>(null);

const SESSAO_USUARIO = "cartilha:usuario";
const SESSAO_CLINICA = "cartilha:clinica";
const lerLocal = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLocal = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {}
};
const VAZIO: DadosClinica = { especialidades: [], convenios: [], exames: [], profissionais: [] };

export function Provider({ children }: { children: React.ReactNode }) {
  const [banco, setBanco] = useState<Banco>(pontoZero);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [clinicaId, setClinicaId] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [painel, abrir] = useState<Painel>(null);
  const [form, abrirForm] = useState<Formulario>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const avisouFalha = useRef(false);

  const avisar = useCallback((t: string) => {
    setAviso(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(null), 2800);
  }, []);

  // ponytail: sessão no navegador só para o protótipo; na v1 vira login de verdade no servidor
  useEffect(() => {
    setBanco(carregar());
    setUsuarioId(lerLocal(SESSAO_USUARIO));
    setClinicaId(lerLocal(SESSAO_CLINICA));
    setCarregado(true);
  }, []);

  // toda mudança vai para o navegador; se não couber, o app segue em memória e avisa uma vez
  useEffect(() => {
    if (!carregado) return;
    if (!gravar(banco) && !avisouFalha.current) {
      avisouFalha.current = true;
      avisar("Não foi possível salvar neste navegador. As mudanças valem só até fechar a página.");
    }
  }, [banco, carregado, avisar]);

  const usuario = banco.usuarios.find((u) => u.id === usuarioId) ?? null;
  const clinicas = usuario ? clinicasDo(banco, usuario) : [];
  // clínica guardada que deixou de ser permitida cai na primeira permitida
  const clinica = clinicas.find((c) => c.id === clinicaId) ?? clinicas[0] ?? null;

  const escolherClinica = (id: string) => {
    setClinicaId(id);
    gravarLocal(SESSAO_CLINICA, id);
    abrir(null);
  };
  const entrar = (id: string) => {
    setUsuarioId(id);
    gravarLocal(SESSAO_USUARIO, id);
    setClinicaId(null);
    gravarLocal(SESSAO_CLINICA, null);
  };
  const sair = () => {
    setUsuarioId(null);
    gravarLocal(SESSAO_USUARIO, null);
    abrir(null);
    abrirForm(null);
  };
  const executar = (op: (b: Banco, u: Usuario) => Banco, sucesso: string) => {
    if (!usuario) return false;
    try {
      setBanco(op(banco, usuario));
      avisar(sucesso);
      return true;
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível salvar.");
      return false;
    }
  };

  return (
    <Ctx.Provider value={{
      banco, usuario, carregado, clinicas, clinica,
      dados: clinica ? dadosDaClinica(banco, clinica.id) : VAZIO,
      podeEditarAtual: !!usuario && !!clinica && podeEditar(usuario, clinica.id),
      escolherClinica, entrar, sair, executar, painel, abrir, form, abrirForm, aviso, avisar,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore fora do Provider");
  return s;
}
```

- [ ] **Step 2: Reescrever `components/estrutura.tsx`**

O seletor de clínica abre uma lista agrupada por organização quando o usuário tem mais de uma clínica; com uma só, mostra cadeado. Os itens "Clínicas" e "Usuários" entram no `menu` nas Tasks 5 e 6.

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Building2, Check, CheckCircle2, ChevronsUpDown, FlaskConical, LayoutGrid, Lock, LogOut, Search, ShieldCheck } from "lucide-react";
import type { Usuario } from "@/lib/modelo";
import { PAPEIS } from "@/lib/permissoes";
import { useStore } from "@/lib/store";
import { Logo, Vazio } from "@/components/ui";
import { Paineis } from "@/components/paineis";
import { Formularios } from "@/components/formularios";

type ItemMenu = { href: string; rotulo: string; icone: typeof Search; mostrar?: (u: Usuario) => boolean };
const menu: ItemMenu[] = [
  { href: "/", rotulo: "Busca rápida", icone: Search },
  { href: "/especialidades", rotulo: "Especialidades", icone: LayoutGrid },
  { href: "/convenios", rotulo: "Convênios", icone: ShieldCheck },
  { href: "/exames", rotulo: "Exames", icone: FlaskConical },
];

export function Estrutura({ children }: { children: React.ReactNode }) {
  const { usuario, carregado, sair, aviso, clinica } = useStore();
  const router = useRouter();
  const rota = usePathname();

  useEffect(() => {
    if (carregado && !usuario) router.replace("/login");
  }, [carregado, usuario, router]);

  const itens = menu.filter((m) => !m.mostrar || (usuario && m.mostrar(usuario)));
  const ativo = itens.findIndex((m) => (m.href === "/" ? rota === "/" : rota.startsWith(m.href)));
  const deslogar = () => { sair(); router.replace("/login"); };

  return (
    // renderiza sempre (o Next 16 valida a página no servidor) e só mostra depois de ler a sessão
    <div className={`min-h-screen lg:pl-72 ${usuario ? "" : "invisible"}`}>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-borda bg-superficie/80 p-5 backdrop-blur lg:flex">
        <Logo />
        <div className="mt-8"><SeletorClinica /></div>
        <nav className="relative mt-6 space-y-1">
          {ativo >= 0 && (
            <span className="absolute inset-x-0 top-0 h-11 rounded-xl bg-verde-claro transition-transform duration-300 ease-saida"
              style={{ transform: `translateY(calc(${ativo} * (2.75rem + 0.25rem)))` }} />
          )}
          {itens.map((m, i) => (
            <Link key={m.href} href={m.href}
              className={`pressionavel relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold ${i === ativo ? "text-verde" : "text-suave hover:text-texto"}`}>
              <m.icone className="size-5" />{m.rotulo}
            </Link>
          ))}
        </nav>
        {usuario && (
          <div className="mt-auto rounded-2xl border border-borda bg-fundo p-4">
            <div className="flex items-center gap-2">
              <span className="pulso size-2 rounded-full bg-verde" />
              <p className="truncate text-sm font-semibold">{usuario.nome}</p>
            </div>
            <p className="mt-1 text-xs text-suave">{PAPEIS[usuario.papel].rotulo}: {PAPEIS[usuario.papel].descricao}</p>
            <button onClick={deslogar} className="pressionavel mt-3 flex items-center gap-2 text-sm font-semibold text-suave hover:text-texto">
              <LogOut className="size-4" />Sair
            </button>
          </div>
        )}
      </aside>

      {/* Celular e tablet */}
      <header className="sticky top-0 z-30 border-b border-borda bg-superficie/85 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <Logo />
          <div className="ml-auto min-w-0 max-w-[55%]"><SeletorClinica compacto /></div>
          <button onClick={deslogar} aria-label="Sair" className="pressionavel grid size-10 shrink-0 place-items-center rounded-xl text-suave hover:bg-fundo">
            <LogOut className="size-5" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {itens.map((m, i) => (
            <Link key={m.href} href={m.href}
              className={`pressionavel flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${i === ativo ? "bg-verde-claro text-verde" : "text-suave"}`}>
              <m.icone className="size-4" />{m.rotulo}
            </Link>
          ))}
        </nav>
      </header>

      <main key={`${rota}-${clinica?.id}`} className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
        {clinica ? children : <Vazio texto="Seu usuário não tem nenhuma clínica vinculada. Fale com o Administrador." />}
      </main>

      <Paineis />
      <Formularios />

      {aviso && (
        <div key={aviso} role="status" className="aviso fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-texto px-4 py-3 text-sm font-medium text-white shadow-elevado">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />{aviso}
        </div>
      )}
    </div>
  );
}

function SeletorClinica({ compacto = false }: { compacto?: boolean }) {
  const { banco, clinicas, clinica, escolherClinica } = useStore();
  const router = useRouter();
  const rota = usePathname();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  if (!clinica) return null;
  const varias = clinicas.length > 1;
  const org = banco.organizacoes.find((o) => o.id === clinica.organizacaoId);
  const escolher = (id: string) => {
    setAberto(false);
    escolherClinica(id);
    // a página de um médico não existe na outra clínica
    if (rota.startsWith("/profissionais/")) router.push("/");
  };

  return (
    <div ref={caixa} className="relative">
      <button type="button" disabled={!varias} onClick={() => setAberto(!aberto)} aria-expanded={aberto}
        className={`flex w-full items-center gap-3 rounded-2xl border border-borda bg-fundo text-left ${compacto ? "px-2.5 py-2" : "p-3"} ${varias ? "pressionavel hover:border-verde/40" : ""}`}>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-superficie text-verde shadow-card"><Building2 className="size-4" /></span>
        <span className="min-w-0 flex-1">
          {!compacto && <span className="block truncate text-[11px] font-semibold uppercase tracking-wider text-suave">{org?.nome ?? "Clínica"}</span>}
          <span key={clinica.id} className="entrar block truncate text-sm font-semibold">{clinica.nome}</span>
        </span>
        {varias
          ? <ChevronsUpDown className="size-4 shrink-0 text-suave" />
          : <Lock className="size-4 shrink-0 text-suave/60" aria-label="Única clínica do seu usuário" />}
      </button>
      {aberto && (
        <div className={`entrar absolute top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-borda bg-superficie p-2 shadow-elevado ${compacto ? "right-0 w-72" : "inset-x-0"}`}>
          {banco.organizacoes.map((o) => {
            const daOrg = clinicas.filter((c) => c.organizacaoId === o.id);
            return daOrg.length > 0 && (
              <div key={o.id} className="py-1">
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-suave">{o.nome}</p>
                {daOrg.map((c) => (
                  <button key={c.id} type="button" onClick={() => escolher(c.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-fundo">
                    <span className="truncate">{c.nome}</span>
                    {c.id === clinica.id && <Check className="size-4 shrink-0 text-verde" />}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Reescrever `components/formularios.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore, type Formulario } from "@/lib/store";
import { DIAS, type Convenio, type DadosClinica, type Exame, type Horario, type Profissional } from "@/lib/modelo";
import { corDoIndice, novoId, slug } from "@/lib/regras";
import { salvarConvenio, salvarEspecialidade, salvarExame, salvarProfissional } from "@/lib/repositorio";
import { Botao, Gaveta } from "./ui";

export const campo = "w-full rounded-xl border border-borda bg-superficie px-3 py-2.5 text-[15px] outline-none transition placeholder:text-suave/60 focus:border-verde focus:ring-4 focus:ring-verde/15";
const linhas = (t: FormDataEntryValue | null) => String(t ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

export function Campo({ rotulo, children, dica }: { rotulo: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-suave">{dica}</span>}
    </label>
  );
}

// Dias e horários: um intervalo por dia, com campos nativos de hora
export function EditorHorarios({ valor }: { valor: Horario[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-borda">
      {DIAS.map((dia, k) => {
        const h = valor.find((x) => x.dia === dia);
        return (
          <label key={dia} className={`group flex items-center gap-3 px-4 py-2 has-[:checked]:bg-verde-claro/40 ${k ? "border-t border-borda" : ""}`}>
            <input type="checkbox" name={`h:${dia}`} defaultChecked={!!h} className="peer size-5 accent-verde" />
            <span className="w-10 font-semibold">{dia}</span>
            <span className="flex items-center gap-2 opacity-40 transition-opacity peer-checked:opacity-100">
              <input type="time" name={`h:${dia}:inicio`} defaultValue={h?.inicio ?? "08:00"} className="rounded-lg border border-borda bg-superficie px-2 py-1 text-sm" />
              <span className="text-suave">até</span>
              <input type="time" name={`h:${dia}:fim`} defaultValue={h?.fim ?? "12:00"} className="rounded-lg border border-borda bg-superficie px-2 py-1 text-sm" />
            </span>
          </label>
        );
      })}
    </div>
  );
}

export const lerHorarios = (f: FormData): Horario[] =>
  DIAS.filter((d) => f.get(`h:${d}`)).map((dia) => ({ dia, inicio: String(f.get(`h:${dia}:inicio`)), fim: String(f.get(`h:${dia}:fim`)) }));

export function Formularios() {
  const { form, abrirForm } = useStore();
  // guarda o último formulário para a gaveta sair com conteúdo; `n` zera os campos a cada abertura
  const [ultimo, setUltimo] = useState<{ f: Formulario; n: number }>({ f: null, n: 0 });
  if (form && form !== ultimo.f) setUltimo({ f: form, n: ultimo.n + 1 });
  const atual = form ?? ultimo.f;
  const k = ultimo.n;

  return (
    <Gaveta aberta={!!form} onFechar={() => abrirForm(null)} largura="max-w-2xl">
      {atual?.tipo === "profissional" && <FormProfissional key={k} id={atual.id} />}
      {atual?.tipo === "especialidade" && <FormEspecialidade key={k} />}
      {atual?.tipo === "convenio" && <FormConvenio key={k} id={atual.id} />}
      {atual?.tipo === "exame" && <FormExame key={k} id={atual.id} />}
    </Gaveta>
  );
}

export function Moldura({ titulo, descricao, onSalvar, children }: { titulo: string; descricao: string; onSalvar: (f: FormData) => void; children: React.ReactNode }) {
  const { abrirForm } = useStore();
  return (
    <form className="flex min-h-full flex-col" onSubmit={(e) => { e.preventDefault(); onSalvar(new FormData(e.currentTarget)); }}>
      <div className="entrar border-b border-borda p-6 pr-14 sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight">{titulo}</h2>
        <p className="mt-1 text-suave">{descricao}</p>
      </div>
      <div className="flex-1 space-y-6 p-6 sm:p-8">{children}</div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-borda bg-superficie/90 p-4 backdrop-blur">
        <Botao variante="secundario" onClick={() => abrirForm(null)}>Cancelar</Botao>
        <Botao type="submit">Salvar</Botao>
      </div>
    </form>
  );
}

function MatrizConvenios({ dados, atende }: { dados: DadosClinica; atende: Record<string, string> }) {
  if (!dados.convenios.length) return <p className="rounded-xl border border-dashed border-borda px-4 py-4 text-sm text-suave">Nenhum convênio cadastrado nesta clínica ainda.</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-borda">
      <div className="grid grid-cols-[1fr_80px_80px] bg-fundo px-4 py-2 text-xs font-semibold text-suave">
        <span>Convênio · rede</span><span className="text-center">Consulta</span><span className="text-center">Exame</span>
      </div>
      {dados.convenios.map((c) => c.subtipos.map((s, k) => (
        <div key={s.id} className={`grid grid-cols-[1fr_80px_80px] items-center px-4 py-2 ${k ? "" : "border-t border-borda"}`}>
          <span className="text-[15px]">{!k && <b className="font-semibold">{c.nome} · </b>}{s.nome}</span>
          {(["c", "e"] as const).map((t) => (
            <span key={t} className="grid place-items-center">
              <input type="checkbox" name={`${t}:${s.id}`} defaultChecked={(atende[s.id] ?? "").includes(t)} className="size-5 accent-verde" />
            </span>
          ))}
        </div>
      )))}
    </div>
  );
}

function FormProfissional({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, avisar } = useStore();
  const router = useRouter();
  const p = dados.profissionais.find((x) => x.id === id);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome");
    if (!dados.especialidades.length) return avisar("Cadastre uma especialidade antes do primeiro médico.");
    if (!clinica) return;
    const atende: Record<string, string> = {};
    for (const c of dados.convenios) for (const s of c.subtipos) {
      const v = (f.get(`c:${s.id}`) ? "c" : "") + (f.get(`e:${s.id}`) ? "e" : "");
      if (v) atende[s.id] = v;
    }
    const novo: Profissional = {
      id: p?.id ?? novoId("prof"),
      clinicaId: clinica.id,
      nome,
      especialidadeId: String(f.get("especialidade")),
      horarios: lerHorarios(f),
      idadeMinima: Number(f.get("idade")) || undefined,
      procedimentos: String(f.get("procedimentos")).split(",").map((x) => x.trim()).filter(Boolean),
      exames: dados.exames.filter((e) => f.get(`ex:${e.id}`)).map((e) => e.id),
      atende,
      restricoes: linhas(f.get("restricoes")).map((texto) => ({ texto })),
      observacoes: String(f.get("observacoes")).trim(),
    };
    if (!executar((b, u) => salvarProfissional(b, u, novo), p ? "Ficha atualizada" : "Profissional cadastrado")) return;
    abrirForm(null);
    router.push(`/profissionais/${novo.id}`);
  };

  return (
    <Moldura titulo={p ? "Editar profissional" : "Novo profissional"} descricao="Tudo o que a central precisa saber antes de marcar." onSalvar={salvar}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome"><input name="nome" defaultValue={p?.nome} placeholder="Dra. Nome Sobrenome" className={campo} /></Campo>
        <Campo rotulo="Especialidade" dica={dados.especialidades.length ? undefined : "Cadastre uma especialidade nesta clínica primeiro."}>
          <select name="especialidade" defaultValue={p?.especialidadeId} className={campo}>
            {dados.especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Idade mínima do paciente"><input name="idade" type="number" min={0} defaultValue={p?.idadeMinima} placeholder="Sem limite" className={campo} /></Campo>
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Dias e horários de atendimento</span>
        <EditorHorarios valor={p?.horarios ?? []} />
      </div>
      <Campo rotulo="Convênios atendidos" dica="Marque separadamente consulta e exame: nem todo convênio que cobre exame cobre consulta.">
        <MatrizConvenios dados={dados} atende={p?.atende ?? {}} />
      </Campo>
      <Campo rotulo="Procedimentos que realiza" dica="Separe por vírgula.">
        <input name="procedimentos" defaultValue={p?.procedimentos.join(", ")} placeholder="Lobuloplastia, Biópsia de pele" className={campo} />
      </Campo>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Exames que realiza</span>
        {dados.exames.length ? (
          <div className="flex flex-wrap gap-2">
            {dados.exames.map((e) => (
              <label key={e.id} className="pressionavel flex cursor-pointer items-center gap-2 rounded-xl border border-borda px-3 py-2 text-sm has-[:checked]:border-azul/40 has-[:checked]:bg-azul-claro has-[:checked]:text-azul">
                <input type="checkbox" name={`ex:${e.id}`} defaultChecked={p?.exames.includes(e.id)} className="accent-azul" />{e.nome}
              </label>
            ))}
          </div>
        ) : <p className="text-sm text-suave">Nenhum exame cadastrado nesta clínica ainda.</p>}
      </div>
      <Campo rotulo="Restrições" dica="Uma por linha. Ex.: Unimed só 5 pacientes por dia.">
        <textarea name="restricoes" rows={3} defaultValue={p?.restricoes.map((r) => r.texto).join("\n")} className={campo} />
      </Campo>
      <Campo rotulo="Observações">
        <textarea name="observacoes" rows={3} defaultValue={p?.observacoes} className={campo} />
      </Campo>
    </Moldura>
  );
}

function FormExame({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, abrir, avisar } = useStore();
  const ex = dados.exames.find((x) => x.id === id);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome do exame");
    if (!clinica) return;
    const novo: Exame = {
      id: ex?.id ?? novoId("exame"),
      clinicaId: clinica.id,
      nome,
      preparo: linhas(f.get("preparo")),
      documentos: String(f.get("documentos")).trim(),
      subtipos: dados.convenios.flatMap((c) => c.subtipos).filter((s) => f.get(`s:${s.id}`)).map((s) => s.id),
    };
    if (!executar((b, u) => salvarExame(b, u, novo), ex ? "Exame atualizado" : "Exame cadastrado")) return;
    abrirForm(null);
    abrir({ tipo: "exame", id: novo.id });
  };

  return (
    <Moldura titulo={ex ? "Editar exame" : "Novo exame"} descricao="Orientações que a atendente repassa ao paciente." onSalvar={salvar}>
      <Campo rotulo="Nome do exame"><input name="nome" defaultValue={ex?.nome} className={campo} /></Campo>
      <Campo rotulo="Preparo" dica="Um passo por linha.">
        <textarea name="preparo" rows={5} defaultValue={ex?.preparo.join("\n")} className={campo} />
      </Campo>
      <Campo rotulo="O paciente deve trazer"><input name="documentos" defaultValue={ex?.documentos} placeholder="Pedido médico, carteirinha..." className={campo} /></Campo>
      <div>
        <span className="mb-1.5 block text-sm font-semibold">Convênios que cobrem</span>
        {dados.convenios.length ? (
          <div className="space-y-3">
            {dados.convenios.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="w-32 text-sm font-semibold">{c.nome}</span>
                {c.subtipos.map((s) => (
                  <label key={s.id} className="pressionavel flex cursor-pointer items-center gap-2 rounded-xl border border-borda px-3 py-1.5 text-sm has-[:checked]:border-azul/40 has-[:checked]:bg-azul-claro has-[:checked]:text-azul">
                    <input type="checkbox" name={`s:${s.id}`} defaultChecked={ex?.subtipos.includes(s.id)} className="accent-azul" />{s.nome}
                  </label>
                ))}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-suave">Nenhum convênio cadastrado nesta clínica ainda.</p>}
      </div>
    </Moldura>
  );
}

function FormEspecialidade() {
  const { clinica, executar, abrirForm, avisar } = useStore();
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome");
    if (!clinica) return;
    const nova = { id: novoId("esp"), clinicaId: clinica.id, nome, icone: "Stethoscope" };
    if (executar((b, u) => salvarEspecialidade(b, u, nova), "Especialidade cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo="Nova especialidade" descricao="Depois, vincule os profissionais a ela." onSalvar={salvar}>
      <Campo rotulo="Nome"><input name="nome" placeholder="Ex.: Mastologia" className={campo} /></Campo>
    </Moldura>
  );
}

function FormConvenio({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, avisar } = useStore();
  const c = dados.convenios.find((x) => x.id === id);
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome do convênio");
    if (!clinica) return;
    const convId = c?.id ?? novoId("conv");
    const nomes = String(f.get("subtipos")).split(",").map((x) => x.trim()).filter(Boolean);
    const novo: Convenio = {
      id: convId,
      clinicaId: clinica.id,
      nome,
      cor: c?.cor ?? corDoIndice(dados.convenios.length),
      logo: c?.logo,
      // rede com o mesmo nome mantém o id, para não perder o que já foi marcado nos médicos e exames
      subtipos: nomes.map((n) => c?.subtipos.find((s) => s.nome === n) ?? { id: `${convId}-${slug(n)}`, nome: n }),
    };
    if (executar((b, u) => salvarConvenio(b, u, novo), c ? "Convênio atualizado" : "Convênio cadastrado")) abrirForm(null);
  };
  return (
    <Moldura titulo={c ? "Editar convênio" : "Novo convênio"} descricao="Cadastre o convênio e os tipos de rede dele." onSalvar={salvar}>
      <Campo rotulo="Nome do convênio"><input name="nome" defaultValue={c?.nome} placeholder="Ex.: Unimed" className={campo} /></Campo>
      <Campo rotulo="Tipos de rede" dica="Separe por vírgula. Ex.: Essencial, Flex, Rede fechada">
        <input name="subtipos" defaultValue={c?.subtipos.map((s) => s.nome).join(", ")} className={campo} />
      </Campo>
    </Moldura>
  );
}
```

- [ ] **Step 4: Reescrever `app/login/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, FlaskConical, ShieldCheck, Stethoscope } from "lucide-react";
import type { Usuario } from "@/lib/modelo";
import { PAPEIS } from "@/lib/permissoes";
import { useStore } from "@/lib/store";
import { Logo } from "@/components/ui";

const campo = "h-12 w-full rounded-xl border border-borda bg-superficie px-4 text-[15px] outline-none transition placeholder:text-suave/60 focus:border-verde focus:ring-4 focus:ring-verde/15";

export default function Login() {
  const { entrar, banco } = useStore();
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState("coordenador-comn");
  const escolhido = banco.usuarios.find((u) => u.id === usuarioId) ?? banco.usuarios[0];
  const alcance = (u: Usuario) =>
    `${PAPEIS[u.papel].rotulo} · ${u.clinicas.length ? u.clinicas.map((id) => banco.clinicas.find((c) => c.id === id)?.nome ?? id).join(", ") : "todas as clínicas"}`;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Painel da marca */}
      <div className="gradiente-marca relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="bolha absolute -left-24 top-1/4 size-96 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="bolha absolute -right-16 bottom-10 size-80 rounded-full bg-sky-300/30 blur-3xl" style={{ animationDelay: "-7s" }} />
        <div className="relative entrar"><Logo claro /></div>

        <div className="relative my-auto max-w-md">
          <h1 className="entrar text-4xl font-bold leading-tight tracking-tight" style={{ "--i": 2 } as React.CSSProperties}>
            Tudo o que a central precisa, num lugar só.
          </h1>
          <p className="entrar mt-4 text-lg text-white/80" style={{ "--i": 3 } as React.CSSProperties}>
            Médicos, convênios e preparo de exames, prontos para consultar durante a ligação.
          </p>
          <svg viewBox="0 0 600 120" className="mt-10 w-full" fill="none" aria-hidden>
            <path className="ecg" d="M0 60 H170 L190 60 L205 30 L222 95 L240 10 L258 105 L272 60 H340 L355 48 L370 60 H600"
              stroke="white" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-8 flex flex-wrap gap-2">
            {([[Stethoscope, "Especialidades e médicos"], [ShieldCheck, "Convênios por rede"], [FlaskConical, "Preparo de exames"]] as const).map(([Ic, t], i) => (
              <span key={t} className="entrar flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm ring-1 ring-white/25 backdrop-blur" style={{ "--i": 5 + i } as React.CSSProperties}>
                <Ic className="size-4" />{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6">
        <form className="w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); entrar(escolhido.id); router.replace("/"); }}>
          <div className="entrar mb-10 lg:hidden"><Logo /></div>
          <h2 className="entrar text-[28px] font-bold tracking-tight" style={{ "--i": 1 } as React.CSSProperties}>Entrar</h2>
          <p className="entrar mt-1 text-suave" style={{ "--i": 2 } as React.CSSProperties}>Use o acesso que a coordenação te passou.</p>

          <div className="entrar mt-8 space-y-4" style={{ "--i": 3 } as React.CSSProperties}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">E-mail</span>
              <input key={escolhido.id} type="email" defaultValue={escolhido.email} className={campo} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Senha</span>
              <input type="password" placeholder="••••••••" className={campo} />
            </label>
            <fieldset>
              <legend className="mb-1.5 block text-sm font-semibold">Usuário de teste <span className="font-normal text-suave">(só no protótipo)</span></legend>
              <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                {banco.usuarios.map((u) => (
                  <label key={u.id} className="pressionavel flex cursor-pointer items-center gap-3 rounded-xl border border-borda bg-superficie px-3 py-2.5 has-[:checked]:border-verde/50 has-[:checked]:bg-verde-claro">
                    <input type="radio" name="usuario" value={u.id} checked={u.id === escolhido.id} onChange={() => setUsuarioId(u.id)} className="size-4 accent-verde" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{u.nome}</span>
                      <span className="block truncate text-xs text-suave">{alcance(u)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <button type="submit" className="entrar pressionavel gradiente-marca group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-white shadow-card hover:brightness-105" style={{ "--i": 4 } as React.CSSProperties}>
            Entrar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Ajustar `components/ui.tsx`**

Troque a linha de import de dados:

```tsx
import { iniciais, resumoHorarios, type Dados, type Profissional, type Tipo } from "@/lib/dados";
```

por:

```tsx
import { iniciais, resumoHorarios } from "@/lib/regras";
import type { DadosClinica, Profissional, Tipo } from "@/lib/modelo";
```

Em `SeletorConvenio`, troque `{ dados: Dados;` por `{ dados: DadosClinica;`.

Em `CartaoProfissional`, apague estas duas linhas:

```tsx
  const { dados, perfil } = useStore();
  const setor = perfil === "admin" && dados.setores.length ? (dados.setores.find((x) => x.id === p.setorId)?.nome ?? "Compartilhado") : null;
```

e esta:

```tsx
        {setor && <Chip tom="azul">{setor}</Chip>}
```

Mantenha `import { useStore } from "@/lib/store";` no topo: a Task 4 volta a usá-lo.

- [ ] **Step 6: Ajustar `components/paineis.tsx`**

- Troque `import { resumoHorarios } from "@/lib/dados";` por `import { resumoHorarios } from "@/lib/regras";`.
- Troque `const { dados, perfil, abrir, abrirForm, avisar } = useStore();` por `const { dados, podeEditarAtual, abrir, abrirForm, avisar } = useStore();`.
- Troque `{perfil === "admin" && <Botao variante="secundario"` por `{podeEditarAtual && <Botao variante="secundario"`.

- [ ] **Step 7: Ajustar as telas de consulta**

`app/(app)/page.tsx`: troque

```tsx
import { atende, semAcento, subtipoInfo, type Tipo } from "@/lib/dados";
```

por

```tsx
import { atende, semAcento, subtipoInfo } from "@/lib/regras";
import type { Tipo } from "@/lib/modelo";
```

`app/(app)/especialidades/page.tsx`:
- `const { dados, perfil, abrirForm } = useStore();` → `const { dados, podeEditarAtual, abrirForm } = useStore();`
- `acao={perfil === "admin" && (` → `acao={podeEditarAtual && (`
- Troque o trecho

```tsx
      </div>

      {atual && (
```

por

```tsx
      </div>

      {!dados.especialidades.length && (
        <Vazio texto="Nenhuma especialidade cadastrada nesta clínica. Cadastre a primeira para depois vincular os médicos." />
      )}

      {atual && (
```

`app/(app)/convenios/page.tsx`:
- Troque `import { atende, type Profissional, type Tipo } from "@/lib/dados";` por

```tsx
import { atende } from "@/lib/regras";
import type { Profissional, Tipo } from "@/lib/modelo";
```

- `const { dados, perfil, abrirForm, abrir } = useStore();` → `const { dados, podeEditarAtual, abrirForm, abrir } = useStore();`
- `acao={perfil === "admin" && <Botao` → `acao={podeEditarAtual && <Botao`
- Logo antes de `<div className="grid gap-6 lg:grid-cols-[260px_1fr]">`, acrescente:

```tsx
      {!dados.convenios.length && <Vazio texto="Nenhum convênio cadastrado nesta clínica." />}
```

`app/(app)/exames/page.tsx`:
- `import { semAcento } from "@/lib/dados";` → `import { semAcento } from "@/lib/regras";`
- `const { dados, perfil, abrir, abrirForm } = useStore();` → `const { dados, podeEditarAtual, abrir, abrirForm } = useStore();`
- `acao={perfil === "admin" && <Botao` → `acao={podeEditarAtual && <Botao`
- `{!lista.length && <Vazio texto="Nenhum exame com esse nome." />}` → `{!lista.length && <Vazio texto={dados.exames.length ? "Nenhum exame com esse nome." : "Nenhum exame cadastrado nesta clínica."} />}`

- [ ] **Step 8: Ajustar `app/(app)/profissionais/[id]/page.tsx`**

Troque `import { DIAS, subtipoInfo, type Dados, type Profissional } from "@/lib/dados";` por:

```tsx
import { DIAS, type DadosClinica, type Profissional } from "@/lib/modelo";
import { subtipoInfo } from "@/lib/regras";
import { salvarProfissional } from "@/lib/repositorio";
```

Troque `const { dados, setDados, perfil, clinica, setor, abrir, abrirForm, avisar } = useStore();` por:

```tsx
  const { dados, podeEditarAtual, clinica, abrir, abrirForm, executar } = useStore();
```

Troque a linha do `Vazio` de "não encontrado" por:

```tsx
        <Vazio texto={`Profissional não encontrado na ${clinica?.nome ?? "clínica atual"}.`} />
```

Troque o bloco

```tsx
  const admin = perfil === "admin";
  const salvar = (mudanca: Partial<Profissional>, msg: string) => {
    setDados((d) => ({ ...d, profissionais: d.profissionais.map((x) => (x.id === p.id ? { ...x, ...mudanca } : x)) }));
    setEditando(null);
    avisar(msg);
  };
```

por

```tsx
  const admin = podeEditarAtual; // pode editar esta clínica
  const salvar = (mudanca: Partial<Profissional>, msg: string) => {
    if (executar((b, u) => salvarProfissional(b, u, { ...p, ...mudanca }), msg)) setEditando(null);
  };
```

Apague a linha do selo de setor:

```tsx
            {dados.setores.length > 0 && <Chip tom="azul">{dados.setores.find((x) => x.id === p.setorId)?.nome ?? "Compartilhado entre os setores"}</Chip>}
```

Troque `function TabelaConvenios({ dados, p }: { dados: Dados; p: Profissional })` por `function TabelaConvenios({ dados, p }: { dados: DadosClinica; p: Profissional })`.

- [ ] **Step 9: Remover o que saiu**

```bash
git rm lib/dados.ts "app/(app)/clinicas/page.tsx" "app/(app)/usuarios/page.tsx"
```

- [ ] **Step 10: Conferir que nada mais aponta para o modelo antigo**

Run: `grep -rn "@/lib/dados\|setDados\|perfil\|setor" app components lib --include=*.ts --include=*.tsx`
Expected: nenhuma linha.

- [ ] **Step 11: Tipos, testes e build**

Run: `npx tsc --noEmit` → sem saída.
Run: `node lib/dados.check.mjs` → `ok`.
Run: `npm run build` → tabela de rotas com `/`, `/convenios`, `/especialidades`, `/exames`, `/login`, `/profissionais/[id]`; sem `/clinicas` e `/usuarios`.

- [ ] **Step 12: Conferir no navegador**

Com `npm run dev` rodando, numa aba nova em http://localhost:3000/login (limpe o `localStorage` do site antes, em DevTools → Application → Local storage):
1. Entrar como **Coordenador COMN**: o seletor mostra "COMN" com cadeado; Especialidades, Convênios e Exames mostram os textos de vazio.
2. Cadastrar a especialidade "Mastologia", o convênio "Unimed" com redes "Essencial, Flex", um médico com Unimed Flex marcado em consulta e um exame.
3. Recarregar a página (F5): tudo continua lá.
4. Sair e entrar como **Recepção COMN**: a busca mostra o médico; não há botão de cadastrar nem de editar.
5. Sair e entrar como **Recepção ONCY**: não aparece nenhum médico.
6. Sair e entrar como **Administrador**: o seletor abre a lista das 8 clínicas, agrupadas por organização; escolher ONCY troca os dados.
7. No console do navegador, nenhum erro vermelho do app (os avisos de hidratação causados por extensões, com `data-qb-installed` ou `cz-shortcut-listen`, não contam).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "Telas ligadas ao repositório: sessão por usuário, clínica atual e permissões"
```

---

### Task 4: Logos de clínica e de convênio

**Files:**
- Create: `lib/logo.ts`
- Modify: `components/ui.tsx`, `components/formularios.tsx`, `components/estrutura.tsx`, `components/paineis.tsx`, `app/(app)/page.tsx`, `app/(app)/convenios/page.tsx`, `app/(app)/profissionais/[id]/page.tsx`

**Interfaces:**
- Consumes: `useStore().avisar`, `iniciais` de `lib/regras.ts`, o tipo `Formulario` com `{ tipo: "convenio"; id?: string }`.
- Produces:
  - `lib/logo.ts`: `reduzirImagem(arquivo: File, max?: number): Promise<string>` (data URL PNG, lado maior ≤ 256 px; lança `Error` com mensagem em português se não for imagem).
  - `components/ui.tsx`: `LogoMarca({ nome: string; logo?: string; cor?: string; tamanho?: "sm" | "md" | "lg" })`, `EnvioLogo({ nome: string; cor?: string; valor?: string; onChange: (logo: string | undefined) => void })`. A Task 5 usa as duas.

- [ ] **Step 1: Criar `lib/logo.ts`**

```ts
// Reduz a imagem no navegador antes de guardar, para caber no localStorage (cerca de 5 MB no total).
export async function reduzirImagem(arquivo: File, max = 256): Promise<string> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem (PNG, JPG, SVG ou WebP).");
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    // SVG sem tamanho declarado chega com 0 × 0
    const w = img.naturalWidth || max;
    const h = img.naturalHeight || max;
    const k = Math.min(1, max / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * k);
    canvas.height = Math.round(h * k);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    throw new Error("Não foi possível ler esta imagem. Tente outro arquivo.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 2: Acrescentar `LogoMarca` e `EnvioLogo` em `components/ui.tsx`**

No topo, acrescente o import:

```tsx
import { reduzirImagem } from "@/lib/logo";
```

No fim do arquivo, acrescente:

```tsx
// Logo da clínica ou do convênio; sem imagem, mostra as iniciais sobre a cor
export function LogoMarca({ nome, logo, cor = "#0d9b86", tamanho = "md" }: {
  nome: string; logo?: string; cor?: string; tamanho?: "sm" | "md" | "lg";
}) {
  const t = { sm: "size-6 rounded-md text-[10px]", md: "size-9 rounded-xl text-xs", lg: "size-14 rounded-2xl text-base" }[tamanho];
  return logo
    // eslint-disable-next-line @next/next/no-img-element -- data URL local, sem otimização do Next
    ? <img src={logo} alt={`Logo ${nome}`} className={`${t} shrink-0 bg-white object-contain p-0.5 ring-1 ring-borda`} />
    : <span aria-hidden className={`${t} grid shrink-0 place-items-center font-bold text-white`} style={{ background: cor }}>{iniciais(nome)}</span>;
}

// Quadro clicável para escolher a logo; a imagem é reduzida antes de voltar em `onChange`
export function EnvioLogo({ nome, cor, valor, onChange }: {
  nome: string; cor?: string; valor?: string; onChange: (logo: string | undefined) => void;
}) {
  const { avisar } = useStore();
  const escolher = async (arquivo?: File) => {
    if (!arquivo) return;
    try { onChange(await reduzirImagem(arquivo)); } catch (e) { avisar((e as Error).message); }
  };
  return (
    <div className="flex items-center gap-4">
      <label className="pressionavel group relative cursor-pointer rounded-2xl" title="Escolher logo">
        <LogoMarca nome={nome || "?"} logo={valor} cor={cor} tamanho="lg" />
        <span className="absolute inset-0 grid place-items-center rounded-2xl bg-texto/0 text-white opacity-0 transition group-hover:bg-texto/40 group-hover:opacity-100">
          <Icones.ImageUp className="size-5" />
        </span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <div className="text-sm">
        <p className="font-semibold">Logo</p>
        <p className="text-suave">Clique no quadro para escolher uma imagem.</p>
        {valor && <button type="button" onClick={() => onChange(undefined)} className="mt-1 font-semibold text-alerta hover:underline">Remover logo</button>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Logo no formulário de convênio**

Em `components/formularios.tsx`:
- Troque `import { Botao, Gaveta } from "./ui";` por `import { Botao, EnvioLogo, Gaveta } from "./ui";`.
- Em `FormConvenio`, logo depois de `const c = dados.convenios.find((x) => x.id === id);`, acrescente:

```tsx
  const [logo, setLogo] = useState(c?.logo);
  const [nomeAtual, setNomeAtual] = useState(c?.nome ?? "");
```

- Troque `      logo: c?.logo,` por `      logo,`.
- Troque o campo de nome

```tsx
      <Campo rotulo="Nome do convênio"><input name="nome" defaultValue={c?.nome} placeholder="Ex.: Unimed" className={campo} /></Campo>
```

por

```tsx
      <EnvioLogo nome={nomeAtual} cor={c?.cor ?? corDoIndice(dados.convenios.length)} valor={logo} onChange={setLogo} />
      <Campo rotulo="Nome do convênio"><input name="nome" defaultValue={c?.nome} onChange={(e) => setNomeAtual(e.target.value)} placeholder="Ex.: Unimed" className={campo} /></Campo>
```

- [ ] **Step 4: Logo do convênio nas telas**

`app/(app)/convenios/page.tsx`:
- Troque `import { ChevronRight, FlaskConical, Plus, Stethoscope, TriangleAlert } from "lucide-react";` por `import { ChevronRight, FlaskConical, Pencil, Plus, Stethoscope, TriangleAlert } from "lucide-react";`.
- Troque `import { Avatar, Botao, CabecalhoPagina, Segmentado, Vazio } from "@/components/ui";` por `import { Avatar, Botao, CabecalhoPagina, LogoMarca, Segmentado, Vazio } from "@/components/ui";`.
- Troque `<span className="size-3 rounded-full ring-4 ring-white" style={{ background: c.cor }} />` por `<LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} />`.
- Troque

```tsx
            <div className="entrar">
              <p className="mb-2 text-sm font-semibold text-suave">Tipo de rede</p>
```

por

```tsx
            <div className="entrar">
              <div className="mb-4 flex items-center gap-3">
                <LogoMarca nome={conv.nome} logo={conv.logo} cor={conv.cor} tamanho="lg" />
                <h2 className="flex-1 text-xl font-bold">{conv.nome}</h2>
                {podeEditarAtual && (
                  <Botao variante="secundario" onClick={() => abrirForm({ tipo: "convenio", id: conv.id })}><Pencil className="size-4" />Editar convênio</Botao>
                )}
              </div>
              <p className="mb-2 text-sm font-semibold text-suave">Tipo de rede</p>
```

`app/(app)/profissionais/[id]/page.tsx`:
- Troque `import { Avatar, Botao, Chip, Icone, Secao, Vazio } from "@/components/ui";` por `import { Avatar, Botao, Chip, Icone, LogoMarca, Secao, Vazio } from "@/components/ui";`.
- Troque `<span className="size-2 rounded-full" style={{ background: c.cor, opacity: k ? 0 : 1 }} />` por `{k ? <span className="size-6 shrink-0" /> : <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />}`.

`components/paineis.tsx`:
- Troque `import { Avatar, Botao, Chip, Gaveta, Secao, Vazio } from "./ui";` por `import { Avatar, Botao, Chip, Gaveta, LogoMarca, Secao, Vazio } from "./ui";`.
- Troque `<span className="size-2 rounded-full" style={{ background: c.cor }} />{c.nome}` por `<LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />{c.nome}`.

`app/(app)/page.tsx`:
- Troque `import { CartaoProfissional, Chip, Segmentado, SeletorConvenio, TipoBadge, Vazio } from "@/components/ui";` por `import { CartaoProfissional, Chip, LogoMarca, Segmentado, SeletorConvenio, TipoBadge, Vazio } from "@/components/ui";`.
- Troque `<span className="size-2 rounded-full" style={{ background: info.convenio.cor }} />` por `<LogoMarca nome={info.convenio.nome} logo={info.convenio.logo} cor={info.convenio.cor} tamanho="sm" />`.

- [ ] **Step 5: Logo da clínica no seletor**

Em `components/estrutura.tsx`:
- Troque `import { Logo, Vazio } from "@/components/ui";` por `import { Logo, LogoMarca, Vazio } from "@/components/ui";`.
- Troque `<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-superficie text-verde shadow-card"><Building2 className="size-4" /></span>` por `<LogoMarca nome={clinica.nome} logo={clinica.logo} />`.
- Tire `Building2` do import de `lucide-react` (fica sem uso).

- [ ] **Step 6: Tipos e build**

Run: `npx tsc --noEmit` → sem saída.
Run: `npm run build` → sem erro.

- [ ] **Step 7: Conferir no navegador**

Como **Coordenador COMN**:
1. Convênios → Editar convênio → clicar no quadro da logo e escolher um PNG: a logo aparece no quadro; Salvar; a logo aparece na lista e no topo do convênio.
2. Escolher um arquivo `.txt` no mesmo quadro: aparece o aviso "Escolha um arquivo de imagem (PNG, JPG, SVG ou WebP)."
3. Abrir a página de um médico que atende esse convênio: a logo aparece pequena na tabela de convênios.
4. Recarregar a página: a logo continua.
5. No DevTools → Application → Local storage, o valor de `cartilha:v1` tem a logo como `data:image/png;base64,...` com poucos KB.

- [ ] **Step 8: Commit**

```bash
git add lib/logo.ts components app
git commit -m "Logos de convênio e de clínica, reduzidas no navegador"
```

---

### Task 5: Tela Clínicas

**Files:**
- Create: `app/(app)/clinicas/page.tsx`
- Modify: `components/formularios.tsx`, `components/estrutura.tsx`, `app/login/page.tsx`

**Interfaces:**
- Consumes: `podeCriarClinica`, `podeEditar`, `podeVerTelaClinicas` de `lib/permissoes.ts`; `dadosDaClinica`, `salvarClinica`, `salvarOrganizacao` de `lib/repositorio.ts`; `LogoMarca`, `EnvioLogo` de `components/ui.tsx`; `Moldura`, `Campo`, `campo` de `components/formularios.tsx`; `novoId` de `lib/regras.ts`.
- Produces: rota `/clinicas`; formulários `organizacao` e `clinica (id?)` na gaveta.

- [ ] **Step 1: Criar `app/(app)/clinicas/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Check, Pencil, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { podeCriarClinica, podeEditar, podeVerTelaClinicas } from "@/lib/permissoes";
import { dadosDaClinica } from "@/lib/repositorio";
import { Botao, CabecalhoPagina, LogoMarca, Vazio } from "@/components/ui";

export default function Clinicas() {
  const { banco, usuario, clinicas, clinica, escolherClinica, abrirForm } = useStore();
  const router = useRouter();
  if (!usuario || !podeVerTelaClinicas(usuario)) return <Vazio texto="Seu usuário não gerencia clínicas." />;
  const criar = podeCriarClinica(usuario);

  return (
    <div>
      <CabecalhoPagina titulo="Clínicas" descricao="Cada clínica tem os próprios médicos, convênios, especialidades e exames."
        acao={criar && (
          <div className="flex gap-2">
            <Botao variante="secundario" onClick={() => abrirForm({ tipo: "organizacao" })}><Plus className="size-4" />Organização</Botao>
            <Botao onClick={() => abrirForm({ tipo: "clinica" })}><Plus className="size-4" />Clínica</Botao>
          </div>
        )} />

      <div className="space-y-10">
        {banco.organizacoes.map((o, oi) => {
          const lista = clinicas.filter((c) => c.organizacaoId === o.id);
          if (!lista.length && !criar) return null;
          return (
            <section key={o.id} className="entrar" style={{ "--i": oi } as React.CSSProperties}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-suave">Organização · {o.nome}</h2>
              {lista.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((c) => {
                    const d = dadosDaClinica(banco, c.id);
                    const atual = c.id === clinica?.id;
                    return (
                      <div key={c.id} className={`levanta relative rounded-3xl border bg-superficie shadow-card ${atual ? "border-verde/40" : "border-borda"}`}>
                        {atual && <div className="gradiente-marca absolute inset-x-0 top-0 h-1 rounded-t-3xl" />}
                        <button type="button" onClick={() => { escolherClinica(c.id); router.push("/"); }}
                          className="pressionavel flex w-full flex-col gap-4 p-5 text-left">
                          <span className="flex items-center gap-3 pr-10">
                            <LogoMarca nome={c.nome} logo={c.logo} tamanho="lg" />
                            <span className="min-w-0">
                              <span className="block truncate text-lg font-bold">{c.nome}</span>
                              {atual && <span className="mt-0.5 inline-flex items-center gap-1 rounded-lg bg-verde-claro px-2 py-0.5 text-xs font-semibold text-verde"><Check className="size-3.5" strokeWidth={3} />Em uso</span>}
                            </span>
                          </span>
                          <span className="grid grid-cols-3 gap-2 border-t border-borda pt-3 text-sm text-suave">
                            <span><b className="block text-lg tabular-nums text-texto">{d.profissionais.length}</b>médicos</span>
                            <span><b className="block text-lg tabular-nums text-texto">{d.convenios.length}</b>convênios</span>
                            <span><b className="block text-lg tabular-nums text-texto">{d.exames.length}</b>exames</span>
                          </span>
                        </button>
                        {podeEditar(usuario, c.id) && (
                          <button type="button" aria-label={`Editar ${c.nome}`} onClick={() => abrirForm({ tipo: "clinica", id: c.id })}
                            className="pressionavel absolute right-4 top-4 grid size-9 place-items-center rounded-xl text-suave hover:bg-fundo hover:text-verde">
                            <Pencil className="size-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : <Vazio texto="Nenhuma clínica nesta organização ainda." />}
            </section>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Formulários de organização e de clínica**

Em `components/formularios.tsx`:
- Troque o import do repositório por:

```tsx
import { salvarClinica, salvarConvenio, salvarEspecialidade, salvarExame, salvarOrganizacao, salvarProfissional } from "@/lib/repositorio";
```

- Na função `Formularios`, logo depois da linha do `FormExame`, acrescente:

```tsx
      {atual?.tipo === "organizacao" && <FormOrganizacao key={k} />}
      {atual?.tipo === "clinica" && <FormClinica key={k} id={atual.id} />}
```

- No fim do arquivo, acrescente:

```tsx
function FormOrganizacao() {
  const { executar, abrirForm, avisar } = useStore();
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome da organização");
    if (executar((b, u) => salvarOrganizacao(b, u, { id: novoId("org"), nome }), "Organização cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo="Nova organização" descricao="Um cliente do sistema. Depois, cadastre as clínicas dele." onSalvar={salvar}>
      <Campo rotulo="Nome da organização"><input name="nome" placeholder="Ex.: Clínica de Oncologia e Mastologia" className={campo} /></Campo>
    </Moldura>
  );
}

function FormClinica({ id }: { id?: string }) {
  const { banco, executar, abrirForm, avisar } = useStore();
  const c = banco.clinicas.find((x) => x.id === id);
  const [logo, setLogo] = useState(c?.logo);
  const [nomeAtual, setNomeAtual] = useState(c?.nome ?? "");
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome da clínica");
    const organizacaoId = c?.organizacaoId ?? String(f.get("organizacao"));
    const nova = { id: c?.id ?? novoId("clinica"), organizacaoId, nome, logo };
    if (executar((b, u) => salvarClinica(b, u, nova), c ? "Clínica atualizada" : "Clínica cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo={c ? "Editar clínica" : "Nova clínica"} descricao="Cada clínica tem os próprios médicos, convênios, especialidades e exames." onSalvar={salvar}>
      <EnvioLogo nome={nomeAtual} valor={logo} onChange={setLogo} />
      {!c && (
        <Campo rotulo="Organização">
          <select name="organizacao" className={campo}>
            {banco.organizacoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </Campo>
      )}
      <Campo rotulo="Nome da clínica">
        <input name="nome" defaultValue={c?.nome} onChange={(e) => setNomeAtual(e.target.value)} placeholder="Ex.: COMN" className={campo} />
      </Campo>
    </Moldura>
  );
}
```

- [ ] **Step 3: Item "Clínicas" no menu**

Em `components/estrutura.tsx`:
- Acrescente ao import de `@/lib/permissoes`: `import { PAPEIS, podeVerTelaClinicas } from "@/lib/permissoes";` (substituindo a linha que só importa `PAPEIS`).
- `Building2` volta ao import de `lucide-react` (agora usado no menu).
- No array `menu`, acrescente como último item:

```tsx
  { href: "/clinicas", rotulo: "Clínicas", icone: Building2, mostrar: podeVerTelaClinicas },
```

- [ ] **Step 4: Administrador e Comercial entram pela tela Clínicas**

Em `app/login/page.tsx`, troque `entrar(escolhido.id); router.replace("/");` por:

```tsx
entrar(escolhido.id); router.replace(escolhido.clinicas.length ? "/" : "/clinicas");
```

- [ ] **Step 5: Tipos e build**

Run: `npx tsc --noEmit` → sem saída.
Run: `npm run build` → tabela de rotas inclui `/clinicas`.

- [ ] **Step 6: Conferir no navegador**

1. Entrar como **Comercial**: cai em Clínicas; aparecem 7 organizações; a Clínica de Oncologia e Mastologia com COMN e ONCY.
2. "+ Organização" → "Teste" → Salvar: aparece "Organização · Teste" com "Nenhuma clínica nesta organização ainda."
3. "+ Clínica" → organização Teste, nome "Unidade Teste", logo → Salvar: aparece o cartão com a logo.
4. Entrar como **Coordenador COMN**: o menu tem "Clínicas"; a tela mostra só COMN, com lápis; sem botões de criar. Editar → trocar a logo → a logo nova aparece no seletor do menu.
5. Entrar como **Recepção COMN**: o menu não tem "Clínicas"; abrindo `/clinicas` pelo endereço aparece "Seu usuário não gerencia clínicas."

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/clinicas/page.tsx" components/formularios.tsx components/estrutura.tsx app/login/page.tsx
git commit -m "Tela Clínicas: organizações, clínicas, logo e permissões por papel"
```

---

### Task 6: Tela Usuários e "Restaurar demonstração"

**Files:**
- Create: `app/(app)/usuarios/page.tsx`
- Modify: `components/formularios.tsx`, `components/estrutura.tsx`

**Interfaces:**
- Consumes: `PAPEIS`, `podeCriarUsuario` de `lib/permissoes.ts`; `salvarUsuario`, `restaurarDemonstracao` de `lib/repositorio.ts`; `Papel` de `lib/modelo.ts`; `Moldura`, `Campo`, `campo` de `components/formularios.tsx`.
- Produces: rota `/usuarios`; formulário `usuario` na gaveta.

- [ ] **Step 1: Criar `app/(app)/usuarios/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Building2, Plus, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { PAPEIS, podeCriarUsuario } from "@/lib/permissoes";
import { restaurarDemonstracao } from "@/lib/repositorio";
import { Botao, CabecalhoPagina, Chip, Vazio } from "@/components/ui";

export default function Usuarios() {
  const { banco, usuario, abrirForm, executar } = useStore();
  const [confirmando, setConfirmando] = useState(false);
  if (!usuario || !podeCriarUsuario(usuario)) return <Vazio texto="Só o Administrador gerencia usuários." />;

  const nomeClinica = (id: string) => banco.clinicas.find((c) => c.id === id)?.nome ?? id;
  const restaurar = () => {
    if (executar((b, u) => restaurarDemonstracao(b, u), "Demonstração restaurada")) setConfirmando(false);
  };

  return (
    <div>
      <CabecalhoPagina titulo="Usuários" descricao="Cada usuário vê só as clínicas vinculadas a ele. Administrador e Comercial veem todas."
        acao={<Botao onClick={() => abrirForm({ tipo: "usuario" })}><Plus className="size-4" />Usuário</Botao>} />

      <div className="overflow-hidden rounded-3xl border border-borda bg-superficie shadow-card">
        {banco.usuarios.map((u, i) => (
          <div key={u.id} style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
            className={`entrar flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 ${i ? "border-t border-borda" : ""}`}>
            <span className={`grid size-10 place-items-center rounded-xl ${u.clinicas.length ? "bg-verde-claro text-verde" : "gradiente-marca text-white"}`}>
              {u.clinicas.length ? <UserRound className="size-5" /> : <ShieldCheck className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{u.nome}</span>
              <span className="block truncate text-sm text-suave">{u.email}</span>
            </span>
            <span className="flex flex-wrap gap-2">
              <Chip tom={u.papel === "recepcao" ? "neutro" : "verde"}>{PAPEIS[u.papel].rotulo}</Chip>
              {u.clinicas.length
                ? u.clinicas.map((id) => <Chip key={id} tom="azul"><Building2 className="size-3.5" />{nomeClinica(id)}</Chip>)
                : <Chip tom="azul">Todas as clínicas</Chip>}
            </span>
          </div>
        ))}
      </div>

      <section className="entrar mt-10 rounded-3xl border border-borda bg-superficie p-5 sm:p-6" style={{ "--i": 3 } as React.CSSProperties}>
        <h2 className="font-bold">Restaurar demonstração</h2>
        <p className="mt-1 text-sm text-suave">Apaga médicos, convênios, especialidades, exames, logos e usuários criados, e volta ao ponto zero. Use antes de apresentar.</p>
        {confirmando ? (
          <div key="confirma" className="entrar mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-alerta-claro p-4">
            <p className="flex-1 text-sm font-semibold text-alerta">Tem certeza? Tudo o que foi cadastrado neste navegador será apagado.</p>
            <Botao variante="secundario" onClick={() => setConfirmando(false)}>Cancelar</Botao>
            <button type="button" onClick={restaurar}
              className="pressionavel inline-flex h-10 items-center gap-2 rounded-xl bg-alerta px-4 text-sm font-semibold text-white hover:brightness-110">
              <RotateCcw className="size-4" />Apagar e restaurar
            </button>
          </div>
        ) : (
          <div key="botao" className="mt-4">
            <Botao variante="secundario" onClick={() => setConfirmando(true)}><RotateCcw className="size-4" />Restaurar demonstração</Botao>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Formulário de usuário**

Em `components/formularios.tsx`:
- Troque o import do repositório por:

```tsx
import { salvarClinica, salvarConvenio, salvarEspecialidade, salvarExame, salvarOrganizacao, salvarProfissional, salvarUsuario } from "@/lib/repositorio";
```

- Troque o import de `@/lib/modelo` por:

```tsx
import { DIAS, type Convenio, type DadosClinica, type Exame, type Horario, type Papel, type Profissional } from "@/lib/modelo";
```

- Acrescente: `import { PAPEIS } from "@/lib/permissoes";`
- Na função `Formularios`, logo depois da linha do `FormClinica`, acrescente:

```tsx
      {atual?.tipo === "usuario" && <FormUsuario key={k} />}
```

- No fim do arquivo, acrescente:

```tsx
function FormUsuario() {
  const { banco, executar, abrirForm, avisar } = useStore();
  const [papel, setPapel] = useState<Papel>("recepcao");
  const todas = papel === "administrador" || papel === "comercial";

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    const email = String(f.get("email")).trim();
    if (!nome || !email) return avisar("Informe nome e e-mail");
    const clinicas = todas ? [] : banco.clinicas.filter((c) => f.get(`cl:${c.id}`)).map((c) => c.id);
    // a regra "pelo menos uma clínica" é conferida no repositório
    if (executar((b, u) => salvarUsuario(b, u, { id: novoId("usuario"), nome, email, papel, clinicas }), "Usuário cadastrado")) abrirForm(null);
  };

  return (
    <Moldura titulo="Novo usuário" descricao="O papel define o que a pessoa pode fazer; as clínicas, onde." onSalvar={salvar}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome"><input name="nome" placeholder="Ex.: Recepção COMN — tarde" className={campo} /></Campo>
        <Campo rotulo="E-mail"><input name="email" type="email" placeholder="nome@clinica.com.br" className={campo} /></Campo>
      </div>
      <fieldset>
        <legend className="mb-1.5 block text-sm font-semibold">Papel</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PAPEIS) as Papel[]).map((p) => (
            <label key={p} className="pressionavel flex cursor-pointer gap-3 rounded-xl border border-borda px-3 py-2.5 has-[:checked]:border-verde/50 has-[:checked]:bg-verde-claro">
              <input type="radio" name="papel" checked={papel === p} onChange={() => setPapel(p)} className="mt-1 size-4 accent-verde" />
              <span>
                <span className="block text-sm font-semibold">{PAPEIS[p].rotulo}</span>
                <span className="block text-xs text-suave">{PAPEIS[p].descricao}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {todas ? (
        <p className="rounded-xl bg-fundo px-4 py-3 text-sm text-suave">{PAPEIS[papel].rotulo} acessa todas as clínicas.</p>
      ) : (
        <fieldset>
          <legend className="mb-1.5 block text-sm font-semibold">Clínicas vinculadas</legend>
          <div className="space-y-3">
            {banco.organizacoes.map((o) => {
              const daOrg = banco.clinicas.filter((c) => c.organizacaoId === o.id);
              return daOrg.length > 0 && (
                <div key={o.id}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-suave">{o.nome}</p>
                  <div className="flex flex-wrap gap-2">
                    {daOrg.map((c) => (
                      <label key={c.id} className="pressionavel flex cursor-pointer items-center gap-2 rounded-xl border border-borda px-3 py-1.5 text-sm has-[:checked]:border-azul/40 has-[:checked]:bg-azul-claro has-[:checked]:text-azul">
                        <input type="checkbox" name={`cl:${c.id}`} className="accent-azul" />{c.nome}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </fieldset>
      )}
    </Moldura>
  );
}
```

- [ ] **Step 3: Item "Usuários" no menu**

Em `components/estrutura.tsx`:
- Troque o import de permissões por `import { PAPEIS, podeCriarUsuario, podeVerTelaClinicas } from "@/lib/permissoes";`.
- Acrescente `Users` ao import de `lucide-react`.
- No array `menu`, acrescente como último item:

```tsx
  { href: "/usuarios", rotulo: "Usuários", icone: Users, mostrar: podeCriarUsuario },
```

- [ ] **Step 4: Tipos, testes e build**

Run: `npx tsc --noEmit` → sem saída.
Run: `node lib/dados.check.mjs` → `ok`.
Run: `npm run build` → tabela de rotas inclui `/usuarios`.

- [ ] **Step 5: Conferir no navegador**

1. Entrar como **Administrador** → Usuários: os 7 usuários de teste, com papel e clínicas.
2. "+ Usuário" → nome "Recepção dupla", papel Recepção/Central, sem marcar clínica → Salvar: aviso "Vincule pelo menos uma clínica."; a gaveta continua aberta.
3. Marcar COMN e ONCY → Salvar: aparece na lista com as duas clínicas.
4. Sair; no login, o novo usuário aparece; entrar com ele: o seletor de clínica abre e mostra COMN e ONCY, nada mais.
5. Entrar como **Comercial**: o menu não tem "Usuários"; abrindo `/usuarios` pelo endereço aparece "Só o Administrador gerencia usuários."
6. Como **Administrador**, "Restaurar demonstração" → "Cancelar": nada muda. De novo → "Apagar e restaurar": o usuário criado some, as clínicas voltam sem médicos e sem logos.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/usuarios/page.tsx" components/formularios.tsx components/estrutura.tsx
git commit -m "Tela Usuários com papéis, clínicas vinculadas e restauração da demonstração"
```

---

### Task 7: Roteiro completo e documentos do projeto

**Files:**
- Modify: `CLAUDE.md` (fora do git), `.claude/skills/modelo-dados-clinica/SKILL.md` (fora do git)

**Interfaces:**
- Consumes: tudo das Tasks 1 a 6.
- Produces: protótipo verificado ponta a ponta; documentos do projeto alinhados ao modelo novo.

- [ ] **Step 1: Roteiro da apresentação, do ponto zero**

Com `npm run dev` rodando, em http://localhost:3000:
1. Entrar como **Administrador** → Usuários → Restaurar demonstração → Apagar e restaurar.
2. Entrar como **Coordenador COMN**:
   - Clínicas → editar COMN → enviar uma logo → Salvar;
   - Especialidades → "+ Especialidade" → "Mastologia";
   - Convênios → "+ Convênio" → "Unimed", redes "Essencial, Flex", com logo;
   - Exames → "+ Exame" → "Ultrassonografia de mamas", 2 passos de preparo, cobertura Unimed Flex;
   - Especialidades → "+ Profissional" → "Dra. Teste", Mastologia, segunda e quarta das 08:00 às 12:00, Unimed Flex em consulta e exame, Unimed Essencial só exame, exame marcado.
3. Recarregar a página (F5) no meio do passo 2 e conferir que nada sumiu.
4. Entrar como **Recepção COMN** → Busca rápida → Unimed · Flex + Consulta: aparece a Dra. Teste. Trocar para Unimed · Essencial + Consulta: não aparece (só atende exame por essa rede). Abrir a página da médica: horários, convênios com logo, exame com preparo.
5. Entrar como **Recepção ONCY**: busca vazia, "Nenhum profissional cadastrado nesta clínica ainda."
6. Entrar como **Administrador** → Clínicas: 7 organizações; COMN com 1 médico, 1 convênio, 1 exame. Usuários → criar um usuário vinculado a COMN e ONCY.
7. Console do navegador sem erros vermelhos do app.

Se algum passo falhar, corrija antes de seguir, rode de novo `node lib/dados.check.mjs`, `npx tsc --noEmit` e `npm run build`, e faça commit da correção com uma mensagem que diga o que foi corrigido.

- [ ] **Step 2: Atualizar `CLAUDE.md`**

Troque estas duas linhas da seção "Regras":

```
- Dois perfis: `admin` (edita) e `leitura` (só vê). Toda rota de escrita checa o perfil no servidor.
- Usuário pode ser preso a uma clínica e a um setor (ex.: marcação COMN só vê médicos da COMN; marcação Oncology só os da Oncology). O servidor filtra por setor.
```

por:

```
- Quatro papéis: Administrador (vê e edita tudo, cria usuários), Comercial (vê e edita tudo, não cria usuários), Coordenador (edita só as clínicas vinculadas), Recepção/Central (só consulta as clínicas vinculadas). Toda escrita e toda leitura checam o papel e as clínicas do usuário no servidor; no protótipo isso fica em `lib/permissoes.ts` e `lib/repositorio.ts`.
- Organização (cliente do SaaS) agrupa clínicas; cada clínica tem os próprios médicos, convênios, especialidades e exames. Ex.: Clínica de Oncologia e Mastologia → COMN e ONCY.
```

Na linha que começa com `- **Telas da v1:**`, troque o conteúdo por:

```
- **Telas da v1:** login, seletor de clínica, busca rápida, especialidades → profissionais, página do profissional (procedimentos, dias e horários, observações, restrições), convênios com subtipos e logo, exames com preparo, Clínicas (organizações e clínicas, com logo) e Usuários. Especificação em `docs/superpowers/specs/2026-10-08-prototipo-multiclinica-design.md`.
```

Na seção "Stack", troque `por enquanto os dados são de exemplo, em memória (\`lib/dados.ts\`), e a checagem roda com \`node lib/dados.check.mjs\`` por `os dados ficam no navegador (\`localStorage\`, chave \`cartilha:v1\`) através de \`lib/repositorio.ts\`, que é o único ponto a trocar quando o banco for escolhido; a checagem roda com \`node lib/dados.check.mjs\``.

- [ ] **Step 3: Atualizar a skill `modelo-dados-clinica`**

Em `.claude/skills/modelo-dados-clinica/SKILL.md`, troque a seção `## Entidades` inteira até a linha de `usuario` (inclusive) por:

```
## Entidades
- `organizacao` (nome). Cliente do SaaS; agrupa clínicas.
- `clinica` (organizacao_id, nome, logo). Todas as entidades abaixo, menos `usuario`, pertencem a uma clínica (`clinica_id`).
- `especialidade` (nome, icone)
- `profissional` (nome, especialidade_id, ativo, observacoes, idade_minima)
- `horario_atendimento` (profissional_id, dia_semana, inicio, fim). Um intervalo por dia no protótipo.
- `profissional_exame` (N:N): exames que o profissional realiza.
- `procedimento` (nome) e `profissional_procedimento` (N:N). Ex.: nem todo dermatologista faz lobuloplastia.
- `convenio` (nome, cor, logo) → `subtipo_convenio` (convenio_id, nome). Ex.: Unimed → essencial, flex, rede fechada.
- `atendimento_convenio`: liga profissional a subtipo, com `tipo` = `consulta` | `exame` (um convênio pode atender exame e não consulta).
- `exame` (nome, instrucoes_preparo texto, documentos) e `exame_convenio` (exame_id, subtipo_id).
- `restricao` (profissional_id, subtipo_id opcional, texto). Ex.: "só 5 pacientes por dia", "só atende até X anos".
- `usuario` (nome, email, papel: administrador | comercial | coordenador | recepcao) e `usuario_clinica` (usuario_id, clinica_id). Administrador e Comercial não têm linha em `usuario_clinica`: veem todas.
```

E troque a linha `- O filtro por setor é feito no servidor em toda consulta de profissional (inclusive busca por id), nunca só na tela.` por:

```
- O filtro por clínica e papel é feito no servidor em toda leitura e gravação (inclusive busca por id), nunca só na tela. As regras estão em `lib/permissoes.ts`.
- Médico que atende em duas clínicas é cadastrado nas duas.
```

- [ ] **Step 4: Verificação final**

Run: `node lib/dados.check.mjs` → `ok`.
Run: `npx tsc --noEmit` → sem saída.
Run: `npm run build` → sem erro, com as rotas `/`, `/clinicas`, `/convenios`, `/especialidades`, `/exames`, `/login`, `/profissionais/[id]`, `/usuarios`.
Run: `git status --short` → vazio (os documentos atualizados estão no `.gitignore`).
