"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Copy,
  FlaskConical,
  Network,
  Pencil,
  Plus,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  X,
} from "lucide-react";
import { useItemDeOutraUnidade, useStore, type Painel } from "@/lib/store";
import { atende, combina, conflitosPlanos, gruposPlanosDoConvenio, observacoesDoConvenio, resumoRedes } from "@/lib/regras";
import { salvarConvenio } from "@/lib/repositorio";
import type { Exame, GrupoPlanoStatus, Profissional, Tipo } from "@/lib/modelo";
import { Abas, Atualizado, Avatar, Botao, CabecalhoPagina, Chip, Filtro, LogoMarca, Segmentado, SeletorBusca, Vazio, useHoje } from "@/components/ui";
import { Desdobra, Entrada, Item, Lista, MOLA, motion } from "@/components/movimento";

export default function PaginaConvenioDetalhes() {
  const { id } = useParams<{ id: string }>();
  const { dados, clinica, podeEditarAtual, abrirForm, abrir, executar, avisar } = useStore();

  const conv = dados.convenios.find((c) => c.id === id);
  const { semAcesso, trocando } = useItemDeOutraUnidade("convenios", id);

  const [aba, setAba] = useState<"planos" | "corpo">("planos");
  const [buscaPlano, setBuscaPlano] = useState("");
  const [subEscolhido, setSubId] = useState("");
  const [novaObs, setNovaObs] = useState("");
  const [adicionandoObs, setAdicionandoObs] = useState(false);

  const subId = conv?.subtipos.some((s) => s.id === subEscolhido) ? subEscolhido : conv?.subtipos[0]?.id ?? "";

  const conflitos = conv ? conflitosPlanos(conv, dados) : [];
  const grupos = useMemo(() => (conv ? gruposPlanosDoConvenio(conv) : []), [conv]);
  const observacoes = useMemo(() => (conv ? observacoesDoConvenio(conv) : []), [conv]);
  const redes = useMemo(() => (conv ? resumoRedes(conv, dados) : []), [conv, dados]);

  const quem = (tipo: Tipo) => dados.profissionais.filter((p) => atende(p, subId, tipo));
  const exames = dados.exames.filter((e) => e.subtipos.includes(subId));
  const esp = (p: Profissional) => dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;

  // texto para colar no atendimento: nome, observações gerais e grupos de planos
  const copiarRegras = async () => {
    if (!conv) return;
    const texto = [
      conv.nome,
      observacoes.length ? `Observações:\n${observacoes.map((o) => `- ${o}`).join("\n")}` : "",
      ...grupos.filter((g) => g.planos.length).map((g) => `${g.titulo}${g.nota ? ` (${g.nota})` : ""}:\n${g.planos.join(", ")}`),
    ].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(texto); avisar("Regras copiadas"); } catch { avisar("Não foi possível copiar", true); }
  };

  if (!conv && trocando) return null;
  if (!conv) {
    return (
      <div>
        <CabecalhoPagina titulo="Convênio não encontrado" voltar={{ href: "/convenios", rotulo: "Voltar para convênios" }} />
        <Entrada i={1}>
          <Vazio icone={<ShieldCheck />} texto={semAcesso ? "Você não tem acesso a esta unidade." : "Convênio não encontrado nesta unidade."} />
        </Entrada>
      </div>
    );
  }

  const termo = buscaPlano.trim();
  const filtrarPlanos = (planos: string[]) => planos.filter((p) => combina(p, termo));

  const gAtende = grupos.find((g) => g.status === "atende") ?? {
    status: "atende" as GrupoPlanoStatus,
    titulo: "Atende consultas e exames",
    planos: [],
  };
  const gSomente = grupos.find((g) => g.status === "somente_exames") ?? {
    status: "somente_exames" as GrupoPlanoStatus,
    titulo: "Somente exames",
    nota: "Não precisa de encaminhamento para a clínica",
    planos: [],
  };
  const gNao = grupos.find((g) => g.status === "nao_atende") ?? {
    status: "nao_atende" as GrupoPlanoStatus,
    titulo: "Não atendemos",
    planos: [],
  };

  const planosAtendeFiltrados = filtrarPlanos(gAtende.planos);
  const planosSomenteFiltrados = filtrarPlanos(gSomente.planos);
  const planosNaoFiltrados = filtrarPlanos(gNao.planos);

  const totalPlanosEncontrados =
    planosAtendeFiltrados.length + planosSomenteFiltrados.length + planosNaoFiltrados.length;
  const redesFiltradas = redes.filter((r) => combina(r.subtipo.nome, termo));
  const todosGruposVazios = !gAtende.planos.length && !gSomente.planos.length && !gNao.planos.length;

  const salvarNovaObservacao = () => {
    const texto = novaObs.trim();
    if (!texto) return;
    const novasObservacoes = [...observacoes, texto];
    const ok = executar(
      (b, u) => salvarConvenio(b, u, { ...conv, observacoesGerais: novasObservacoes }),
      "Observação adicionada com sucesso"
    );
    if (!ok) return;
    setNovaObs("");
    setAdicionandoObs(false);
  };

  const removerObservacao = (indice: number) => {
    const novasObservacoes = observacoes.filter((_, i) => i !== indice);
    executar(
      (b, u) => salvarConvenio(b, u, { ...conv, observacoesGerais: novasObservacoes }),
      "Observação removida",
      { desfazer: true, desfeito: "Exclusão desfeita" }
    );
  };

  // colunas do kanban: cada grupo de planos ganha um cartão sólido
  const colunas = [
    { g: gAtende, lista: planosAtendeFiltrados, classe: "cartao-mata text-white", plano: "bg-white/15 text-white", nota: "bg-white/15 text-white", contagem: "bg-white/20 text-white", vazio: "text-white/70", icone: <Stethoscope /> },
    { g: gSomente, lista: planosSomenteFiltrados, classe: "cartao-sol text-tinta", plano: "bg-tinta/10 text-tinta", nota: "bg-tinta/10 text-tinta", contagem: "bg-tinta/10 text-tinta", vazio: "text-tinta/60", icone: <FlaskConical /> },
    { g: gNao, lista: planosNaoFiltrados, classe: "cartao-acento text-white", plano: "bg-white/15 text-white line-through decoration-white/60", nota: "bg-white/15 text-white", contagem: "bg-white/20 text-white", vazio: "text-white/70", icone: <Ban /> },
  ];

  return (
    <div>
      {conflitos.length > 0 && (
        <Entrada className="mb-6">
          <div role="alert" className="flex items-start gap-2 rounded-3xl bg-sol-claro px-5 py-4 text-sm font-medium text-sol-escuro">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{conflitos.join(", ")} {conflitos.length === 1 ? "está" : "estão"} em “Não atendemos” ou “Somente exames”, mas {conflitos.length === 1 ? "aparece" : "aparecem"} com médico ou exame que contradiz o grupo. Confira o cadastro.</span>
          </div>
        </Entrada>
      )}

      {/* Cabeçalho próprio: voltar, logo, nome e ações */}
      <Entrada className="mb-8">
        <Link href="/convenios" className="pressionavel mb-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-superficie/70 pl-2 pr-3 text-xs font-bold text-suave ring-1 ring-borda hover:text-texto">
          <ArrowLeft className="size-3.5" />Convênios
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 items-center gap-5">
            <LogoMarca nome={conv.nome} logo={conv.logo} cor={conv.cor} tamanho="lg" />
            <div className="min-w-0">
              <h1 className="text-[34px] font-semibold leading-[1.02] tracking-[-0.025em] text-texto sm:text-[42px]">{conv.nome}</h1>
              {clinica && <p className="mt-2 text-[15px] text-suave">Regras válidas para a unidade {clinica.nome}</p>}
              <div className="mt-2"><Atualizado em={conv.atualizadoEm} por={conv.atualizadoPor} /></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Botao variante="secundario" onClick={copiarRegras}><Copy />Copiar regras</Botao>
            {podeEditarAtual && (
              <Botao onClick={() => abrirForm({ tipo: "convenio", id: conv.id })}>
                <Pencil />
                Editar convênio
              </Botao>
            )}
          </div>
        </div>
      </Entrada>

      {dados.profissionais.length > 0 && conv.subtipos.length > 0 && (
        <Entrada i={1} className="cartao mb-6 p-5">
          <p className="rotulo mb-4">Cobertura do corpo clínico</p>
          <ul className="grid gap-4 sm:grid-cols-2">
            {conv.subtipos.map((s) => {
              const total = dados.profissionais.length;
              const x = dados.profissionais.filter((p) => p.atende[s.id]).length;
              const pct = Math.round((x / total) * 100);
              return (
                <li key={s.id}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-semibold text-texto">{s.nome}</span>
                    <span className="shrink-0 text-xs tabular-nums text-suave">{x} de {total} médicos</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-borda">
                    <motion.div className="h-full rounded-full bg-mata" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Entrada>
      )}

      <Entrada i={1} className="mb-6">
        <Abas
          abas={[
            { id: "planos", rotulo: "Planos e redes" },
            { id: "corpo", rotulo: "Corpo clínico e exames" },
          ] as const}
          valor={aba}
          onChange={setAba}
          rotuloAria="Visões do convênio"
        />
      </Entrada>

      {/* Visualização 1: Planos e Redes */}
      {aba === "planos" && (
        <div className="space-y-6">
          <Entrada className="max-w-xl">
            <Filtro valor={buscaPlano} onChange={setBuscaPlano} placeholder="Buscar rede ou plano da carteirinha..." />
          </Entrada>

          {termo && (
            <p className="rotulo">
              {redesFiltradas.length} {redesFiltradas.length === 1 ? "rede" : "redes"} e {totalPlanosEncontrados} {totalPlanosEncontrados === 1 ? "plano" : "planos"} para &ldquo;{buscaPlano}&rdquo;
            </p>
          )}

          {/* Kanban: uma coluna por situação do plano; no celular as colunas empilham */}
          {todosGruposVazios && !termo ? (
            <Vazio icone={<ShieldCheck />} texto="Os grupos da carteirinha (atende, somente exames, não atendemos) ainda não foram preenchidos." />
          ) : (
            <Lista className="grid gap-5 md:grid-cols-3">
              {colunas.map(({ g, lista, classe, plano, nota, contagem, vazio, icone }) => (
                <Item key={g.status} className="h-full">
                  <section className={`${classe} flex h-full flex-col gap-4 p-5`} aria-label={g.titulo}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight tracking-[-0.01em] [&>svg]:size-5 [&>svg]:shrink-0">{icone}{g.titulo}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${contagem}`}>{lista.length}</span>
                    </div>
                    {g.nota && (
                      <p className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold ${nota}`}>
                        <TriangleAlert className="size-3.5 shrink-0" />
                        <span>{g.nota}</span>
                      </p>
                    )}
                    {lista.length === 0 ? (
                      <p className={`text-sm ${vazio}`}>Nenhum plano em {g.titulo}</p>
                    ) : (
                      <ul className="grid gap-2">
                        {lista.map((p) => (
                          <li key={p} className={`rounded-2xl px-4 py-3 text-[15px] font-semibold ${plano}`}>{p}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                </Item>
              ))}
            </Lista>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Redes (subtipos) e seus vínculos com médicos */}
            <Entrada i={2} className="cartao p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-[-0.01em]"><Network className="size-5" />Redes cadastradas</h2>
                <span className="text-xs font-bold tabular-nums text-suave">{redesFiltradas.length} de {redes.length}</span>
              </div>
              {redes.length === 0 ? (
                <Vazio icone={<Network />} texto="Nenhuma rede cadastrada. Edite o convênio para incluir as redes da carteirinha." />
              ) : redesFiltradas.length === 0 ? (
                <Vazio icone={<Network />} texto={`Nenhuma rede com “${buscaPlano}”.`} />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {redesFiltradas.map((r) => {
                    const vinculo = r.consultas || r.exames
                      ? `${r.consultas} ${r.consultas === 1 ? "médico" : "médicos"} de consulta · ${r.exames} de exame`
                      : "sem médico";
                    const com = !!(r.consultas || r.exames);
                    return (
                      <motion.button key={r.subtipo.id} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }} transition={MOLA}
                        onClick={() => { setSubId(r.subtipo.id); setAba("corpo"); }}
                        title="Ver quem atende nesta rede"
                        className={`group flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left ${com ? "bg-mata-claro text-texto" : "bg-fundo text-suave ring-1 ring-borda/70"}`}>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{r.subtipo.nome}</span>
                          <span className={`block text-xs ${com ? "text-mata" : "text-sol-escuro"}`}>{vinculo}</span>
                        </span>
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie text-suave transition-colors group-hover:bg-tinta group-hover:text-white">
                          <ArrowUpRight className="size-4" />
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </Entrada>

            {/* Regras operacionais */}
            <Entrada i={3}>
              <div className="cartao sticky top-6 p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-[-0.01em]">Observações gerais</h2>
                  {podeEditarAtual && !adicionandoObs && (
                    <Botao variante="secundario" tamanho="sm" onClick={() => setAdicionandoObs(true)}>
                      <Plus /> Adicionar
                    </Botao>
                  )}
                </div>

                <Desdobra aberto={adicionandoObs}>
                  <div className="mb-4 space-y-3 rounded-3xl bg-fundo p-3">
                    <textarea
                      value={novaObs}
                      onChange={(e) => setNovaObs(e.target.value)}
                      placeholder="Ex.: Biópsia: apenas autorização do procedimento..."
                      rows={2}
                      className="w-full rounded-2xl border border-borda bg-superficie p-3 text-sm outline-none transition focus:border-tinta focus:ring-4 focus:ring-tinta/10"
                    />
                    <div className="flex justify-end gap-2">
                      <Botao variante="fantasma" tamanho="sm" onClick={() => { setAdicionandoObs(false); setNovaObs(""); }}>
                        Cancelar
                      </Botao>
                      <Botao tamanho="sm" onClick={salvarNovaObservacao}>Salvar</Botao>
                    </div>
                  </div>
                </Desdobra>

                {observacoes.length > 0 ? (
                  <ol className="space-y-2">
                    {observacoes.map((obs, i) => (
                      <li key={i} className="group flex items-start gap-3 rounded-2xl bg-fundo/70 p-3 transition hover:bg-fundo">
                        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-tinta text-xs font-bold tabular-nums text-white">{i + 1}</span>
                        <span className="flex-1 text-sm font-medium leading-relaxed text-texto">{obs}</span>
                        {podeEditarAtual && (
                          <button
                            type="button"
                            onClick={() => removerObservacao(i)}
                            aria-label="Remover observação"
                            className="grid size-6 shrink-0 place-items-center rounded-full text-suave opacity-0 transition hover:bg-perigo-claro hover:text-perigo focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Vazio icone={<TriangleAlert />} texto="Nenhuma observação cadastrada para este convênio." />
                )}
              </div>
            </Entrada>
          </div>
        </div>
      )}

      {/* Visualização 2: Corpo Clínico & Exames Cobertos por Rede */}
      {aba === "corpo" && (
        <Entrada className="space-y-6">
          <div>
            <p className="rotulo mb-2">Rede ou plano</p>
            {conv.subtipos.length > 0 ? (
              <div className="max-w-xl">
                {conv.subtipos.length > 6 ? (
                  // o "vazio" da lista é a primeira rede, que é o padrão quando nada foi escolhido
                  <SeletorBusca valor={subId === conv.subtipos[0].id ? "" : subId} onChange={setSubId} vazio={conv.subtipos[0].nome} placeholder="Buscar rede..."
                    atual={<span className="font-medium text-texto">{conv.subtipos.find((x) => x.id === subId)?.nome}</span>}
                    opcoes={conv.subtipos.slice(1).map((x) => ({ id: x.id, texto: x.nome, rotulo: x.nome }))} largo={false} />
                ) : (
                  <Segmentado valor={subId} onChange={setSubId} opcoes={conv.subtipos.map((x) => ({ valor: x.id, rotulo: x.nome }))} />
                )}
              </div>
            ) : (
              <Vazio icone={<Network />} texto="Nenhuma rede cadastrada." />
            )}
          </div>

          <Lista key={subId} className="grid gap-6 md:grid-cols-2">
            <Item><BlocoProfissionaisRede tipo="consulta" profissionais={quem("consulta")} esp={esp} /></Item>
            <Item><BlocoProfissionaisRede tipo="exame" profissionais={quem("exame")} esp={esp} /></Item>
          </Lista>

          <BlocoExamesRede exames={exames} abrir={abrir} />
        </Entrada>
      )}
    </div>
  );
}

function BlocoProfissionaisRede({
  tipo,
  profissionais,
  esp,
}: {
  tipo: Tipo;
  profissionais: Profissional[];
  esp: (p: Profissional) => string | undefined;
}) {
  const [busca, setBusca] = useState("");
  const q = busca.trim();
  const ehConsulta = tipo === "consulta";

  const filtrados = useMemo(() => {
    if (!q) return profissionais;
    return profissionais.filter((p) => combina(p.nome, q) || combina(esp(p) ?? "", q));
  }, [profissionais, esp, q]);

  const hoje = useHoje();

  return (
    <div className="cartao h-full space-y-4 p-6">
      <div className="flex items-center gap-3">
        <span
          className={`grid size-10 place-items-center rounded-full ${
            ehConsulta ? "bg-mata-claro text-mata" : "bg-acento-claro text-acento-escuro"
          }`}
        >
          {ehConsulta ? <Stethoscope className="size-[18px]" /> : <FlaskConical className="size-[18px]" />}
        </span>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-texto">
          {ehConsulta ? "Profissionais para consulta" : "Profissionais para exames"}
        </h3>
        <span className="numero ml-auto text-xl text-suave">{profissionais.length}</span>
      </div>

      {profissionais.length > 3 && <Filtro valor={busca} onChange={setBusca} placeholder="Pesquisar por nome ou especialidade" />}

      {profissionais.length ? (
        filtrados.length ? (
          <div className="rolagem-fina max-h-96 space-y-2 overflow-y-auto pr-1">
            {filtrados.map((p) => {
              const atendeHoje = !!hoje && p.horarios.some((h) => h.dia === hoje);
              return (
                <Link
                  key={p.id}
                  href={`/profissionais/${p.id}`}
                  className="pressionavel group flex w-full items-center gap-3 rounded-2xl bg-fundo/70 px-3 py-2.5 text-left transition hover:bg-fundo"
                >
                  <Avatar nome={p.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-texto">{p.nome}</span>
                    <span className="block text-xs text-suave">{esp(p)}</span>
                  </span>
                  {atendeHoje && (
                    <Chip tom="mata">
                      <span className="pulso size-1.5 rounded-full bg-mata" /> Atende hoje
                    </Chip>
                  )}
                  {p.restricoes.length > 0 && (
                    <TriangleAlert className="size-4 shrink-0 text-sol-escuro" aria-label="Tem restrição" />
                  )}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie text-suave transition-colors group-hover:bg-tinta group-hover:text-white">
                    <ArrowUpRight className="size-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <Vazio icone={<Stethoscope />} texto={`Nenhum profissional com “${busca}” nesta rede.`} />
        )
      ) : (
        <Vazio icone={ehConsulta ? <Stethoscope /> : <FlaskConical />} texto={ehConsulta ? "Nenhum profissional para consulta nesta rede." : "Nenhum profissional para exames nesta rede."} />
      )}
    </div>
  );
}

function BlocoExamesRede({ exames, abrir }: { exames: Exame[]; abrir: (p: Painel) => void }) {
  const [busca, setBusca] = useState("");
  const q = busca.trim();
  const filtrados = useMemo(() => {
    if (!q) return exames;
    return exames.filter((e) => combina(e.nome, q));
  }, [exames, q]);

  return (
    <div className="cartao space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-texto">Exames cobertos nesta rede</h3>
        <span className="numero text-xl text-suave">{exames.length}</span>
      </div>
      {exames.length > 3 && <Filtro valor={busca} onChange={setBusca} placeholder={`Buscar entre os ${exames.length} exames cobertos`} />}
      {exames.length > 0 ? (
        filtrados.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filtrados.map((e) => (
              <button
                key={e.id}
                onClick={() => abrir({ tipo: "exame", id: e.id })}
                className="pressionavel rounded-full bg-acento-claro px-4 py-2 text-sm font-semibold text-acento-escuro transition hover:bg-acento hover:text-white"
              >
                {e.nome}
              </button>
            ))}
          </div>
        ) : (
          <Vazio icone={<FlaskConical />} texto={`Nenhum exame encontrado com “${busca}”.`} />
        )
      ) : (
        <Vazio icone={<FlaskConical />} texto="Nenhum exame credenciado nesta rede." />
      )}
    </div>
  );
}
