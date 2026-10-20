import { DIAS, type Convenio, type DadosClinica, type GrupoPlano, type Horario, type Profissional, type Subtipo, type Tipo } from "./modelo.ts";

// A pergunta mais comum da central: "quem atende o convênio X para Y?"
export function atende(p: Profissional, subtipoId: string, tipo: Tipo) {
  return (p.atende[subtipoId] ?? "").includes(tipo === "consulta" ? "c" : "e");
}

// "c" + "e" → "ce"; sem o anterior, fica o novo
export const unirAtendimento = (a: "c" | "e" | "ce" | undefined, b: "c" | "e" | "ce"): "c" | "e" | "ce" =>
  !a || a === b ? b : "ce";

export function subtipoInfo(d: DadosClinica, subtipoId: string) {
  for (const convenio of d.convenios) {
    const subtipo = convenio.subtipos.find((s) => s.id === subtipoId);
    if (subtipo) return { convenio, subtipo };
  }
}

// ["Seg, Qua e Sex · 08:00–12:00"]; dias seguidos viram "Seg a Sex"
export function gruposHorarios(hs: Horario[]) {
  const pos = (d: string) => DIAS.indexOf(d as (typeof DIAS)[number]);
  const grupos = new Map<string, string[]>();
  for (const x of [...hs].sort((a, b) => pos(a.dia) - pos(b.dia))) {
    const k = `${x.inicio}–${x.fim}`;
    grupos.set(k, [...(grupos.get(k) ?? []), x.dia]);
  }
  const seguidos = (d: string[]) => d.length >= 3 && pos(d[d.length - 1]) - pos(d[0]) === d.length - 1;
  const lista = (d: string[]) =>
    seguidos(d) ? `${d[0]} a ${d[d.length - 1]}` : d.length > 1 ? `${d.slice(0, -1).join(", ")} e ${d[d.length - 1]}` : d[0];
  return [...grupos].map(([faixa, d]) => `${lista(d)} · ${faixa}`);
}

export function resumoHorarios(hs: Horario[]) {
  return hs.length ? gruposHorarios(hs).join("  |  ") : "Horários não informados";
}

export const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const slug = (t: string) => semAcento(t).trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

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
    || (w.length >= 6 && (umErro(w, t) || umErro(w, t.slice(0, w.length)))));

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
export const CORES = ["#0b7a69", "#2d6be0", "#d1344b", "#ea7a1a", "#7c3aed", "#0891b2", "#ca8a04", "#db2777"];
export const corDoIndice = (n: number) => CORES[n % CORES.length];

export function gruposPlanosDoConvenio(c: Convenio): GrupoPlano[] {
  if (c.gruposPlanos !== undefined) return c.gruposPlanos;
  const nomesSubtipos = c.subtipos.map((s) => s.nome);
  return [
    {
      status: "atende",
      titulo: "Atende consultas e exames",
      planos: nomesSubtipos,
    },
    {
      status: "somente_exames",
      titulo: "Somente exames",
      nota: "Não precisa de encaminhamento para a clínica",
      planos: [],
    },
    {
      status: "nao_atende",
      titulo: "Não atendemos",
      planos: [],
    },
  ];
}

export function observacoesDoConvenio(c: Convenio): string[] {
  if (c.observacoesGerais !== undefined) return c.observacoesGerais;
  return [];
}

// planos em "Não atendemos" que têm médico ou exame vinculado, e planos em "Somente exames" com médico de consulta
export function conflitosPlanos(c: Convenio, d: DadosClinica): string[] {
  const usadas = new Set([...d.profissionais.flatMap((p) => Object.keys(p.atende)), ...d.exames.flatMap((e) => e.subtipos)]);
  const comConsulta = new Set(c.subtipos.filter((s) => d.profissionais.some((p) => atende(p, s.id, "consulta"))).map((s) => slug(s.nome)));
  const nomesUsados = new Set(c.subtipos.filter((s) => usadas.has(s.id)).map((s) => slug(s.nome)));
  const grupos = c.gruposPlanos ?? [];
  return [...new Set([
    ...grupos.filter((g) => g.status === "nao_atende").flatMap((g) => g.planos).filter((p) => nomesUsados.has(slug(p))),
    ...grupos.filter((g) => g.status === "somente_exames").flatMap((g) => g.planos).filter((p) => comConsulta.has(slug(p))),
  ])];
}

// Por rede: quantos médicos atendem consulta, quantos atendem exame e quantos exames a rede cobre
export function resumoRedes(c: Convenio, d: DadosClinica) {
  return c.subtipos.map((subtipo) => ({
    subtipo,
    consultas: d.profissionais.filter((p) => atende(p, subtipo.id, "consulta")).length,
    exames: d.profissionais.filter((p) => atende(p, subtipo.id, "exame")).length,
    examesCobertos: d.exames.filter((e) => e.subtipos.includes(subtipo.id)).length,
  }));
}

// Redes do convênio ao salvar o formulário: as que ficaram (mesmo id), as novas da caixa e, só se
// o convênio nunca teve rede, os planos como ponto de partida.
export function montarRedes(convenioId: string, antes: Subtipo[], editadas: { id: string; nome: string }[], novas: string[], fallbackPlanos: string[]): { redes: Subtipo[] } | { erro: string } {
  const vistos = new Map<string, string>();
  const ficam: Subtipo[] = [];
  for (const r of editadas) {
    const nome = r.nome.trim().replace(/\s+/g, " ") || antes.find((s) => s.id === r.id)?.nome || r.nome;
    const chave = slug(nome);
    if (vistos.has(chave)) return { erro: `Duas redes com o mesmo nome: ${nome}. Mude uma delas.` };
    vistos.set(chave, nome);
    ficam.push({ id: r.id, nome });
  }
  const usarPlanos = !antes.length && !ficam.length && !novas.length;
  return { redes: juntarRedes(convenioId, ficam, usarPlanos ? fallbackPlanos : novas) };
}

export const DIAS_PARA_REVISAR = 90;

export function tempoDesde(iso: string, agora = new Date()): string {
  if (Number.isNaN(Date.parse(iso))) return "";
  const dias = Math.max(0, Math.floor((agora.getTime() - Date.parse(iso)) / 86400000));
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias <= 30) return `há ${dias} dias`;
  if (dias > 365) return "há mais de um ano";
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

// "humana gold" sugere a rede Gold como plano do paciente; "humana" sozinho não sugere nada
export function sugestoesDePlano(convenios: Convenio[], q: string, max = 3) {
  return coberturaDaBusca(convenios, () => true, q)
    .filter((r) => !combina(r.convenio.nome, q))
    .flatMap((r) => r.cobre.map((subtipo) => ({ convenio: r.convenio, subtipo })))
    .slice(0, max);
}

// Partes do texto para destacar: as palavras que começam com alguma palavra da busca
export function trechosDestaque(texto: string, q: string) {
  const ws = palavras(q);
  return texto.split(/([^A-Za-zÀ-ÿ0-9]+)/).filter(Boolean)
    .map((t) => ({ t, marca: ws.length > 0 && ws.some((w) => semAcento(t).startsWith(w)) }));
}

export type Recente = { tipo: "profissional" | "exame"; id: string };
export const lembrarRecente = (lista: Recente[], r: Recente, max = 8) =>
  [r, ...lista.filter((x) => x.tipo !== r.tipo || x.id !== r.id)].slice(0, max);

// O item cujo próprio nome mais combina com a busca, para mostrar acima das abas
export function resultadoPrincipal<T extends { nome: string }>(itens: T[], q: string): T | undefined {
  let melhor: T | undefined;
  let p = 0;
  for (const x of itens) {
    const n = pontuacao(x.nome, q);
    if (n > p) { p = n; melhor = x; }
  }
  return melhor;
}

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
    if (combina(nome, q)) continue; // a busca já acha: sugerir seria repetir o termo
    for (const t of palavras(nome)) {
      for (const w of ws) {
        const dist = distancia(w, t);
        if (dist <= 2 && (!melhor || dist < melhor.dist)) melhor = { nome, dist };
      }
    }
  }
  return melhor?.nome;
}

// Formata o que foi digitado como valor em Real ("250" -> "R$ 250,00", "1.500" -> "R$ 1.500,00").
// Texto que não é número volta como está, para a tela mostrar o que foi digitado.
export function formatarValor(v?: string): string {
  const s = (v ?? "").trim().replace(/^R\$\s*/i, "");
  if (!s) return "";
  if (!/^[\d.,]+$/.test(s)) return s;
  // com vírgula, o ponto é milhar; só pontos a cada 3 dígitos também é milhar; senão o ponto é decimal
  const n = parseFloat(
    s.includes(",") ? s.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "")
    : s,
  );
  if (isNaN(n)) return s;
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Só a parte numérica, para o campo de edição ("R$ 250,00" -> "250,00")
export function valorSemCifrao(v?: string): string {
  return formatarValor(v).replace(/^R\$\s*/i, "");
}
