"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo, useState } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { useStore, type Formulario } from "@/lib/store";
import { DIAS, type Convenio, type DadosClinica, type Exame, type GrupoPlano, type Horario, type Papel, type Profissional, type Restricao } from "@/lib/modelo";
import { combina, corDoIndice, formatarValor, gruposPlanosDoConvenio, juntarRedes, montarRedes, novoId, observacoesDoConvenio, slug, valorSemCifrao } from "@/lib/regras";
import { excluirConvenio, excluirEspecialidade, excluirExame, excluirProfissional, excluirUsuario, salvarClinica, salvarConvenio, salvarEspecialidade, salvarExame, salvarExameComProfissionais, salvarOrganizacao, salvarProfissional, salvarUsuario } from "@/lib/repositorio";
import { PAPEIS } from "@/lib/permissoes";
import { Botao, BotaoIcone, EnvioLogo, Gaveta, LogoMarca, SeletorConvenio, useFecharGaveta } from "./ui";
import { Desdobra } from "./movimento";

const FOCO = "outline-none transition placeholder:text-suave focus:border-tinta focus:ring-4 focus:ring-tinta/10";
export const campo = `h-12 w-full rounded-full border border-borda bg-superficie px-5 text-[15px] ${FOCO}`;
export const campoArea = `w-full rounded-3xl border border-borda bg-superficie px-5 py-3 text-[15px] ${FOCO}`;
const campoBusca = `h-10 w-full rounded-full border border-borda bg-superficie pl-10 pr-10 text-sm ${FOCO}`;
const campoHora = `h-10 rounded-full border border-borda bg-superficie px-4 text-sm tabular-nums ${FOCO}`;
// pílula selecionável (botão); `tom` é a cor quando ativa
const pilula = (ativo: boolean, tom = "bg-tinta text-white") =>
  `inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${ativo ? tom : "bg-superficie text-suave ring-1 ring-borda hover:bg-fundo hover:text-texto"}`;
// pílula de caixa de marcar: o <input className="peer sr-only"> vem antes deste <span>
const pilulaMarcar = "inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full bg-superficie px-3.5 py-1.5 text-sm font-semibold text-suave ring-1 ring-borda transition-colors hover:bg-fundo hover:text-texto peer-checked:bg-tinta peer-checked:text-white peer-checked:ring-tinta peer-checked:hover:bg-tinta peer-focus-visible:ring-4 peer-focus-visible:ring-tinta/20";
const linhas = (t: FormDataEntryValue | null) => String(t ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

// Seção do formulário: título pequeno em caixa alta e espaço generoso
function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="rotulo">{titulo}</h3>
      {children}
    </section>
  );
}

export function Campo({ rotulo, children, dica, grupo }: { rotulo: string; children: React.ReactNode; dica?: string; grupo?: boolean }) {
  const Tag = grupo ? "div" : "label";
  return (
    <Tag className="block" role={grupo ? "group" : undefined} aria-label={grupo ? rotulo : undefined}>
      <span className="mb-2 block text-sm font-semibold">{rotulo}</span>
      {children}
      {dica && <span className="mt-1.5 block text-xs text-suave">{dica}</span>}
    </Tag>
  );
}

// Campo de valor em Real: prefixo R$ fixo, só aceita dígitos, ponto e vírgula, e arruma ao sair do campo
export function InputMoeda({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [val, setVal] = useState(() => valorSemCifrao(defaultValue));
  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-5 text-sm font-bold text-mata">R$</span>
      <input name={name} value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d.,]/g, ""))}
        onBlur={() => setVal(valorSemCifrao(val))} inputMode="decimal" placeholder="0,00" className={`${campo} pl-12 font-medium`} />
    </div>
  );
}

// Dias e horários: um intervalo por dia, com campos nativos de hora
export function EditorHorarios({ valor }: { valor: Horario[] }) {
  return (
    <div className="space-y-2">
      {DIAS.map((dia) => {
        const h = valor.find((x) => x.dia === dia);
        return (
          <label key={dia} className="flex flex-wrap items-center gap-3">
            <input type="checkbox" name={`h:${dia}`} defaultChecked={!!h} className="peer sr-only" />
            <span className={`${pilulaMarcar} h-10 w-16 justify-center`}>{dia}</span>
            <span className="flex items-center gap-2 opacity-40 transition-opacity peer-checked:opacity-100">
              <input type="time" name={`h:${dia}:inicio`} defaultValue={h?.inicio ?? "08:00"} aria-label={`${dia}: início`} className={campoHora} />
              <span className="text-sm text-suave">até</span>
              <input type="time" name={`h:${dia}:fim`} defaultValue={h?.fim ?? "12:00"} aria-label={`${dia}: fim`} className={campoHora} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

export const lerHorarios = (f: FormData): Horario[] =>
  DIAS.filter((d) => f.get(`h:${d}`)).map((dia) => ({ dia, inicio: String(f.get(`h:${dia}:inicio`)), fim: String(f.get(`h:${dia}:fim`)) }));

// a Moldura avisa aqui no primeiro campo mexido; a Gaveta usa isso para pedir confirmação ao descartar
const MarcarAlterado = createContext<() => void>(() => {});

export function Formularios() {
  const { form, abrirForm } = useStore();
  // guarda o último formulário para a gaveta sair com conteúdo; `n` zera os campos a cada abertura
  const [ultimo, setUltimo] = useState<{ f: Formulario; n: number }>({ f: null, n: 0 });
  const [alterado, setAlterado] = useState(false);
  if (form && form !== ultimo.f) { setUltimo({ f: form, n: ultimo.n + 1 }); setAlterado(false); }
  const atual = form ?? ultimo.f;
  const k = ultimo.n;

  return (
    <Gaveta aberta={!!form} onFechar={() => abrirForm(null)} alterado={alterado} largura="max-w-2xl">
      <MarcarAlterado.Provider value={() => setAlterado(true)}>
      {atual?.tipo === "profissional" && <FormProfissional key={k} id={atual.id} />}
      {atual?.tipo === "especialidade" && <FormEspecialidade key={k} id={atual.id} />}
      {atual?.tipo === "convenio" && <FormConvenio key={k} id={atual.id} />}
      {atual?.tipo === "exame" && <FormExame key={k} id={atual.id} />}
      {atual?.tipo === "organizacao" && <FormOrganizacao key={k} />}
      {atual?.tipo === "clinica" && <FormClinica key={k} id={atual.id} />}
      {atual?.tipo === "usuario" && <FormUsuario key={k} id={atual.id} />}
      </MarcarAlterado.Provider>
    </Gaveta>
  );
}

// onExcluir (só ao editar): o rodapé pede a confirmação ali mesmo; quem chama exclui e fecha a gaveta
export function Moldura({ titulo, onSalvar, onExcluir, rotuloExcluir, children }: {
  titulo: string; onSalvar: (f: FormData) => void; onExcluir?: () => void; rotuloExcluir?: string; children: React.ReactNode;
}) {
  const fechar = useFecharGaveta();
  const marcar = useContext(MarcarAlterado);
  const [excluindo, setExcluindo] = useState(false);
  return (
    <form className="flex min-h-full flex-col" onInput={(e) => { if ((e.target as HTMLInputElement).name) marcar(); }}
      // Enter num campo não salva (ficha longa); no textarea continua quebrando linha
      onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault(); }}
      onSubmit={(e) => { e.preventDefault(); onSalvar(new FormData(e.currentTarget)); }}>
      <div className="p-6 pb-2 pr-16 sm:p-8 sm:pb-2 sm:pr-16">
        {/* editando: o rótulo diz a ação e o título é o nome do item; cadastrando: só o título */}
        {rotuloExcluir && <p className="rotulo mb-1">{titulo}</p>}
        <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{rotuloExcluir || titulo}</h2>
      </div>
      <div className="flex-1 space-y-10 p-6 sm:p-8">{children}</div>
      {excluindo && onExcluir ? (
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-borda bg-perigo-claro p-4 sm:rounded-b-[28px]">
          <p className="min-w-[14rem] flex-1 text-sm font-semibold text-perigo">Excluir {rotuloExcluir}? Some da cartilha para todos.</p>
          <Botao variante="secundario" onClick={() => setExcluindo(false)}>Cancelar</Botao>
          <Botao variante="perigo" onClick={onExcluir}>Excluir</Botao>
        </div>
      ) : (
        <div className="vidro sticky bottom-0 flex items-center justify-end gap-2 border-t border-borda p-4 sm:rounded-b-[28px]">
          {onExcluir && <Botao variante="perigo" onClick={() => setExcluindo(true)} className="mr-auto">Excluir</Botao>}
          <Botao variante="fantasma" onClick={fechar}>Cancelar</Botao>
          <Botao type="submit">Salvar</Botao>
        </div>
      )}
    </form>
  );
}

function MatrizConvenios({ dados, atende }: { dados: DadosClinica; atende: Record<string, string> }) {
  const marcar = useContext(MarcarAlterado);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "atendidos" | "nao_atendidos">("todos");
  const [estado, setEstado] = useState<Record<string, { c: boolean; e: boolean }>>(() => {
    const init: Record<string, { c: boolean; e: boolean }> = {};
    for (const c of dados.convenios) {
      for (const s of c.subtipos) {
        const val = atende[s.id] ?? "";
        init[s.id] = { c: val.includes("c"), e: val.includes("e") };
      }
    }
    return init;
  });

  const [expandidos, setExpandidos] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of dados.convenios) {
      init[c.id] = c.subtipos.some((s) => (atende[s.id] ?? "").length > 0);
    }
    return init;
  });

  const toggleCheck = (subId: string, tipo: "c" | "e") => {
    setEstado((ant) => ({
      ...ant,
      [subId]: {
        c: tipo === "c" ? !ant[subId]?.c : !!ant[subId]?.c,
        e: tipo === "e" ? !ant[subId]?.e : !!ant[subId]?.e,
      },
    }));
  };

  const marcarTodos = (c: Convenio, tipo: "c" | "e", valor: boolean) => {
    marcar();
    setEstado((ant) => {
      const prox = { ...ant };
      for (const s of c.subtipos) {
        prox[s.id] = {
          c: tipo === "c" ? valor : !!prox[s.id]?.c,
          e: tipo === "e" ? valor : !!prox[s.id]?.e,
        };
      }
      return prox;
    });
    if (valor) setExpandidos((ant) => ({ ...ant, [c.id]: true }));
  };

  const limparConvenio = (c: Convenio) => {
    marcar();
    setEstado((ant) => {
      const prox = { ...ant };
      for (const s of c.subtipos) {
        prox[s.id] = { c: false, e: false };
      }
      return prox;
    });
  };

  const toggleExpansao = (cId: string) => {
    setExpandidos((ant) => ({ ...ant, [cId]: !ant[cId] }));
  };

  const expandirTodos = () => {
    const prox: Record<string, boolean> = {};
    for (const c of dados.convenios) prox[c.id] = true;
    setExpandidos(prox);
  };

  const recolherTodos = () => {
    setExpandidos({});
  };

  const q = busca.trim();

  // Estatísticas gerais
  const totalSubtipos = dados.convenios.flatMap((c) => c.subtipos);
  const totalAtendidosC = totalSubtipos.filter((s) => estado[s.id]?.c).length;
  const totalAtendidosE = totalSubtipos.filter((s) => estado[s.id]?.e).length;

  const conveniosFiltrados = useMemo(() => {
    return dados.convenios.filter((c) => {
      const temAtendimento = c.subtipos.some((s) => estado[s.id]?.c || estado[s.id]?.e);
      if (filtro === "atendidos" && !temAtendimento) return false;
      if (filtro === "nao_atendidos" && temAtendimento) return false;

      if (!q) return true;
      return combina(`${c.nome} ${c.subtipos.map((s) => s.nome).join(" ")}`, q);
    });
  }, [dados.convenios, estado, filtro, q]);

  if (!dados.convenios.length) {
    return <p className="rounded-3xl border border-dashed border-borda px-5 py-4 text-sm text-suave">Nenhum convênio cadastrado.</p>;
  }

  // IDs dos convênios que NÃO estão visíveis na lista filtrada (para renderizar inputs ocultos e não perder seleção)
  const idsFiltrados = new Set(conveniosFiltrados.map((c) => c.id));
  const conveniosOcultos = dados.convenios.filter((c) => !idsFiltrados.has(c.id));

  return (
    <div className="space-y-3">
      {/* Inputs ocultos para convênios temporariamente fora do filtro de busca */}
      <div className="hidden" aria-hidden="true">
        {conveniosOcultos.flatMap((c) => c.subtipos).map((s) => (
          <span key={s.id}>
            {estado[s.id]?.c && <input type="checkbox" name={`c:${s.id}`} defaultChecked readOnly />}
            {estado[s.id]?.e && <input type="checkbox" name={`e:${s.id}`} defaultChecked readOnly />}
          </span>
        ))}
      </div>

      {/* Barra de Busca e Filtros Rápidos */}
      <div className="space-y-3 rounded-3xl border border-borda bg-fundo/40 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar convênio ou rede"
            aria-label="Buscar convênio ou rede"
            className={campoBusca}
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-suave hover:bg-fundo hover:text-texto" aria-label="Limpar busca">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className={pilula(filtro === "todos")}
            >
              Todos ({dados.convenios.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("atendidos")}
              className={pilula(filtro === "atendidos", "bg-mata text-white")}
            >
              Atendidos ({totalAtendidosC || totalAtendidosE ? dados.convenios.filter(c => c.subtipos.some(s => estado[s.id]?.c || estado[s.id]?.e)).length : 0})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("nao_atendidos")}
              className={pilula(filtro === "nao_atendidos", "bg-perigo text-white")}
            >
              Não atendidos
            </button>
          </div>

          <div className="flex items-center gap-2 font-semibold text-suave">
            <button type="button" onClick={expandirTodos} className="transition-colors hover:text-texto">
              Expandir todos
            </button>
            <span>·</span>
            <button type="button" onClick={recolherTodos} className="transition-colors hover:text-texto">
              Recolher
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Convênios */}
      <div className="max-h-[500px] space-y-2.5 overflow-y-auto pr-1">
        {conveniosFiltrados.length ? (
          conveniosFiltrados.map((c) => {
            const subIds = c.subtipos.map((s) => s.id);
            const qtdC = subIds.filter((id) => estado[id]?.c).length;
            const qtdE = subIds.filter((id) => estado[id]?.e).length;
            const aberto = !!expandidos[c.id];
            const temMarcado = qtdC > 0 || qtdE > 0;

            return (
              <div key={c.id} className="overflow-hidden rounded-3xl border border-borda bg-superficie">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-fundo/60 p-3 pl-4">
                  <button
                    type="button"
                    onClick={() => toggleExpansao(c.id)}
                    className="flex items-center gap-2.5 text-left text-sm font-semibold text-texto transition-colors hover:text-mata"
                  >
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <span>{c.nome}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${temMarcado ? "bg-mata-claro text-mata" : "bg-borda/40 text-suave"}`}>
                      {temMarcado ? `${qtdC} consult. · ${qtdE} exam.` : "Não atende"}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => marcarTodos(c, "c", qtdC !== c.subtipos.length)}
                      className={`${pilula(qtdC === c.subtipos.length, "bg-mata text-white")} h-8`}
                      title="Marcar todas as redes em Consulta"
                    >
                      {qtdC === c.subtipos.length ? "✓ Consultas" : "+ Consultas"}
                    </button>
                    <button
                      type="button"
                      onClick={() => marcarTodos(c, "e", qtdE !== c.subtipos.length)}
                      className={`${pilula(qtdE === c.subtipos.length, "bg-acento text-white")} h-8`}
                      title="Marcar todas as redes em Exame"
                    >
                      {qtdE === c.subtipos.length ? "✓ Exames" : "+ Exames"}
                    </button>
                    {temMarcado && (
                      <button
                        type="button"
                        onClick={() => limparConvenio(c)}
                        className="h-8 rounded-full px-3 text-xs font-semibold text-suave transition-colors hover:bg-perigo-claro hover:text-perigo"
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpansao(c.id)}
                      aria-label={aberto ? "Recolher redes" : "Expandir redes"}
                      className="grid size-8 place-items-center rounded-full text-suave transition-colors hover:bg-borda/40 hover:text-texto"
                    >
                      <ChevronDown className={`size-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* fechado, o corpo sai do DOM: as marcas continuam no FormData por estes campos ocultos */}
                {!aberto && (
                  <div className="hidden" aria-hidden="true">
                    {c.subtipos.map((s) => (
                      <span key={s.id}>
                        {estado[s.id]?.c && <input type="checkbox" name={`c:${s.id}`} defaultChecked readOnly />}
                        {estado[s.id]?.e && <input type="checkbox" name={`e:${s.id}`} defaultChecked readOnly />}
                      </span>
                    ))}
                  </div>
                )}
                <Desdobra aberto={aberto}>
                  <div className="divide-y divide-borda/40 border-t border-borda/60 bg-superficie">
                    <div className="grid grid-cols-[1fr_80px_80px] bg-fundo/40 px-4 py-2 text-xs font-semibold text-suave">
                      <span>Rede / Plano</span>
                      <span className="text-center">Consulta</span>
                      <span className="text-center">Exame</span>
                    </div>
                    {c.subtipos.map((s) => {
                      const checkC = !!estado[s.id]?.c;
                      const checkE = !!estado[s.id]?.e;
                      return (
                        <div key={s.id} className="grid grid-cols-[1fr_80px_80px] items-center px-4 py-2 transition-colors hover:bg-fundo/30">
                          <span className="text-sm font-medium text-texto">{s.nome}</span>
                          <span className="grid place-items-center">
                            <input type="checkbox" name={`c:${s.id}`} checked={checkC} onChange={() => toggleCheck(s.id, "c")}
                              aria-label={`${s.nome}: consulta`} className="size-5 cursor-pointer accent-mata" />
                          </span>
                          <span className="grid place-items-center">
                            <input type="checkbox" name={`e:${s.id}`} checked={checkE} onChange={() => toggleCheck(s.id, "e")}
                              aria-label={`${s.nome}: exame`} className="size-5 cursor-pointer accent-acento" />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Desdobra>
              </div>
            );
          })
        ) : (
          <p className="rounded-3xl border border-dashed border-borda py-5 text-center text-xs text-suave">
            Nenhum convênio encontrado para &quot;{busca}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}

function FormProfissional({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, avisar } = useStore();
  const router = useRouter();
  const p = dados.profissionais.find((x) => x.id === id);
  const [restricoes, setRestricoes] = useState<Restricao[]>(p?.restricoes ?? []);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome", true);
    if (!dados.especialidades.length) return avisar("Cadastre uma especialidade antes.", true);
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
      valor: formatarValor(String(f.get("valor") ?? "")) || undefined,
      procedimentos: String(f.get("procedimentos")).split(",").map((x) => x.trim()).filter(Boolean),
      exames: dados.exames.filter((e) => f.get(`ex:${e.id}`)).map((e) => e.id),
      atende,
      restricoes: restricoes.map(({ texto, subtipoId }) => (subtipoId ? { texto: texto.trim(), subtipoId } : { texto: texto.trim() })).filter((r) => r.texto),
      observacoes: String(f.get("observacoes")).trim(),
      observacoesInternas: String(f.get("observacoesInternas") ?? "").trim() || undefined,
    };
    if (!executar((b, u) => salvarProfissional(b, u, novo), p ? "Ficha atualizada" : "Profissional cadastrado")) return;
    abrirForm(null);
    router.push(`/profissionais/${novo.id}`);
  };

  return (
    <Moldura titulo={p ? "Editar profissional" : "Novo profissional"} onSalvar={salvar}
      onExcluir={p && (() => {
        if (!executar((b, u) => excluirProfissional(b, u, p.id), `${p.nome} excluído`, { desfazer: true, desfeito: "Exclusão desfeita" })) return;
        abrirForm(null);
        router.push("/especialidades");
      })} rotuloExcluir={p?.nome}>
      <Bloco titulo="Dados">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome"><input name="nome" required defaultValue={p?.nome} placeholder="Dra. Nome Sobrenome" className={campo} /></Campo>
          <Campo rotulo="Especialidade" dica={dados.especialidades.length ? undefined : "Cadastre uma especialidade antes."}>
            <select name="especialidade" defaultValue={p?.especialidadeId} className={campo}>
              {dados.especialidades.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Idade mínima do paciente"><input name="idade" type="number" min={0} defaultValue={p?.idadeMinima} placeholder="Sem limite" className={campo} /></Campo>
          <Campo rotulo="Valor particular" dica="Só o valor da consulta sem convênio.">
            <InputMoeda name="valor" defaultValue={p?.valor} />
          </Campo>
        </div>
      </Bloco>
      <Bloco titulo="Dias e horários de atendimento">
        <EditorHorarios valor={p?.horarios ?? []} />
      </Bloco>
      <Bloco titulo="Convênios atendidos">
        <Campo rotulo="Marque consulta e exame por rede" grupo>
          <MatrizConvenios dados={dados} atende={p?.atende ?? {}} />
        </Campo>
      </Bloco>
      <Bloco titulo="Procedimentos e exames">
        <Campo rotulo="Procedimentos que realiza" dica="Separe por vírgula.">
          <input name="procedimentos" defaultValue={p?.procedimentos.join(", ")} placeholder="Lobuloplastia, Biópsia de pele" className={campo} />
        </Campo>
        <Campo rotulo="Exames que realiza" grupo>
          <SeletorExamesProfissional dados={dados} examesIniciais={p?.exames ?? []} />
        </Campo>
      </Bloco>
      <Bloco titulo="Restrições">
        <EditorRestricoes dados={dados} valor={restricoes} onChange={setRestricoes} />
      </Bloco>
      <Bloco titulo="Observações">
        <Campo rotulo="Observações">
          <textarea name="observacoes" rows={3} defaultValue={p?.observacoes} className={campoArea} />
        </Campo>
        <Campo rotulo="Observações internas" dica="A recepção não vê. Só central, coordenação e gestão.">
          <textarea name="observacoesInternas" rows={3} defaultValue={p?.observacoesInternas} className={campoArea} />
        </Campo>
      </Bloco>
    </Moldura>
  );
}

// Cada restrição vale para tudo ou só para uma rede
function EditorRestricoes({ dados, valor, onChange }: { dados: DadosClinica; valor: Restricao[]; onChange: (r: Restricao[]) => void }) {
  const marcar = useContext(MarcarAlterado);
  const mudar = (k: number, r: Partial<Restricao>) => onChange(valor.map((x, i) => (i === k ? { ...x, ...r } : x)));
  return (
    <div className="space-y-3">
      {valor.map((r, k) => (
        <div key={k} className="space-y-3 rounded-3xl border border-borda p-4">
          <div className="flex items-center gap-2">
            <input name={`restricao:${k}`} value={r.texto} onChange={(e) => mudar(k, { texto: e.target.value })}
              placeholder="Ex.: não atende gestantes" aria-label={`Restrição ${k + 1}`} className={campo} />
            <BotaoIcone rotulo={`Remover restrição ${k + 1}`} onClick={() => { marcar(); onChange(valor.filter((_, i) => i !== k)); }}>
              <X />
            </BotaoIcone>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-suave">Vale só para a rede…</span>
            <div className="min-w-[220px] flex-1">
              <SeletorConvenio dados={dados} valor={r.subtipoId ?? ""} onChange={(v) => { marcar(); mudar(k, { subtipoId: v || undefined }); }} />
            </div>
          </div>
        </div>
      ))}
      <Botao variante="secundario" tamanho="sm" onClick={() => { marcar(); onChange([...valor, { texto: "" }]); }}><Plus />Acrescentar restrição</Botao>
    </div>
  );
}

function SeletorExamesProfissional({
  dados,
  examesIniciais,
}: {
  dados: DadosClinica;
  examesIniciais: string[];
}) {
  const marcar = useContext(MarcarAlterado);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(examesIniciais));
  const [filtro, setFiltro] = useState<"todos" | "selecionados">("todos");

  const q = busca.trim();

  const toggle = (id: string) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      if (prox.has(id)) prox.delete(id);
      else prox.add(id);
      return prox;
    });
  };

  const selecionarTodosFiltrados = (lista: Exame[]) => {
    marcar();
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const e of lista) prox.add(e.id);
      return prox;
    });
  };

  const desmarcarTodosFiltrados = (lista: Exame[]) => {
    marcar();
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const e of lista) prox.delete(e.id);
      return prox;
    });
  };

  const examesFiltrados = useMemo(() => {
    return dados.exames.filter((e) => {
      if (filtro === "selecionados" && !selecionados.has(e.id)) return false;
      if (!q) return true;
      return combina(e.nome, q);
    });
  }, [dados.exames, selecionados, filtro, q]);

  if (!dados.exames.length) {
    return <p className="text-sm text-suave">Nenhum exame cadastrado na clínica.</p>;
  }

  const idsVisiveis = new Set(examesFiltrados.map((e) => e.id));
  const examesOcultos = dados.exames.filter((e) => !idsVisiveis.has(e.id));

  return (
    <div className="space-y-3 rounded-3xl border border-borda bg-fundo/40 p-4">
      {/* Inputs ocultos para itens fora do filtro atual preservarem o valor no FormData */}
      <div className="hidden" aria-hidden="true">
        {examesOcultos.map((e) => (
          selecionados.has(e.id) ? <input key={e.id} type="checkbox" name={`ex:${e.id}`} defaultChecked readOnly /> : null
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar exame pelo nome..."
            className={campoBusca}
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-suave hover:bg-fundo hover:text-texto" aria-label="Limpar busca">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFiltro("todos")}
            className={pilula(filtro === "todos")}
          >
            Todos ({dados.exames.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltro("selecionados")}
            className={pilula(filtro === "selecionados", "bg-acento text-white")}
          >
            Selecionados ({selecionados.size})
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-suave">
        <span>{selecionados.size} de {dados.exames.length} exames vinculados</span>
        <div className="flex items-center gap-2 font-semibold">
          <button
            type="button"
            onClick={() => selecionarTodosFiltrados(examesFiltrados)}
            className="font-semibold text-acento-escuro hover:underline"
          >
            + Marcar visíveis
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => desmarcarTodosFiltrados(examesFiltrados)}
            className="hover:text-perigo"
          >
            Desmarcar visíveis
          </button>
        </div>
      </div>

      <div className="max-h-48 space-y-1 overflow-y-auto rounded-3xl border border-borda/60 bg-superficie p-2 pr-1.5">
        {examesFiltrados.length ? (
          examesFiltrados.map((e) => {
            const marcado = selecionados.has(e.id);
            return (
              <label
                key={e.id}
                className={`flex cursor-pointer select-none items-center justify-between gap-2 rounded-full px-3.5 py-2 text-sm transition-colors ${
                  marcado ? "bg-acento-claro font-semibold text-acento-escuro" : "text-texto hover:bg-fundo"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    name={`ex:${e.id}`}
                    checked={marcado}
                    onChange={() => toggle(e.id)}
                    className="size-4 cursor-pointer accent-acento"
                  />
                  <span className="truncate">{e.nome}</span>
                </div>
                {e.valor && <span className="text-xs font-normal text-suave">{e.valor}</span>}
              </label>
            );
          })
        ) : (
          <p className="py-2 text-center text-xs text-suave">Nenhum exame encontrado para &quot;{busca}&quot;.</p>
        )}
      </div>
    </div>
  );
}

function SeletorConveniosExame({
  dados,
  selecionadosIniciais,
}: {
  dados: DadosClinica;
  selecionadosIniciais: string[];
}) {
  const marcar = useContext(MarcarAlterado);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "selecionados">("todos");
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(selecionadosIniciais));
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of dados.convenios) {
      init[c.id] = c.subtipos.some((s) => selecionadosIniciais.includes(s.id));
    }
    return init;
  });

  const q = busca.trim();

  const toggleSub = (subId: string) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      if (prox.has(subId)) prox.delete(subId);
      else prox.add(subId);
      return prox;
    });
  };

  const selecionarTodosDoConvenio = (c: Convenio) => {
    marcar();
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const s of c.subtipos) prox.add(s.id);
      return prox;
    });
    setExpandidos((ant) => ({ ...ant, [c.id]: true }));
  };

  const desmarcarTodosDoConvenio = (c: Convenio) => {
    marcar();
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const s of c.subtipos) prox.delete(s.id);
      return prox;
    });
  };

  const toggleExpansao = (cId: string) => {
    setExpandidos((ant) => ({ ...ant, [cId]: !ant[cId] }));
  };

  const conveniosFiltrados = useMemo(() => {
    return dados.convenios.filter((c) => {
      const marcados = c.subtipos.filter((s) => selecionados.has(s.id)).length;
      if (filtro === "selecionados" && marcados === 0) return false;
      if (!q) return true;
      return combina(`${c.nome} ${c.subtipos.map((s) => s.nome).join(" ")}`, q);
    });
  }, [dados.convenios, selecionados, filtro, q]);

  if (!dados.convenios.length) {
    return <p className="text-sm text-suave">Nenhum convênio cadastrado nesta clínica.</p>;
  }

  // IDs dos convênios fora da busca atual para manter os inputs no FormData
  const idsVisiveis = new Set(conveniosFiltrados.map((c) => c.id));
  const conveniosOcultos = dados.convenios.filter((c) => !idsVisiveis.has(c.id));

  return (
    <div className="space-y-3">
      {/* Inputs ocultos para preservar seleção fora do filtro */}
      <div className="hidden" aria-hidden="true">
        {conveniosOcultos.flatMap((c) => c.subtipos).map((s) => (
          selecionados.has(s.id) ? <input key={s.id} type="checkbox" name={`s:${s.id}`} defaultChecked readOnly /> : null
        ))}
      </div>

      {/* Barra de busca e filtros */}
      <div className="space-y-3 rounded-3xl border border-borda bg-fundo/40 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar convênio ou rede"
            className={campoBusca}
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-suave hover:bg-fundo hover:text-texto" aria-label="Limpar busca">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFiltro("todos")}
              className={pilula(filtro === "todos")}
            >
              Todos ({dados.convenios.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro("selecionados")}
              className={pilula(filtro === "selecionados", "bg-acento text-white")}
            >
              Com cobertura ({dados.convenios.filter((c) => c.subtipos.some((s) => selecionados.has(s.id))).length})
            </button>
          </div>
          <span className="font-semibold text-suave">
            {selecionados.size} redes selecionadas
          </span>
        </div>
      </div>

      <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
        {conveniosFiltrados.length ? (
          conveniosFiltrados.map((c) => {
            const marcados = c.subtipos.filter((s) => selecionados.has(s.id)).length;
            const todosMarcados = marcados === c.subtipos.length && c.subtipos.length > 0;
            const aberto = !!expandidos[c.id] || (!!q && marcados > 0);

            return (
              <div key={c.id} className="overflow-hidden rounded-3xl border border-borda bg-superficie">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-fundo/60 p-3 pl-4">
                  <button
                    type="button"
                    onClick={() => toggleExpansao(c.id)}
                    className="flex items-center gap-2.5 text-left text-sm font-semibold text-texto transition-colors hover:text-acento-escuro"
                  >
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <span>{c.nome}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${marcados > 0 ? "bg-acento-claro text-acento-escuro" : "bg-borda/40 text-suave"}`}>
                      {todosMarcados ? `Todas (${c.subtipos.length})` : `${marcados} de ${c.subtipos.length} redes`}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => selecionarTodosDoConvenio(c)}
                      className={`${pilula(todosMarcados, "bg-acento text-white")} h-8`}
                    >
                      {todosMarcados ? "✓ Todas" : "+ Todas"}
                    </button>
                    {marcados > 0 && (
                      <button
                        type="button"
                        onClick={() => desmarcarTodosDoConvenio(c)}
                        className="h-8 rounded-full px-3 text-xs font-semibold text-suave transition-colors hover:bg-perigo-claro hover:text-perigo"
                      >
                        Nenhuma
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleExpansao(c.id)}
                      aria-label={aberto ? "Recolher redes" : "Expandir redes"}
                      className="grid size-8 place-items-center rounded-full text-suave transition-colors hover:bg-borda/40 hover:text-texto"
                    >
                      <ChevronDown className={`size-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {!aberto && (
                  <div className="hidden" aria-hidden="true">
                    {c.subtipos.map((s) => (selecionados.has(s.id) ? <input key={s.id} type="checkbox" name={`s:${s.id}`} defaultChecked readOnly /> : null))}
                  </div>
                )}
                <Desdobra aberto={aberto}>
                  <div className="border-t border-borda/60 bg-superficie p-4">
                    {c.subtipos.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {c.subtipos.map((s) => (
                          <label key={s.id} className="relative">
                            <input type="checkbox" name={`s:${s.id}`} checked={selecionados.has(s.id)} onChange={() => toggleSub(s.id)} className="peer sr-only" />
                            <span className={pilulaMarcar}>{s.nome}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-suave">Nenhuma rede cadastrada para este convênio.</p>
                    )}
                  </div>
                </Desdobra>
              </div>
            );
          })
        ) : (
          <p className="rounded-3xl border border-dashed border-borda py-5 text-center text-xs text-suave">
            Nenhum convênio encontrado para &quot;{busca}&quot;.
          </p>
        )}
      </div>
    </div>
  );
}

function SeletorProfissionaisExame({ dados, exameId }: { dados: DadosClinica; exameId?: string }) {
  const marcar = useContext(MarcarAlterado);
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(() => {
    if (!exameId) return new Set();
    return new Set(dados.profissionais.filter((p) => p.exames.includes(exameId)).map((p) => p.id));
  });

  const q = busca.trim();

  const filtrados = useMemo(() => {
    return dados.profissionais.filter((p) => {
      if (!q) return true;
      const espNome = dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome ?? "";
      return combina(`${p.nome} ${espNome}`, q);
    });
  }, [dados.profissionais, dados.especialidades, q]);

  const toggle = (id: string) => {
    setSelecionados((ant) => {
      const prox = new Set(ant);
      if (prox.has(id)) prox.delete(id);
      else prox.add(id);
      return prox;
    });
  };

  const selecionarTodos = () => {
    marcar();
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const p of filtrados) prox.add(p.id);
      return prox;
    });
  };

  const desmarcarTodos = () => {
    marcar();
    setSelecionados((ant) => {
      const prox = new Set(ant);
      for (const p of filtrados) prox.delete(p.id);
      return prox;
    });
  };

  if (!dados.profissionais.length) {
    return <p className="text-sm text-suave">Nenhum profissional cadastrado na clínica.</p>;
  }

  // Preserva os profissionais marcados fora do filtro no FormData
  const idsVisiveis = new Set(filtrados.map((p) => p.id));
  const profsOcultos = dados.profissionais.filter((p) => !idsVisiveis.has(p.id));

  return (
    <div className="space-y-3 rounded-3xl border border-borda bg-superficie p-4">
      <div className="hidden" aria-hidden="true">
        {profsOcultos.map((p) => (
          selecionados.has(p.id) ? <input key={p.id} type="checkbox" name={`prof:${p.id}`} defaultChecked readOnly /> : null
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por médico ou especialidade..."
            className={campoBusca}
          />
          {busca && (
            <button type="button" onClick={() => setBusca("")} className="absolute right-3 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-suave hover:bg-fundo hover:text-texto" aria-label="Limpar busca">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={selecionarTodos}
            className="h-8 rounded-full px-3 text-mata transition-colors hover:bg-mata-claro"
          >
            + Marcar todos
          </button>
          <button
            type="button"
            onClick={desmarcarTodos}
            className="h-8 rounded-full px-3 text-suave transition-colors hover:bg-perigo-claro hover:text-perigo"
          >
            Limpar
          </button>
          <span className="rounded-full bg-mata-claro px-2.5 py-1 text-mata">
            {selecionados.size} de {dados.profissionais.length} vinculados
          </span>
        </div>
      </div>

      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
        {filtrados.length ? (
          filtrados.map((p) => {
            const espNome = dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;
            const marcado = selecionados.has(p.id);
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer select-none items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 transition-colors ${
                  marcado ? "border-mata/40 bg-mata-claro/40" : "border-borda/60 bg-fundo/40 hover:bg-fundo"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    name={`prof:${p.id}`}
                    checked={marcado}
                    onChange={() => toggle(p.id)}
                    className="size-4 cursor-pointer accent-mata"
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-texto">{p.nome}</span>
                    {espNome && <span className="block text-xs text-suave">{espNome}</span>}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${marcado ? "bg-mata-claro text-mata" : "text-suave"}`}>
                  {marcado ? "Realiza" : "Não realiza"}
                </span>
              </label>
            );
          })
        ) : (
          <p className="py-3 text-center text-xs text-suave">Nenhum médico encontrado para &quot;{busca}&quot;.</p>
        )}
      </div>
    </div>
  );
}

function FormExame({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, abrir, avisar } = useStore();
  const ex = dados.exames.find((x) => x.id === id);

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome do exame", true);
    if (!clinica) return;
    const novo: Exame = {
      id: ex?.id ?? novoId("exame"),
      clinicaId: clinica.id,
      nome,
      preparo: linhas(f.get("preparo")),
      valor: formatarValor(String(f.get("valor") ?? "")),
      observacoes: String(f.get("observacoes") ?? "").trim(),
      documentos: String(f.get("documentos") ?? "").trim() || undefined,
      observacoesInternas: String(f.get("observacoesInternas") ?? "").trim() || undefined,
      subtipos: dados.convenios.flatMap((c) => c.subtipos).filter((s) => f.get(`s:${s.id}`)).map((s) => s.id),
    };
    const profsIds = dados.profissionais.filter((p) => f.get(`prof:${p.id}`)).map((p) => p.id);
    if (!executar((b, u) => salvarExameComProfissionais(b, u, novo, profsIds), ex ? "Exame atualizado" : "Exame cadastrado")) return;
    abrirForm(null);
    abrir({ tipo: "exame", id: novo.id });
  };

  return (
    <Moldura titulo={ex ? "Editar exame" : "Novo exame"} onSalvar={salvar}
      onExcluir={ex && (() => {
        if (!executar((b, u) => excluirExame(b, u, ex.id), `${ex.nome} excluído`, { desfazer: true, desfeito: "Exclusão desfeita" })) return;
        abrirForm(null);
        abrir(null);
      })} rotuloExcluir={ex?.nome}>
      <Bloco titulo="Dados">
        <Campo rotulo="Nome do exame"><input name="nome" required defaultValue={ex?.nome} className={campo} /></Campo>
        <Campo rotulo="Preparo" dica="Um passo por linha. Inclua o que o paciente deve trazer no dia.">
          <textarea name="preparo" rows={5} defaultValue={ex?.preparo.join("\n")} placeholder={"Jejum de 4 horas\nTrazer exames anteriores e pedido médico"} className={campoArea} />
        </Campo>
        <Campo rotulo="Documentos necessários" dica="O que o paciente precisa trazer além do preparo, ex.: pedido médico e carteirinha.">
          <input name="documentos" defaultValue={ex?.documentos} className={campo} />
        </Campo>
        <Campo rotulo="Valor particular" dica="Só o valor sem convênio. O que o convênio paga fica com o faturamento.">
          <InputMoeda name="valor" defaultValue={ex?.valor} />
        </Campo>
      </Bloco>
      <Bloco titulo="Observações">
        <Campo rotulo="Observações" dica="Avisos para a central, ex.: só às terças, agendar com 7 dias de antecedência.">
          <textarea name="observacoes" rows={3} defaultValue={ex?.observacoes} className={campoArea} />
        </Campo>
        <Campo rotulo="Observações internas" dica="A recepção não vê. Só central, coordenação e gestão.">
          <textarea name="observacoesInternas" rows={3} defaultValue={ex?.observacoesInternas} className={campoArea} />
        </Campo>
      </Bloco>
      <Bloco titulo="Profissionais que realizam este exame">
        <SeletorProfissionaisExame dados={dados} exameId={ex?.id} />
      </Bloco>
      <Bloco titulo="Convênios e redes que cobrem">
        <SeletorConveniosExame dados={dados} selecionadosIniciais={ex?.subtipos ?? []} />
      </Bloco>
    </Moldura>
  );
}

function FormEspecialidade({ id }: { id?: string }) {
  const { dados, clinica, executar, abrirForm, avisar } = useStore();
  const esp = dados.especialidades.find((x) => x.id === id);
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome", true);
    if (!clinica) return;
    const nova = { id: esp?.id ?? novoId("esp"), clinicaId: clinica.id, nome, icone: esp?.icone ?? "Stethoscope" };
    if (executar((b, u) => salvarEspecialidade(b, u, nova), esp ? "Especialidade atualizada" : "Especialidade cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo={esp ? "Editar especialidade" : "Nova especialidade"} onSalvar={salvar}
      onExcluir={esp && (() => { if (executar((b, u) => excluirEspecialidade(b, u, esp.id), `${esp.nome} excluída`, { desfazer: true, desfeito: "Exclusão desfeita" })) abrirForm(null); })}
      rotuloExcluir={esp?.nome}>
      <Campo rotulo="Nome"><input name="nome" required defaultValue={esp?.nome} placeholder="Ex.: Mastologia" className={campo} /></Campo>
    </Moldura>
  );
}

function FormConvenio({ id }: { id?: string }) {
  const marcar = useContext(MarcarAlterado);
  const { dados, clinica, executar, abrirForm, avisar } = useStore();
  const c = dados.convenios.find((x) => x.id === id);
  const [logo, setLogo] = useState(c?.logo);
  const [nomeAtual, setNomeAtual] = useState(c?.nome ?? "");
  const [convId] = useState(() => c?.id ?? novoId("conv"));
  const [redes, setRedes] = useState(c?.subtipos ?? []);
  const [novasRedes, setNovasRedes] = useState("");
  const [removendo, setRemovendo] = useState<string | null>(null);
  const linhasNovas = novasRedes.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
  const qtdNovas = juntarRedes(convId, redes, linhasNovas).length - redes.length;
  const usoDaRede = (rid: string) => ({
    medicos: dados.profissionais.filter((p) => p.atende[rid]).length,
    exames: dados.exames.filter((e) => e.subtipos.includes(rid)).length,
  });

  const grupos = c ? gruposPlanosDoConvenio(c) : [];
  const gAtende = grupos.find((g) => g.status === "atende");
  const gSomente = grupos.find((g) => g.status === "somente_exames");
  const gNao = grupos.find((g) => g.status === "nao_atende");
  const obsIniciais = c ? observacoesDoConvenio(c) : [];

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome do convênio", true);
    if (!clinica) return;

    const planosAtende = String(f.get("planosAtende") ?? "")
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const planosSomente = String(f.get("planosSomente") ?? "")
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);
    const notaSomente = String(f.get("notaSomente") ?? "").trim();

    const planosNao = String(f.get("planosNao") ?? "")
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);

    const observacoes = String(f.get("observacoes") ?? "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    // redes que ficaram mantêm o id (com o nome editado); as novas ganham id a partir da caixa
    const editadas = redes.map((r) => ({ id: r.id, nome: String(f.get(`rede:${r.id}`) ?? r.nome) }));
    const nomesCaixa = String(f.get("novasRedes") ?? "").split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
    const montadas = montarRedes(convId, c?.subtipos ?? [], editadas, nomesCaixa, Array.from(new Set([...planosAtende, ...planosSomente])));
    if ("erro" in montadas) return avisar(montadas.erro, true);
    const subtipos = montadas.redes;

    const novosGrupos: GrupoPlano[] = [
      { status: "atende", titulo: "Atende consultas e exames", planos: planosAtende },
      { status: "somente_exames", titulo: "Somente exames", nota: notaSomente || undefined, planos: planosSomente },
      { status: "nao_atende", titulo: "Não atendemos", planos: planosNao },
    ];

    const novo: Convenio = {
      id: convId,
      clinicaId: clinica.id,
      nome,
      cor: c?.cor ?? corDoIndice(dados.convenios.length),
      logo,
      subtipos,
      gruposPlanos: novosGrupos,
      observacoesGerais: observacoes,
    };
    if (executar((b, u) => salvarConvenio(b, u, novo), c ? "Convênio atualizado" : "Convênio cadastrado")) abrirForm(null);
  };
  return (
    <Moldura titulo={c ? "Editar convênio" : "Novo convênio"} onSalvar={salvar}
      onExcluir={c && (() => { if (executar((b, u) => excluirConvenio(b, u, c.id), `${c.nome} excluído`, { desfazer: true, desfeito: "Exclusão desfeita" })) abrirForm(null); })}
      rotuloExcluir={c?.nome}>
      <EnvioLogo nome={nomeAtual} cor={c?.cor ?? corDoIndice(dados.convenios.length)} valor={logo} onChange={(l) => { marcar(); setLogo(l); }} />
      <Campo rotulo="Nome do convênio">
        <input name="nome" required defaultValue={c?.nome} onChange={(e) => setNomeAtual(e.target.value)} placeholder="Ex.: Unimed" className={campo} />
      </Campo>

      <Bloco titulo="Regras de atendimento e planos da carteirinha">

        <Campo rotulo="Atende consultas e exames" dica="Separe por vírgula ou cole a coluna da planilha (um por linha).">
          <textarea
            name="planosAtende"
            rows={2}
            defaultValue={gAtende?.planos.join(", ") ?? ""}
            placeholder="Ex.: Essencial, Prime, Select, Quality"
            className={campoArea}
          />
        </Campo>

        <div className="space-y-4">
          <Campo rotulo="Somente exames" dica="Separe por vírgula ou cole a coluna da planilha (um por linha).">
            <textarea
              name="planosSomente"
              rows={2}
              defaultValue={gSomente?.planos.join(", ") ?? ""}
              placeholder="Ex.: Preferencial, Fácil, Prático, Pleno"
              className={campoArea}
            />
          </Campo>
          <Campo rotulo="Aviso / Restrição para somente exames" dica="Exibido em destaque amarelo para a recepção.">
            <input
              name="notaSomente"
              defaultValue={gSomente?.nota ?? "Não precisa de encaminhamento para a clínica"}
              placeholder="Ex.: Não precisa de encaminhamento para a clínica"
              className={campo}
            />
          </Campo>
        </div>

        <Campo rotulo="Não atendemos" dica="Planos que a clínica recusa. Vírgula ou um por linha.">
          <textarea
            name="planosNao"
            rows={2}
            defaultValue={gNao?.planos.join(", ") ?? ""}
            placeholder="Ex.: Life, Ser, Dental"
            className={campoArea}
          />
        </Campo>

        <Campo rotulo="Observações gerais operacionais" dica="Uma por linha. Exibidas com ícone de alerta.">
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={obsIniciais.join("\n")}
            placeholder={"Procedimentos ginecológicos não precisam de pacote\nBiópsia: apenas autorização do procedimento\nDocumentação por e-mail de autorização"}
            className={campoArea}
          />
        </Campo>

      </Bloco>
      <Bloco titulo="Redes (usadas nos médicos e exames)">
        <div className="space-y-3">
          {redes.length === 0 && !c?.subtipos.length && <p className="text-xs text-suave">Nenhuma rede ainda. Em convênio novo, se deixar vazio, usa os planos acima.</p>}
          {redes.map((r) => {
            const uso = usoDaRede(r.id);
            return (
              <div key={r.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <input name={`rede:${r.id}`} defaultValue={r.nome} aria-label={`Nome da rede ${r.nome}`} className={campo} />
                  <BotaoIcone rotulo={`Remover rede ${r.nome}`}
                    onClick={() => {
                      if (uso.medicos || uso.exames) setRemovendo(r.id);
                      else { marcar(); setRedes(redes.filter((x) => x.id !== r.id)); }
                    }}>
                    <X />
                  </BotaoIcone>
                </div>
                <Desdobra aberto={removendo === r.id} className="-m-1 p-1">
                  <div className="flex flex-wrap items-center gap-2 rounded-3xl bg-sol-claro px-4 py-3 text-sm text-sol-escuro">
                    <span className="flex-1 font-semibold">{r.nome} está marcada em {uso.medicos} {uso.medicos === 1 ? "médico" : "médicos"} e {uso.exames} {uso.exames === 1 ? "exame" : "exames"}. Remover mesmo assim?</span>
                    <Botao variante="secundario" tamanho="sm" onClick={() => setRemovendo(null)}>Manter</Botao>
                    <Botao tamanho="sm" onClick={() => { marcar(); setRemovendo(null); setRedes(redes.filter((x) => x.id !== r.id)); }}>Remover</Botao>
                  </div>
                </Desdobra>
              </div>
            );
          })}
          <Campo rotulo="Acrescentar redes" dica="Vírgula ou uma por linha; aceita colar a coluna da planilha.">
            <textarea name="novasRedes" rows={2} value={novasRedes} onChange={(e) => setNovasRedes(e.target.value)} className={campo} />
          </Campo>
          <Desdobra aberto={linhasNovas.length > 0}>
            <p className="text-xs text-suave">
              {qtdNovas} {qtdNovas === 1 ? "rede nova" : "redes novas"}; {linhasNovas.length - qtdNovas} já {linhasNovas.length - qtdNovas === 1 ? "existe" : "existem"}.
            </p>
          </Desdobra>
        </div>
      </Bloco>
    </Moldura>
  );
}

function FormOrganizacao() {
  const { executar, abrirForm, avisar } = useStore();
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome da organização", true);
    if (executar((b, u) => salvarOrganizacao(b, u, { id: novoId("org"), nome }), "Organização cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo="Nova organização" onSalvar={salvar}>
      <Campo rotulo="Nome da organização"><input name="nome" required placeholder="Ex.: Clínica de Oncologia e Mastologia" className={campo} /></Campo>
    </Moldura>
  );
}

function FormClinica({ id }: { id?: string }) {
  const marcar = useContext(MarcarAlterado);
  const { banco, executar, abrirForm, avisar } = useStore();
  const c = banco.clinicas.find((x) => x.id === id);
  const [logo, setLogo] = useState(c?.logo);
  const [nomeAtual, setNomeAtual] = useState(c?.nome ?? "");
  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    if (!nome) return avisar("Informe o nome da clínica", true);
    const organizacaoId = c?.organizacaoId ?? String(f.get("organizacao"));
    const nova = { id: c?.id ?? novoId("clinica"), organizacaoId, nome, logo };
    if (executar((b, u) => salvarClinica(b, u, nova), c ? "Clínica atualizada" : "Clínica cadastrada")) abrirForm(null);
  };
  return (
    <Moldura titulo={c ? "Editar clínica" : "Nova clínica"} onSalvar={salvar}>
      <EnvioLogo nome={nomeAtual} valor={logo} onChange={(l) => { marcar(); setLogo(l); }} />
      {!c && (
        <Campo rotulo="Organização">
          <select name="organizacao" className={campo}>
            {banco.organizacoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </Campo>
      )}
      <Campo rotulo="Nome da clínica">
        <input name="nome" required defaultValue={c?.nome} onChange={(e) => setNomeAtual(e.target.value)} placeholder="Ex.: COMN" className={campo} />
      </Campo>
    </Moldura>
  );
}

function FormUsuario({ id }: { id?: string }) {
  const { banco, executar, abrirForm, avisar } = useStore();
  const us = banco.usuarios.find((x) => x.id === id);
  const [papel, setPapel] = useState<Papel>(us?.papel ?? "recepcao");
  const todas = papel === "administrador" || papel === "comercial";

  const salvar = (f: FormData) => {
    const nome = String(f.get("nome")).trim();
    const email = String(f.get("email")).trim();
    if (!nome || !email) return avisar("Informe nome e e-mail", true);
    const clinicas = todas ? [] : banco.clinicas.filter((c) => f.get(`cl:${c.id}`)).map((c) => c.id);
    // a regra "pelo menos uma clínica" é conferida no repositório
    if (executar((b, u) => salvarUsuario(b, u, { id: us?.id ?? novoId("usuario"), nome, email, papel, clinicas }), us ? "Usuário atualizado" : "Usuário cadastrado")) abrirForm(null);
  };

  return (
    <Moldura titulo={us ? "Editar usuário" : "Novo usuário"} onSalvar={salvar}
      onExcluir={us && (() => { if (executar((b, u) => excluirUsuario(b, u, us.id), `${us.nome} excluído`, { desfazer: true, desfeito: "Exclusão desfeita" })) abrirForm(null); })}
      rotuloExcluir={us?.nome}>
      <Bloco titulo="Dados">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome"><input name="nome" required defaultValue={us?.nome} placeholder="Ex.: Recepção COMN tarde" className={campo} /></Campo>
          <Campo rotulo="E-mail"><input name="email" type="email" defaultValue={us?.email} placeholder="nome@clinica.com.br" className={campo} /></Campo>
        </div>
      </Bloco>
      <Bloco titulo="Papel">
        <fieldset>
          <legend className="sr-only">Papel</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(PAPEIS) as Papel[]).map((p) => (
              <label key={p} className="pressionavel flex cursor-pointer gap-3 rounded-3xl border border-borda px-4 py-3 transition-colors hover:bg-fundo has-[:checked]:border-tinta has-[:checked]:bg-fundo has-[:checked]:ring-1 has-[:checked]:ring-tinta">
                <input type="radio" name="papel" checked={papel === p} onChange={() => setPapel(p)} className="mt-1 size-4 accent-tinta" />
                <span>
                  <span className="block text-sm font-semibold">{PAPEIS[p].rotulo}</span>
                  <span className="block text-xs text-suave">{PAPEIS[p].descricao}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Bloco>
      <Bloco titulo="Clínicas vinculadas">
        <Desdobra aberto={todas} className="-m-1 p-1">
          <p className="rounded-3xl bg-fundo px-5 py-3 text-sm text-suave">{PAPEIS[papel].rotulo} acessa todas as clínicas.</p>
        </Desdobra>
        <Desdobra aberto={!todas} className="-m-1 p-1">
          <fieldset>
            <legend className="sr-only">Clínicas vinculadas</legend>
            <div className="space-y-4">
              {banco.organizacoes.map((o) => {
                const daOrg = banco.clinicas.filter((c) => c.organizacaoId === o.id);
                return daOrg.length > 0 && (
                  <div key={o.id}>
                    <p className="rotulo mb-2">{o.nome}</p>
                    <div className="flex flex-wrap gap-2">
                      {daOrg.map((c) => (
                        <label key={c.id} className="relative">
                          <input type="checkbox" name={`cl:${c.id}`} defaultChecked={us?.clinicas.includes(c.id)} className="peer sr-only" />
                          <span className={pilulaMarcar}>{c.nome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        </Desdobra>
      </Bloco>
    </Moldura>
  );
}
