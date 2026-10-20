// Única porta de leitura e gravação dos dados. Hoje guarda um JSON no navegador;
// na v1 estas mesmas funções passam a chamar o servidor, e as checagens de permissão vão junto.
import { VERSAO, type Banco, type Clinica, type Convenio, type DadosClinica, type Especialidade, type Exame, type Organizacao, type Profissional, type Usuario } from "./modelo.ts";
import { podeCriarClinica, podeCriarUsuario, podeEditar, podeVer, podeVerInterno } from "./permissoes.ts";
import { pontoZero } from "./semente.ts";
import { juntarRedes, slug, unirAtendimento } from "./regras.ts";

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

export const CHAVE_BACKUP = "cartilha:backup";

const LISTAS = ["organizacoes", "clinicas", "usuarios", "especialidades", "convenios", "exames", "profissionais"] as const;

// Leva um banco guardado para a versão atual; null quando não reconhece o formato
export function migrar(b: unknown): Banco | null {
  if (!b || typeof b !== "object") return null;
  let banco = b as Banco;
  if (!LISTAS.every((l) => Array.isArray(banco[l]))) return null;
  // ficha sem as listas que as telas leem quebraria a busca: melhor recusar a cópia
  const listas = (x: object, campos: string[]) => campos.every((c) => Array.isArray((x as Record<string, unknown>)[c]));
  if (!banco.profissionais.every((p) => p && typeof p.atende === "object" && p.atende !== null && listas(p, ["horarios", "exames", "procedimentos", "restricoes"]))) return null;
  if (!banco.convenios.every((c) => c && listas(c, ["subtipos"]))) return null;
  if (!banco.exames.every((e) => e && listas(e, ["preparo", "subtipos"]))) return null;
  if (!banco.usuarios.every((u) => u && listas(u, ["clinicas"]))) return null;
  // versão 3 → 4: a central de atendimento ganha papel próprio
  if (banco.versao === 3) banco = { ...banco, versao: 4, usuarios: banco.usuarios.map((u) => u.id === "central-comn" && u.papel === "recepcao" ? { ...u, papel: "central" } : u) };

  // Atualiza ou preenche logos das unidades padrão; a unidade que virou "Nossa Clínica" acompanha a semente onde ainda tem o nome antigo
  const semente = pontoZero();
  const nomeAntigo = (x: { id: string; nome: string }) => x.id === "oncoclinicas-mossoro" && x.nome === "Oncoclínicas Mossoró";
  banco = {
    ...banco,
    organizacoes: banco.organizacoes.map((o) => (nomeAntigo(o) ? { ...o, nome: semente.organizacoes.find((so) => so.id === o.id)?.nome ?? o.nome } : o)),
    clinicas: banco.clinicas.map((c) => {
      const padrao = semente.clinicas.find((sc) => sc.id === c.id);
      if (padrao && nomeAntigo(c)) return { ...c, nome: padrao.nome, logo: padrao.logo };
      return !c.logo && padrao?.logo ? { ...c, logo: padrao.logo } : c;
    }),
    // pedido da clínica em 19/10/2026: a Dra. Teresa realiza a punção (PAAF); quem guardou a semente antiga recebe o vínculo
    profissionais: banco.profissionais.map((p) =>
      p.id === "prof-mvb3084bm53mj" && !p.exames.length && banco.exames.some((e) => e.id === "exame-mvb4hbf4v62pg") ? { ...p, exames: ["exame-mvb4hbf4v62pg"] } : p),
  };

  return banco.versao === VERSAO ? banco : null;
}

// Guarda uma cópia do que não dá para ler, sem repetir a mesma cópia; false quando não coube
function guardarCopia(bruto: string): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${CHAVE_BACKUP}:`) && localStorage.getItem(k) === bruto) return true;
    }
    localStorage.setItem(`${CHAVE_BACKUP}:${new Date().toISOString()}`, bruto);
    return true;
  } catch {
    return false;
  }
}

// protegido: há dados antigos que não puderam ser copiados; quem chama não deve gravar por cima
export function carregarProtegido(): { banco: Banco; protegido: boolean; copiaGuardada: boolean } {
  let bruto: string | null;
  try { bruto = localStorage.getItem(CHAVE); } catch { return { banco: pontoZero(), protegido: false, copiaGuardada: false }; }
  if (!bruto) return { banco: pontoZero(), protegido: false, copiaGuardada: false };
  try {
    const b = migrar(JSON.parse(bruto));
    if (b) return { banco: b, protegido: false, copiaGuardada: false };
  } catch {}
  // formato que esta versão não entende: guarda uma cópia antes de recomeçar, para não perder cadastro
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

export const carregar = (): Banco => carregarProtegido().banco;

export const exportarBackup = (b: Banco) => JSON.stringify(b, null, 2);

export function importarBackup(_b: Banco, u: Usuario, texto: string): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador restaura uma cópia.");
  let novo: Banco | null = null;
  try { novo = migrar(JSON.parse(texto)); } catch {}
  exigir(!!novo, "Esse arquivo não é uma cópia da cartilha.");
  return comAdministrador(novo!);
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

// Recepção recebe médicos e exames sem as observações internas
export function dadosDaClinica(b: Banco, clinicaId: string, u?: Usuario): DadosClinica {
  const tudo = !u || podeVerInterno(u);
  const semInterno = <T extends { observacoesInternas?: string }>({ observacoesInternas: _, ...resto }: T) => resto as T;
  const exames = b.exames.filter((x) => x.clinicaId === clinicaId);
  const profissionais = b.profissionais.filter((x) => x.clinicaId === clinicaId);
  return {
    especialidades: b.especialidades.filter((x) => x.clinicaId === clinicaId),
    convenios: b.convenios.filter((x) => x.clinicaId === clinicaId),
    exames: tudo ? exames : exames.map(semInterno),
    profissionais: tudo ? profissionais : profissionais.map(semInterno),
  };
}

// --- gravação: sempre confere a permissão antes ---

const carimbo = (u: Usuario) => ({ atualizadoEm: new Date().toISOString(), atualizadoPor: u.nome });

export function salvarProfissional(b: Banco, u: Usuario, p: Profissional): Banco {
  conferirClinica(u, p, b.profissionais.find((x) => x.id === p.id));
  for (const h of p.horarios) exigir(h.inicio < h.fim, `Horário de ${h.dia}: o início precisa ser antes do fim.`);
  return { ...b, profissionais: gravarEm(b.profissionais, { ...p, ...carimbo(u) }) };
}

export function salvarExame(b: Banco, u: Usuario, e: Exame): Banco {
  conferirClinica(u, e, b.exames.find((x) => x.id === e.id));
  return { ...b, exames: gravarEm(b.exames, { ...e, ...carimbo(u) }) };
}

export function salvarExameComProfissionais(b: Banco, u: Usuario, e: Exame, profsIds: string[]): Banco {
  conferirClinica(u, e, b.exames.find((x) => x.id === e.id));
  const examesAtualizados = gravarEm(b.exames, { ...e, ...carimbo(u) });
  const profissionaisAtualizados = b.profissionais.map((p) => {
    if (p.clinicaId !== e.clinicaId) return p;
    const selecionado = profsIds.includes(p.id);
    const jaPossui = p.exames.includes(e.id);
    if (selecionado && !jaPossui) {
      return { ...p, exames: [...p.exames, e.id] };
    }
    if (!selecionado && jaPossui) {
      return { ...p, exames: p.exames.filter((id) => id !== e.id) };
    }
    return p;
  });
  return { ...b, exames: examesAtualizados, profissionais: profissionaisAtualizados };
}

// rede que saiu do convênio não pode continuar marcada em médico nem em exame
function limparRedes(b: Banco, clinicaId: string, ids: Set<string>): Banco {
  if (!ids.size) return b;
  return {
    ...b,
    profissionais: b.profissionais.map((p) => p.clinicaId !== clinicaId ? p : {
      ...p,
      atende: Object.fromEntries(Object.entries(p.atende).filter(([id]) => !ids.has(id))),
      restricoes: p.restricoes.map((r) => r.subtipoId && ids.has(r.subtipoId) ? { texto: r.texto } : r),
    }),
    exames: b.exames.map((e) => e.clinicaId !== clinicaId ? e : { ...e, subtipos: e.subtipos.filter((id) => !ids.has(id)) }),
  };
}

export function salvarConvenio(b: Banco, u: Usuario, c: Convenio): Banco {
  const antes = b.convenios.find((x) => x.id === c.id);
  conferirClinica(u, c, antes);
  const ficam = new Set(c.subtipos.map((s) => s.id));
  const sairam = new Set((antes?.subtipos ?? []).map((s) => s.id).filter((id) => !ficam.has(id)));
  return limparRedes({ ...b, convenios: gravarEm(b.convenios, { ...c, ...carimbo(u) }) }, c.clinicaId, sairam);
}

export function salvarEspecialidade(b: Banco, u: Usuario, e: Especialidade): Banco {
  conferirClinica(u, e, b.especialidades.find((x) => x.id === e.id));
  const nome = e.nome.trim().toLowerCase();
  exigir(!b.especialidades.some((x) => x.id !== e.id && x.clinicaId === e.clinicaId && x.nome.trim().toLowerCase() === nome), `Já existe a especialidade ${e.nome.trim()} nesta clínica.`);
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

function comAdministrador(b: Banco): Banco {
  exigir(b.usuarios.some((x) => x.papel === "administrador"), "A cartilha precisa de pelo menos um Administrador.");
  return b;
}

export function salvarUsuario(b: Banco, u: Usuario, novo: Usuario): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador cria usuários.");
  const todas = novo.papel === "administrador" || novo.papel === "comercial";
  exigir(todas || novo.clinicas.length > 0, "Vincule pelo menos uma clínica.");
  const email = novo.email.trim().toLowerCase();
  exigir(!b.usuarios.some((x) => x.id !== novo.id && x.email.trim().toLowerCase() === email), "Já existe um usuário com este e-mail.");
  exigir(novo.id !== u.id || novo.papel === "administrador", "Você não pode tirar o seu próprio acesso de Administrador.");
  return comAdministrador({ ...b, usuarios: gravarEm(b.usuarios, todas ? { ...novo, clinicas: [] } : novo) });
}

// --- exclusão: acha o item, confere a clínica e devolve um banco novo ---

function achar<T extends { id: string; clinicaId: string }>(lista: T[], u: Usuario, id: string): T {
  const item = lista.find((x) => x.id === id);
  exigir(!!item, "Não encontrado.");
  conferirClinica(u, item!);
  return item!;
}

export function excluirProfissional(b: Banco, u: Usuario, id: string): Banco {
  achar(b.profissionais, u, id);
  return { ...b, profissionais: b.profissionais.filter((x) => x.id !== id) };
}

export function excluirExame(b: Banco, u: Usuario, id: string): Banco {
  achar(b.exames, u, id);
  return {
    ...b,
    exames: b.exames.filter((x) => x.id !== id),
    profissionais: b.profissionais.map((p) => p.exames.includes(id) ? { ...p, exames: p.exames.filter((e) => e !== id) } : p),
  };
}

export function excluirConvenio(b: Banco, u: Usuario, id: string): Banco {
  const c = achar(b.convenios, u, id);
  return limparRedes({ ...b, convenios: b.convenios.filter((x) => x.id !== id) }, c.clinicaId, new Set(c.subtipos.map((s) => s.id)));
}

export function excluirEspecialidade(b: Banco, u: Usuario, id: string): Banco {
  achar(b.especialidades, u, id);
  const n = b.profissionais.filter((p) => p.especialidadeId === id).length;
  exigir(n === 0, n === 1 ? "Mova o médico desta especialidade antes de excluir." : `Mova os ${n} médicos desta especialidade antes de excluir.`);
  return { ...b, especialidades: b.especialidades.filter((x) => x.id !== id) };
}

export function excluirUsuario(b: Banco, u: Usuario, id: string): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador exclui usuários.");
  exigir(id !== u.id, "Você não pode excluir o próprio usuário.");
  exigir(b.usuarios.some((x) => x.id === id), "Não encontrado.");
  return comAdministrador({ ...b, usuarios: b.usuarios.filter((x) => x.id !== id) });
}

export function restaurarDemonstracao(_b: Banco, u: Usuario): Banco {
  exigir(podeCriarUsuario(u), "Só o Administrador restaura a demonstração.");
  return pontoZero();
}

// --- importar redes de planilha ---

export function importarRedes(b: Banco, u: Usuario, convenioId: string, nomes: string[]): Banco {
  const c = achar(b.convenios, u, convenioId);
  return salvarConvenio(b, u, { ...c, subtipos: juntarRedes(c.id, c.subtipos, nomes) });
}

export function importarRedesPorMedico(b: Banco, u: Usuario, convenioId: string, todos: { profissionalId: string; rede: string; atendimento: "c" | "e" | "ce" }[]): Banco {
  const c = achar(b.convenios, u, convenioId);
  const itens = todos.filter((i) => slug(i.rede)); // nome vazio ou só de símbolos não vira rede
  const subtipos = juntarRedes(c.id, c.subtipos, itens.map((i) => i.rede));
  const idDe = (nome: string) => subtipos.find((s) => slug(s.nome) === slug(nome))?.id;
  const porMedico = new Map<string, Record<string, "c" | "e" | "ce">>();
  for (const i of itens) {
    const id = idDe(i.rede); // nome que o juntarRedes descarta (vazio, só símbolos) é ignorado
    if (!id) continue;
    const mapa = porMedico.get(i.profissionalId) ?? {};
    mapa[id] = unirAtendimento(mapa[id], i.atendimento);
    porMedico.set(i.profissionalId, mapa);
  }
  let novo = salvarConvenio(b, u, { ...c, subtipos });
  for (const [id, mapa] of porMedico) {
    const p = achar(novo.profissionais, u, id);
    exigir(p.clinicaId === c.clinicaId, "O médico é de outra clínica.");
    const unido = Object.fromEntries(Object.entries(mapa).map(([id, v]) => [id, unirAtendimento(p.atende[id] as "c" | "e" | "ce" | undefined, v)]));
    novo = salvarProfissional(novo, u, { ...p, atende: { ...p.atende, ...unido } });
  }
  return novo;
}
