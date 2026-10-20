import type { Convenio, DadosClinica } from "./modelo.ts";
import { palavras, slug, unirAtendimento } from "./regras.ts";

export type Atendimento = "c" | "e" | "ce";

function dividir(linha: string, sep: string) {
  const celulas: string[] = [];
  let atual = "", aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"' && aspas && linha[i + 1] === '"') { atual += '"'; i++; }
    else if (ch === '"') aspas = !aspas;
    else if (ch === sep && !aspas) { celulas.push(atual); atual = ""; }
    else atual += ch;
  }
  celulas.push(atual);
  return celulas;
}

// aceita colagem do Excel (tab) e CSV com ; ou ,; `separadores` restringe quais valem (nome com vírgula não pode partir)
export function lerTabela(texto: string, separadores: string[] = ["\t", ";", ","]): string[][] {
  const linhas = texto.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const sep = separadores.find((s) => linhas.some((l) => l.includes(s))) ?? separadores[0];
  return linhas.map((l) => dividir(l, sep).map((c) => c.trim()));
}

// CSV do Excel pt-BR costuma vir em Windows-1252: tenta UTF-8 e, se não der, cai para ele; tira o BOM
export function decodificarCsv(bytes: ArrayBuffer | Uint8Array): string {
  let texto: string;
  try { texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { texto = new TextDecoder("windows-1252").decode(bytes); }
  return texto.replace(/^\uFEFF/, "");
}

const CABECALHOS = new Set(["rede", "plano", "produto", "medico", "profissional"]);
export function semCabecalho(linhas: string[][]): string[][] {
  return linhas.length && CABECALHOS.has(slug(linhas[0][0] ?? "")) ? linhas.slice(1) : linhas;
}

export function planejarRedes(c: Convenio, nomes: string[]) {
  const existentes: string[] = [], novas: string[] = [], repetidas: string[] = [];
  const conhecidas = new Set(c.subtipos.map((s) => slug(s.nome)));
  const vistas = new Set<string>();
  for (const nome of nomes.map((n) => n.trim()).filter(Boolean)) {
    const chave = slug(nome);
    if (vistas.has(chave)) repetidas.push(nome);
    else if (conhecidas.has(chave)) existentes.push(nome);
    else novas.push(nome);
    vistas.add(chave);
  }
  return { novas, existentes, repetidas };
}

function lerAtendimento(texto: string): Atendimento {
  const t = slug(texto);
  return t.startsWith("consulta") ? "c" : t.startsWith("exame") ? "e" : "ce";
}

// sem tolerância a erro de digitação: "Bruno" não pode ligar à Bruna; cada palavra da célula começa uma palavra do nome
const ehOMedico = (nome: string, celula: string) => {
  const ws = palavras(celula), ts = palavras(nome);
  return ws.length > 0 && ws.every((w) => ts.some((t) => t.startsWith(w)));
};

export function planejarRedesPorMedico(d: DadosClinica, linhas: string[][]) {
  const itens: { profissionalId: string; medico: string; nomePlanilha: string; rede: string; atendimento: Atendimento }[] = [];
  const semMedico: string[] = [];
  for (const [medico = "", rede = "", atendimento = ""] of linhas) {
    if (!medico || !rede) continue;
    const achados = d.profissionais.filter((p) => ehOMedico(p.nome, medico));
    if (achados.length !== 1) { if (!semMedico.includes(medico)) semMedico.push(medico); continue; }
    // mesmo médico + mesma rede repetidos na planilha: um vínculo só, unindo consulta e exame
    const igual = itens.find((i) => i.profissionalId === achados[0].id && slug(i.rede) === slug(rede));
    if (igual) { igual.atendimento = unirAtendimento(igual.atendimento, lerAtendimento(atendimento)); continue; }
    itens.push({ profissionalId: achados[0].id, medico: achados[0].nome, nomePlanilha: medico, rede, atendimento: lerAtendimento(atendimento) });
  }
  return { itens, semMedico };
}
