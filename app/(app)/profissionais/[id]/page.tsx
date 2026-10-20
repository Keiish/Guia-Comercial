"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, ClipboardList, Clock, Copy, FlaskConical, NotebookPen, Pencil, ShieldCheck, TriangleAlert, UserX, Wallet, X } from "lucide-react";
import { useItemDeOutraUnidade, useStore } from "@/lib/store";
import { DIAS, type DadosClinica, type Profissional } from "@/lib/modelo";
import { atende, coberturaDaBusca, combina, gruposHorarios, subtipoInfo } from "@/lib/regras";
import { salvarProfissional } from "@/lib/repositorio";
import { Atualizado, Avatar, Botao, Chip, Filtro, Icone, LogoMarca, ObservacaoInterna, Secao, TituloContexto, Vazio, iconeDaEspecialidade, useHoje } from "@/components/ui";
import { EditorHorarios, lerHorarios } from "@/components/formularios";
import { Desdobra, Entrada, Item, Lista } from "@/components/movimento";

const pilulaVoltar = "pressionavel mb-5 inline-flex h-8 items-center gap-1.5 rounded-full bg-superficie/70 pl-2 pr-3 text-xs font-bold text-suave ring-1 ring-borda hover:text-texto";

export default function PaginaProfissional() {
  const { id } = useParams<{ id: string }>();
  const { dados } = useStore();
  const { semAcesso, trocando } = useItemDeOutraUnidade("profissionais", id);
  const p = dados.profissionais.find((x) => x.id === id);
  // a ficha só monta com o médico carregado (ela usa hooks depois da leitura)
  if (!p && trocando) return null;
  if (!p) {
    return (
      <Entrada className="space-y-4">
        <Vazio icone={<UserX />} texto={semAcesso ? "Você não tem acesso a esta unidade." : "Profissional não encontrado."} />
        <Link href="/busca" className={pilulaVoltar}><ArrowLeft className="size-3.5" />Voltar para a busca</Link>
      </Entrada>
    );
  }
  return <Ficha p={p} />;
}

function Ficha({ p }: { p: Profissional }) {
  const router = useRouter();
  const { dados, podeEditarAtual, abrir, abrirForm, executar, avisar, plano } = useStore();
  const [editando, setEditando] = useState<"horarios" | "obs" | null>(null);
  const hoje = useHoje();
  // nome do médico sobe para a barra quando a página rola
  const registrarTitulo = useContext(TituloContexto);
  useEffect(() => { registrarTitulo(p.nome); return () => registrarTitulo(null); }, [p.nome, registrarTitulo]);
  // a pergunta da ligação: este médico atende o plano do paciente?
  const infoPlano = plano ? subtipoInfo(dados, plano.subtipoId) : undefined;
  const atendePlano = !!plano && atende(p, plano.subtipoId, plano.tipo);
  const restricoesDoPlano = plano ? p.restricoes.filter((r) => r.subtipoId === plano.subtipoId) : [];

  const esp = dados.especialidades.find((e) => e.id === p.especialidadeId);
  const admin = podeEditarAtual; // pode editar esta clínica
  const salvar = (mudanca: Partial<Profissional>, msg: string) => {
    if (executar((b, u) => salvarProfissional(b, u, { ...p, ...mudanca }), msg)) setEditando(null);
  };
  // nunca inclui observações internas
  const copiar = async () => {
    const texto = [
      p.nome,
      esp?.nome,
      p.valor ? `Valor particular: ${p.valor}` : "",
      p.horarios.length ? `Horários:\n${gruposHorarios(p.horarios).join("\n")}` : "",
      p.restricoes.length ? `Restrições:\n${p.restricoes.map((r) => `- ${r.texto}`).join("\n")}` : "",
      p.observacoes ? `Observações: ${p.observacoes}` : "",
      p.procedimentos.length ? `Procedimentos: ${p.procedimentos.join(", ")}` : "",
    ].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(texto); avisar("Ficha copiada"); } catch { avisar("Não foi possível copiar", true); }
  };
  const atendeHoje = hoje && p.horarios.find((h) => h.dia === hoje);

  return (
    <div>
      <Entrada className="mb-8">
        <button onClick={() => (history.length > 1 ? history.back() : router.push("/busca"))} className={pilulaVoltar}>
          <ArrowLeft className="size-3.5" />Voltar
        </button>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div className="flex min-w-0 items-center gap-5">
            <Avatar nome={p.nome} tamanho="xl" />
            <div className="min-w-0">
              <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[40px]">{p.nome}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {esp && <Chip tom="mata"><Icone nome={iconeDaEspecialidade(esp)} className="size-3.5" />{esp.nome}</Chip>}
                {p.idadeMinima && <Chip>A partir de {p.idadeMinima} anos</Chip>}
                {hoje && (atendeHoje
                  ? <Chip tom="mata"><span className="pulso size-1.5 rounded-full bg-mata" />Atende hoje · {atendeHoje.inicio}–{atendeHoje.fim}</Chip>
                  : <Chip>Não atende hoje</Chip>)}
                <Atualizado em={p.atualizadoEm} por={p.atualizadoPor} />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Botao onClick={copiar}><Copy />Copiar ficha</Botao>
            {admin && <Botao variante="secundario" onClick={() => abrirForm({ tipo: "profissional", id: p.id })}><Pencil />Editar</Botao>}
          </div>
        </div>
      </Entrada>

      {/* resposta da ligação: cartão sólido, verde quando atende e laranja quando não */}
      {plano && infoPlano && (
        <Entrada i={1} className="mb-6">
          <div className={`${atendePlano ? "cartao-mata" : "gradiente-acento rounded-[24px] text-white"} p-6 sm:p-8`}>
            <div className="flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white/20 [&>svg]:size-7">{atendePlano ? <Check /> : <X />}</span>
              <div className="min-w-0">
                <p className="rotulo opacity-80">Plano do paciente</p>
                <p className="text-2xl font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
                  {atendePlano ? "Atende" : "Não atende"} {infoPlano.convenio.nome} · {infoPlano.subtipo.nome}
                  <span className="opacity-80"> para {plano.tipo === "consulta" ? "consulta" : "exame"}</span>
                </p>
              </div>
            </div>
            {restricoesDoPlano.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {restricoesDoPlano.map((r, k) => <Chip key={k} tom="sol" solido><TriangleAlert className="shrink-0" />{r.texto}</Chip>)}
              </div>
            )}
          </div>
        </Entrada>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <Lista className="space-y-6">
          {p.restricoes.length > 0 && (
            <Item className="cartao-sol p-5 text-tinta sm:p-6">
              <Secao titulo="Restrições" icone={<TriangleAlert />}>
                <ul className="space-y-2">
                  {p.restricoes.map((r, k) => {
                    const info = r.subtipoId ? subtipoInfo(dados, r.subtipoId) : undefined;
                    return (
                      <li key={k} className="flex gap-3 rounded-2xl bg-white/50 px-4 py-3 text-[15px] font-medium">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <span>{r.texto}{info && <span className="ml-1 opacity-70">· {info.convenio.nome} · {info.subtipo.nome}</span>}</span>
                      </li>
                    );
                  })}
                </ul>
              </Secao>
            </Item>
          )}

          <Item className="cartao p-5 sm:p-6">
            <Secao titulo="Consulta de convênios" icone={<ShieldCheck />}>
              <ChecadorConveniosProfissional dados={dados} p={p} />
            </Secao>
          </Item>

          <Item className="cartao p-5 sm:p-6">
            <Secao titulo="Procedimentos" icone={<ClipboardList />}>
              {p.procedimentos.length
                ? <div className="flex flex-wrap gap-2">{p.procedimentos.map((x) => <Chip key={x}>{x}</Chip>)}</div>
                : <Vazio icone={<ClipboardList />} texto="Nenhum procedimento cadastrado." />}
            </Secao>
          </Item>

          <Item className="cartao p-5 sm:p-6">
            <Secao titulo="Exames realizados" icone={<FlaskConical />}>
              <SecaoExamesProfissional examesIds={p.exames} dados={dados} abrirExame={(eid) => abrir({ tipo: "exame", id: eid })} />
            </Secao>
          </Item>
        </Lista>

        <Lista className="space-y-6 lg:sticky lg:top-24">
          {/* só quando cadastrado: a maioria dos médicos fica sem valor por um bom tempo */}
          {p.valor && (
            <Item className="cartao p-5 sm:p-6">
              <Secao titulo="Valor particular" icone={<Wallet />}>
                <p className="numero text-[44px] leading-none text-texto">{p.valor}</p>
              </Secao>
            </Item>
          )}

          <Item className="cartao p-5 sm:p-6">
            <Secao titulo="Horários" icone={<Clock />}
              acao={admin && editando !== "horarios" && <Botao variante="fantasma" tamanho="sm" onClick={() => setEditando("horarios")}><Pencil />Editar</Botao>}>
              {editando === "horarios" ? (
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); salvar({ horarios: lerHorarios(new FormData(e.currentTarget)) }, "Horários atualizados"); }}>
                  <EditorHorarios valor={p.horarios} />
                  <Acoes onCancelar={() => setEditando(null)} />
                </form>
              ) : (
                <ul className="space-y-1.5">
                  {DIAS.map((dia) => {
                    const h = p.horarios.find((x) => x.dia === dia);
                    const eHoje = dia === hoje;
                    return (
                      <li key={dia} className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 ${eHoje && h ? "bg-mata text-white" : h ? "bg-mata-claro" : "bg-fundo/80"}`}>
                        <span className={`font-semibold ${h ? "" : "text-suave"}`}>
                          {dia}{eHoje && <span className="ml-2 text-xs font-medium opacity-80">hoje</span>}
                        </span>
                        {h
                          ? <span className={`text-sm font-semibold tabular-nums ${eHoje ? "" : "text-mata"}`}>{h.inicio} – {h.fim}</span>
                          : <span className="text-sm text-suave">Não atende</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Secao>
          </Item>

          {/* sem observação e sem permissão para escrever, o cartão não tem o que mostrar */}
          {(admin || p.observacoes || p.observacoesInternas) && (
            <Item className="cartao p-5 sm:p-6">
              <Secao titulo="Observações" icone={<NotebookPen />}
                acao={admin && editando !== "obs" && <Botao variante="fantasma" tamanho="sm" onClick={() => setEditando("obs")}><Pencil />Editar</Botao>}>
                {editando === "obs" ? (
                  <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); salvar({ observacoes: String(new FormData(e.currentTarget).get("obs")).trim() }, "Observações salvas"); }}>
                    <textarea name="obs" rows={6} autoFocus defaultValue={p.observacoes} placeholder="Encaixes, preferências do médico"
                      className="w-full rounded-2xl border border-borda bg-superficie px-4 py-3 text-[15px] leading-relaxed outline-none transition focus:border-tinta focus:ring-4 focus:ring-tinta/10" />
                    <Acoes onCancelar={() => setEditando(null)} />
                  </form>
                ) : p.observacoes ? (
                  <p className="whitespace-pre-line text-[15px] leading-relaxed">{p.observacoes}</p>
                ) : (
                  <Vazio icone={<NotebookPen />} texto="Nenhuma observação." />
                )}
                {editando !== "obs" && <div className="mt-3"><ObservacaoInterna texto={p.observacoesInternas} /></div>}
              </Secao>
            </Item>
          )}
        </Lista>
      </div>
    </div>
  );
}

function Acoes({ onCancelar }: { onCancelar: () => void }) {
  return (
    <div className="flex justify-end gap-2">
      <Botao variante="secundario" onClick={onCancelar}>Cancelar</Botao>
      <Botao type="submit">Salvar</Botao>
    </div>
  );
}

function ChecadorConveniosProfissional({ dados, p }: { dados: DadosClinica; p: Profissional }) {
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  const conveniosAtendidos = useMemo(() => {
    return dados.convenios
      .map((c) => ({
        c,
        subs: c.subtipos.filter((s) => p.atende[s.id]),
      }))
      .filter((x) => x.subs.length > 0);
  }, [dados.convenios, p.atende]);

  const totalRedes = conveniosAtendidos.reduce((acc, curr) => acc + curr.subs.length, 0);
  const q = busca.trim();

  // Sem seletor Consulta/Exame nesta tela: a rede cobre quando atende consulta ou exame
  const resultadoBusca = useMemo(
    () => (q ? coberturaDaBusca(dados.convenios, (s) => (p.atende[s.id] ?? "") !== "", q) : null),
    [dados.convenios, p.atende, q],
  );

  if (!dados.convenios.length) {
    return <Vazio icone={<ShieldCheck />} texto="Nenhum convênio cadastrado nesta unidade." />;
  }

  if (!conveniosAtendidos.length) {
    return (
      <div className="rounded-3xl border border-dashed border-borda p-6 text-center">
        <p className="text-sm font-semibold text-texto">Atendimento exclusivamente particular</p>
        <p className="mt-1 text-xs text-suave">Este profissional não atende convênios nesta unidade.</p>
        {p.valor && (
          <p className="mt-2 text-sm font-bold text-mata">Valor da consulta: {p.valor}</p>
        )}
      </div>
    );
  }

  const formatContagem = () => {
    const convStr = `${conveniosAtendidos.length} ${conveniosAtendidos.length === 1 ? "convênio" : "convênios"}`;
    const redeStr = `${totalRedes} ${totalRedes === 1 ? "rede" : "redes"}`;
    return `${convStr} · ${redeStr}`;
  };

  return (
    <div className="space-y-3">
      <Filtro valor={busca} onChange={setBusca} placeholder={`Buscar convênio ou plano do paciente (${formatContagem()})`} />

      {/* RESULTADO DA BUSCA ATIVA */}
      {busca && resultadoBusca ? (
        <div className="space-y-2.5 pt-1">
          {resultadoBusca.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-borda p-4 text-center">
              <p className="text-sm text-suave">Nenhum convênio ou plano encontrado com &ldquo;{busca}&rdquo;.</p>
            </div>
          ) : (
            <>
              {/* Convênios que o médico atende */}
              {resultadoBusca.filter((r) => r.cobre.length).map(({ convenio: c, cobre: subs, naoCobre }) => {
                const restricoesConvenio = p.restricoes.filter((r) =>
                  r.subtipoId ? c.subtipos.some((s) => s.id === r.subtipoId) : false
                );

                return (
                  <div key={c.id} className="overflow-hidden rounded-3xl bg-superficie ring-1 ring-mata/30">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-mata-claro/50 px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                        <span className="text-sm font-bold text-texto">{c.nome}</span>
                        <Chip tom="mata" solido>Atende</Chip>
                      </div>
                      <span className="text-xs font-medium text-mata">
                        {subs.length} {subs.length === 1 ? "rede encontrada" : "redes encontradas"}
                      </span>
                    </div>

                    {restricoesConvenio.length > 0 && (
                      <div className="flex items-center gap-2 bg-sol-claro px-4 py-2 text-xs text-tinta">
                        <TriangleAlert className="size-3.5 shrink-0" />
                        <span>Aviso deste profissional para {c.nome}: {restricoesConvenio.map((r) => r.texto).join(" | ")}</span>
                      </div>
                    )}

                    <div className="divide-y divide-borda/40 px-4">
                      {subs.map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                          <span className="font-medium text-texto">{s.nome}</span>
                          <span className="flex items-center gap-1.5">
                            {p.atende[s.id]?.includes("c") && <Chip tom="mata"><Check />Consulta</Chip>}
                            {p.atende[s.id]?.includes("e") && <Chip tom="acento"><Check />Exame</Chip>}
                          </span>
                        </div>
                      ))}
                    </div>
                    {naoCobre.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 border-t border-borda/60 bg-fundo/50 px-4 py-2.5">
                        {naoCobre.map((s) => (
                          <Chip key={s.id} tom="sol">
                            {s.nome} · não atende
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Convênios da clínica que este médico NÃO atende */}
              {resultadoBusca.filter((r) => !r.cobre.length).map(({ convenio: c }) => (
                <div key={c.id} className="flex items-center justify-between rounded-3xl bg-fundo/60 p-3.5 text-sm ring-1 ring-borda/70">
                  <div className="flex items-center gap-2.5 opacity-60">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <div>
                      <span className="font-semibold text-texto">{c.nome}</span>
                      <p className="text-xs text-suave">Este profissional não atende este convênio</p>
                    </div>
                  </div>
                  <Chip tom="perigo">Não atende</Chip>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        /* Lista dos convênios atendidos. Convênio uniforme (todas as redes iguais) começa recolhido:
           abrir rede por rede só vale quando há exceção. */
        <div className="space-y-2.5 pt-1">
          {conveniosAtendidos.map(({ c, subs }) => {
            const restricoesConvenio = p.restricoes.filter((r) =>
              r.subtipoId ? c.subtipos.some((s) => s.id === r.subtipoId) : false
            );
            const todasConsultas = subs.every((s) => p.atende[s.id]?.includes("c"));
            const todosExames = subs.every((s) => p.atende[s.id]?.includes("e"));
            const todasRedes = subs.length === c.subtipos.length;
            const uniforme = new Set(subs.map((s) => p.atende[s.id])).size === 1;
            const listaAberta = !uniforme || !!abertos[c.id];
            const rotulo = todasConsultas && todosExames ? "Consulta e Exame" : todasConsultas ? "Consulta" : todosExames ? "Exame" : null;

            return (
              <div key={c.id} className="overflow-hidden rounded-3xl bg-superficie ring-1 ring-borda transition-shadow hover:ring-tinta/25">
                <button type="button" aria-expanded={listaAberta} disabled={!uniforme}
                  onClick={() => setAbertos((a) => ({ ...a, [c.id]: !a[c.id] }))}
                  className="flex w-full flex-wrap items-center justify-between gap-2 bg-fundo/50 px-4 py-3 text-left enabled:hover:bg-fundo">
                  <span className="flex items-center gap-2.5">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                    <span className="text-sm font-bold text-texto">{c.nome}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    {rotulo && <Chip tom={rotulo === "Exame" ? "acento" : "mata"}>{rotulo}</Chip>}
                    <Chip>{todasRedes ? `todas as ${subs.length} redes` : `${subs.length} de ${c.subtipos.length} redes`}</Chip>
                    {uniforme && <ChevronDown className={`size-4 text-suave transition-transform duration-200 ${listaAberta ? "rotate-180" : ""}`} />}
                  </span>
                </button>

                {restricoesConvenio.length > 0 && (
                  <div className="flex items-center gap-2 bg-sol-claro px-4 py-2 text-xs text-tinta">
                    <TriangleAlert className="size-3.5 shrink-0" />
                    <span>Aviso: {restricoesConvenio.map((r) => r.texto).join(" | ")}</span>
                  </div>
                )}

                <Desdobra aberto={listaAberta}>
                  <div className="divide-y divide-borda/40 px-4">
                    {subs.map((s) => {
                      const podeC = p.atende[s.id]?.includes("c");
                      const podeE = p.atende[s.id]?.includes("e");
                      return (
                        <div key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                          <span className="font-medium text-texto">{s.nome}</span>
                          <span className="flex items-center gap-1.5">
                            {podeC && <Chip tom="mata"><Check />Consulta</Chip>}
                            {podeE && <Chip tom="acento"><Check />Exame</Chip>}
                            {!podeC && !podeE && <span className="text-suave">Não atende</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Desdobra>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SecaoExamesProfissional({
  examesIds,
  dados,
  abrirExame,
}: {
  examesIds: string[];
  dados: DadosClinica;
  abrirExame: (id: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const q = busca.trim();

  const lista = useMemo(() => {
    return examesIds
      .map((eid) => dados.exames.find((e) => e.id === eid))
      .filter((e): e is NonNullable<typeof e> => !!e);
  }, [examesIds, dados.exames]);

  const filtrados = useMemo(() => {
    if (!q) return lista;
    return lista.filter((e) => combina(e.nome, q));
  }, [lista, q]);

  if (!lista.length) return <Vazio icone={<FlaskConical />} texto="Nenhum exame realizado por este profissional." />;

  return (
    <div className="space-y-3">
      {lista.length > 3 && <Filtro valor={busca} onChange={setBusca} placeholder={`Buscar entre os ${lista.length} exames`} />}

      {filtrados.length ? (
        <div className="flex flex-wrap gap-2">
          {filtrados.map((ex) => (
            <button
              key={ex.id}
              onClick={() => abrirExame(ex.id)}
              title="Ver preparo"
              className="pressionavel group inline-flex h-10 items-center gap-2 rounded-full bg-acento-claro pl-3.5 pr-3 text-sm font-semibold text-acento-escuro hover:bg-acento hover:text-white"
            >
              <FlaskConical className="size-4" />
              {ex.nome}
              <ChevronRight className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      ) : (
        <p className="py-2 text-sm text-suave">Nenhum exame corresponde à busca &quot;{busca}&quot;.</p>
      )}
    </div>
  );
}
