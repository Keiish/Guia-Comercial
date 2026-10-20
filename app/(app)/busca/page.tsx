"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  FlaskConical,
  Search,
  LayoutGrid,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  type Recente, combina, gruposPlanosDoConvenio, idsDeRedes, lembrarRecente, observacoesDoConvenio, pontuacao, resultadoPrincipal, sugestaoParaBusca, sugestoesDePlano, atende,
} from "@/lib/regras";
import { Abas, CabecalhoPagina, CartaoProfissional, Chip, Destaque, Icone, Indicador, Indicadores, Linhas, LogoMarca, Segmentado, SeletorConvenio, SeletorEspecialidade, Vazio, iconeDaEspecialidade } from "@/components/ui";
import { AnimatePresence, Entrada, Item, Lista, MOLA, motion } from "@/components/movimento";

const ABAS = [
  { id: "profissionais", rotulo: "Profissionais" },
  { id: "exames", rotulo: "Exames" },
  { id: "convenios", rotulo: "Convênios" },
  { id: "especialidades", rotulo: "Especialidades" },
] as const;
type Secao = (typeof ABAS)[number]["id"];

// useSearchParams pede Suspense no Next 16
export default function PaginaBusca() {
  return <Suspense><BuscaRapida /></Suspense>;
}

function BuscaRapida() {
  const { dados, abrir, clinica, plano, escolherPlano, carregado } = useStore();
  const router = useRouter();
  const rota = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(() => params.get("q") ?? "");
  const [esp, setEsp] = useState(() => params.get("esp") ?? "");
  const [secaoAtiva, setSecaoAtiva] = useState<Secao>(() => ABAS.find((a) => a.id === params.get("aba"))?.id ?? "profissionais");
  const [recentes, setRecentes] = useState<Recente[]>([]);
  // depois que a pessoa escolhe uma aba nesta busca, a busca não troca de aba sozinha
  const clicouAba = useRef(false);
  const campo = useRef<HTMLInputElement>(null);
  // escolha manual de Consulta/Exame fica na URL: sobrevive à volta da ficha
  const [tipoManual, setTipoManual] = useState(() => params.get("tipo") === "manual");
  // texto em que o atendimento já mudou sozinho: uma troca por texto, sem vaivém
  const tipoAuto = useRef("");
  const chaveRecentes = `cartilha:recentes:${clinica?.id}`;

  useEffect(() => {
    try { setRecentes(JSON.parse(localStorage.getItem(chaveRecentes) ?? "[]")); } catch { setRecentes([]); }
  }, [chaveRecentes]);
  const lembrar = (r: Recente) => {
    const nova = lembrarRecente(recentes, r);
    setRecentes(nova);
    try { localStorage.setItem(chaveRecentes, JSON.stringify(nova)); } catch {}
  };

  useEffect(() => {
    const focar = () => { campo.current?.focus(); campo.current?.select(); };
    const limpar = () => { setTexto(""); clicouAba.current = false; setTipoManual(false); };
    window.addEventListener("cartilha:focar-busca", focar);
    window.addEventListener("cartilha:nova-ligacao", limpar);
    return () => { window.removeEventListener("cartilha:focar-busca", focar); window.removeEventListener("cartilha:nova-ligacao", limpar); };
  }, []);

  // a busca fica na URL: voltar da ficha do médico devolve a mesma busca
  useEffect(() => {
    const p = new URLSearchParams(params.toString());
    const por = (k: string, v: string) => (v ? p.set(k, v) : p.delete(k));
    por("q", texto.trim());
    por("aba", secaoAtiva === "profissionais" ? "" : secaoAtiva);
    por("esp", esp);
    por("tipo", tipoManual ? "manual" : "");
    const s = p.toString();
    if (s !== params.toString()) router.replace(s ? `${rota}?${s}` : rota, { scroll: false });
  }, [texto, secaoAtiva, esp, tipoManual, params, rota, router]);

  const q = texto.trim();
  // especialidade de outra unidade (ou apagada) não filtra nada; sai da URL quando os dados já carregaram
  const espOk = dados.especialidades.some((e) => e.id === esp) ? esp : "";
  useEffect(() => { if (carregado && clinica && esp && !espOk) setEsp(""); }, [carregado, clinica, esp, espOk]);
  const subtipo = plano?.subtipoId ?? "";
  const tipo = plano?.tipo ?? "consulta";
  const validos = idsDeRedes(dados);
  const ordenar = <T,>(lista: T[], textoDe: (x: T) => string) =>
    q ? [...lista].sort((a, b) => pontuacao(textoDe(b), q) - pontuacao(textoDe(a), q)) : lista;
  const nomeEsp = (id: string) => dados.especialidades.find((e) => e.id === id)?.nome ?? "";

  // 1. Filtro de Profissionais
  const textoProfissional = (p: (typeof dados.profissionais)[number]) => {
    const exames = p.exames.map((id) => dados.exames.find((e) => e.id === id)?.nome ?? "");
    return [p.nome, nomeEsp(p.especialidadeId), p.valor ? `particular ${p.valor}` : "", ...p.procedimentos, ...exames].join(" ");
  };
  const profissionaisFiltrados = ordenar(
    dados.profissionais.filter((p) => {
      if (espOk && p.especialidadeId !== espOk) return false;
      if (subtipo && !atende(p, subtipo, tipo)) return false;
      return combina(textoProfissional(p), q);
    }),
    textoProfissional,
  );

  // 2. Filtro de Especialidades
  const textoEspecialidade = (e: (typeof dados.especialidades)[number]) =>
    [e.nome, ...dados.profissionais.filter((p) => p.especialidadeId === e.id).map((p) => p.nome)].join(" ");
  const especialidadesFiltradas = ordenar(
    dados.especialidades.filter((e) => (!espOk || e.id === espOk) && combina(textoEspecialidade(e), q)),
    textoEspecialidade,
  );

  // 3. Filtro de Convênios
  const textoConvenio = (c: (typeof dados.convenios)[number]) => {
    const planos = gruposPlanosDoConvenio(c).flatMap((g) => g.planos);
    return [c.nome, ...c.subtipos.map((s) => s.nome), ...planos, ...observacoesDoConvenio(c)].join(" ");
  };
  const conveniosFiltrados = ordenar(dados.convenios.filter((c) => combina(textoConvenio(c), q)), (c) => `${c.nome} ${c.subtipos.map((s) => s.nome).join(" ")}`);

  // 4. Filtro de Exames
  const textoExame = (e: (typeof dados.exames)[number]) =>
    [e.nome, ...e.preparo, e.documentos, ...dados.profissionais.filter((p) => p.exames.includes(e.id)).map((p) => p.nome)].join(" ");
  const examesFiltrados = ordenar(
    dados.exames.filter((e) => (!subtipo || e.subtipos.includes(subtipo)) && combina(textoExame(e), q)),
    (e) => e.nome,
  );

  const filtrando = !!(q || subtipo || espOk);
  const contagem: Record<Secao, number> = {
    profissionais: profissionaisFiltrados.length,
    exames: examesFiltrados.length,
    convenios: conveniosFiltrados.length,
    especialidades: especialidadesFiltradas.length,
  };
  const chaveContagem = ABAS.map((a) => contagem[a.id]).join(",");

  useEffect(() => { if (!q) { clicouAba.current = false; setTipoManual(false); tipoAuto.current = ""; } }, [q]);
  // aba atual sem resultado e outra com resultado: vai para a que tem mais
  useEffect(() => {
    if (!q || clicouAba.current || contagem[secaoAtiva] > 0) return;
    const melhor = ABAS.reduce((a, b) => (contagem[b.id] > contagem[a.id] ? b : a));
    if (contagem[melhor.id] > 0) setSecaoAtiva(melhor.id);
  }, [q, chaveContagem, secaoAtiva]);

  // o item cujo nome mais combina, quando ele não está na aba aberta ("mamo" → Mamografia com Profissionais aberto)
  const principal = q ? resultadoPrincipal([
    ...profissionaisFiltrados.map((x) => ({ aba: "profissionais" as const, id: x.id, nome: x.nome })),
    ...examesFiltrados.map((x) => ({ aba: "exames" as const, id: x.id, nome: x.nome })),
    ...conveniosFiltrados.map((x) => ({ aba: "convenios" as const, id: x.id, nome: x.nome })),
    ...especialidadesFiltradas.map((x) => ({ aba: "especialidades" as const, id: x.id, nome: x.nome })),
  ], q) : undefined;
  const mostrarPrincipal = principal && principal.aba !== secaoAtiva ? principal : undefined;
  // sem clique no seletor, o atendimento segue o que foi digitado: exame → Exame, médico/especialidade → Consulta
  const tipoSugerido = principal?.aba === "exames" ? "exame" : principal?.aba === "profissionais" || principal?.aba === "especialidades" ? "consulta" : undefined;
  useEffect(() => {
    if (!plano || tipoManual || !tipoSugerido || plano.tipo === tipoSugerido || tipoAuto.current === q) return;
    tipoAuto.current = q;
    escolherPlano({ ...plano, tipo: tipoSugerido });
  }, [plano, tipoSugerido, q, tipoManual]); // eslint-disable-line react-hooks/exhaustive-deps

  const sugestoes = q.length >= 2 ? sugestoesDePlano(dados.convenios, q).filter((x) => x.subtipo.id !== subtipo) : [];
  const abertos = q ? [] : recentes.flatMap((r) => {
    if (r.tipo === "profissional") {
      const p = dados.profissionais.find((x) => x.id === r.id);
      return p ? [{ r, nome: p.nome }] : [];
    }
    const e = dados.exames.find((x) => x.id === r.id);
    return e ? [{ r, nome: e.nome }] : [];
  });

  // troca de aba por clique, seta ou indicador: a busca deixa de trocar de aba sozinha
  const trocarAba = (id: Secao) => { clicouAba.current = true; setSecaoAtiva(id); };

  const unidadeVazia = !dados.profissionais.length && !dados.exames.length && !dados.convenios.length && !dados.especialidades.length;
  const sugestaoTexto = q ? sugestaoParaBusca([...dados.exames, ...dados.profissionais, ...dados.convenios, ...dados.especialidades].map((x) => x.nome), q) : undefined;
  // "especialidade" é feminino: Nenhuma especialidade cadastrada/encontrada
  const vazio = (oQue: string, a = oQue === "especialidade" ? "a" : "o") => unidadeVazia
    ? <Vazio icone={<LayoutGrid />} texto="Esta unidade ainda não tem cadastro. Quem coordena a unidade cadastra médicos, convênios e exames." />
    : !filtrando
      ? <Vazio icone={<LayoutGrid />} texto={`Nenhum${a === "a" ? "a" : ""} ${oQue} cadastrad${a} nesta unidade.`} />
      : (
        <div className="space-y-2 text-center">
          <Vazio icone={<Search />} texto={`Nenhum${a === "a" ? "a" : ""} ${oQue} encontrad${a} com os filtros atuais.`} />
          {sugestaoTexto && (
            <button type="button" onClick={() => { clicouAba.current = false; setTexto(sugestaoTexto); }} className="pressionavel text-sm font-semibold text-mata hover:underline">
              Você quis dizer “{sugestaoTexto}”?
            </button>
          )}
        </div>
      );

  // cabeçalho de cada aba: título à esquerda, atalho para a tela completa à direita
  const tituloAba = (titulo: string, link?: { href: string; rotulo: string }) => (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-xl font-semibold tracking-[-0.02em] text-texto">{titulo}</h2>
      {link && (
        <Link href={link.href} className="pressionavel flex items-center gap-1 text-sm font-semibold text-suave hover:text-texto">
          {link.rotulo} <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );

  return (
    <div>
      <CabecalhoPagina titulo="Busca rápida" sub="Médicos, exames, convênios e especialidades desta unidade, na hora da ligação." />

      <Indicadores>
        <Indicador i={0} icone={<Users />} valor={dados.profissionais.length} rotulo="Profissionais" tom="mata" onClick={() => trocarAba("profissionais")} />
        <Indicador i={1} icone={<FlaskConical />} valor={dados.exames.length} rotulo="Exames" tom="acento" onClick={() => trocarAba("exames")} />
        <Indicador i={2} icone={<ShieldCheck />} valor={dados.convenios.length} rotulo="Convênios" tom="sol" onClick={() => trocarAba("convenios")} />
      </Indicadores>

      <div className="space-y-6">
        {/* Barra de busca e filtros principais */}
        <Entrada i={2} className="cartao p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-suave" />
            <input
              ref={campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              autoFocus
              aria-label="Buscar por médico, especialidade, plano de convênio ou exame"
              placeholder="Buscar por médico, especialidade, plano de convênio ou exame..."
              className="h-14 w-full rounded-full border border-borda bg-superficie pl-13 pr-24 text-[17px] outline-none transition placeholder:text-suave/80 focus:border-tinta focus:ring-4 focus:ring-tinta/10"
            />
            {texto ? (
              <button
                type="button"
                onClick={() => setTexto("")}
                aria-label="Limpar texto"
                className="pressionavel absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-fundo text-suave hover:bg-tinta hover:text-white"
              >
                <X className="size-4" />
              </button>
            ) : (
              <kbd className="absolute right-5 top-1/2 hidden -translate-y-1/2 rounded-full border border-borda bg-fundo px-2.5 py-0.5 text-xs text-suave sm:block">
                Ctrl K
              </kbd>
            )}
          </div>

          {sugestoes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sugestoes.map(({ convenio, subtipo: s }) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { escolherPlano({ subtipoId: s.id, tipo: "consulta" }); setTexto(""); setSecaoAtiva("profissionais"); }}
                  className="pressionavel flex items-center gap-2 rounded-full bg-mata-claro py-1.5 pl-2 pr-4 text-sm font-semibold text-mata hover:bg-mata hover:text-white"
                >
                  <LogoMarca nome={convenio.nome} logo={convenio.logo} cor={convenio.cor} tamanho="sm" />
                  Usar {convenio.nome} · {s.nome} como plano do paciente
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 grid gap-3 md:grid-cols-[1.3fr_1fr_1fr] md:items-start">
            <SeletorConvenio dados={dados} valor={subtipo} onChange={(v) => escolherPlano(v ? { subtipoId: v, tipo } : null)} />
            <div className="flex items-center gap-2" title={plano ? undefined : "Escolha o convênio do paciente para filtrar por atendimento"}>
              <span className="text-sm font-semibold text-suave">Atendimento</span>
              <div className="flex-1">
                <Segmentado
                  valor={tipo}
                  desativado={!plano}
                  onChange={(t) => { setTipoManual(true); if (plano) escolherPlano({ ...plano, tipo: t }); }}
                  opcoes={[
                    { valor: "consulta", rotulo: "Consulta" },
                    { valor: "exame", rotulo: "Exame" },
                  ]}
                />
                {plano && !tipoManual && tipoSugerido && plano.tipo === tipoSugerido && <span className="mt-1 block text-xs text-suave">Definido pela busca</span>}
              </div>
            </div>
            <SeletorEspecialidade dados={dados} valor={espOk} onChange={setEsp} />
          </div>

          {/* abas dentro do cartão: menos faixas antes do primeiro resultado */}
          <div className="mt-4 border-t border-borda/70 pt-3">
            <Abas abas={ABAS} valor={secaoAtiva} onChange={trocarAba} contagem={contagem} rotuloAria="Resultados" />
          </div>
        </Entrada>

        {abertos.length > 0 && (
          <Entrada i={3} className="flex flex-wrap items-center gap-2">
            <span className="rotulo mr-1">Abertos recentemente</span>
            {abertos.map(({ r, nome }) => {
              const classe = "pressionavel flex items-center gap-1.5 rounded-full bg-superficie px-3.5 py-1.5 text-sm font-semibold text-texto ring-1 ring-borda hover:bg-tinta hover:text-white";
              return r.tipo === "profissional" ? (
                <Link key={`p-${r.id}`} href={`/profissionais/${r.id}`} onClick={() => lembrar(r)} className={classe}>
                  <UserRound className="size-4 text-mata" />{nome}
                </Link>
              ) : (
                <button key={`e-${r.id}`} type="button" onClick={() => { lembrar(r); abrir({ tipo: "exame", id: r.id }); }} className={classe}>
                  <FlaskConical className="size-4 text-acento" />{nome}
                </button>
              );
            })}
          </Entrada>
        )}

        {mostrarPrincipal && (() => {
          const { aba, id, nome } = mostrarPrincipal;
          const visual = {
            profissionais: { icone: UserRound, tipo: "Profissional", acao: "Ver ficha" },
            exames: { icone: FlaskConical, tipo: "Exame", acao: "Abrir" },
            convenios: { icone: ShieldCheck, tipo: "Convênio", acao: "Ver regras" },
            especialidades: { icone: LayoutGrid, tipo: "Especialidade", acao: "Ver médicos" },
          }[aba];
          const conteudo = (
            <>
              <span className="rotulo">Resultado principal</span>
              <visual.icone className="size-4 shrink-0 text-mata" />
              <span className="min-w-0 flex-1 truncate font-semibold text-texto"><Destaque texto={nome} q={q} /> <span className="font-normal text-suave">· {visual.tipo}</span></span>
              <span className="flex items-center gap-1 font-semibold text-mata">{visual.acao}<ChevronRight className="size-4" /></span>
            </>
          );
          const classe = "pressionavel cartao flex w-full items-center gap-3 !rounded-full px-5 py-3 text-left text-sm";
          const corpo = aba === "profissionais"
            ? <Link href={`/profissionais/${id}`} onClick={() => lembrar({ tipo: "profissional", id })} className={classe}>{conteudo}</Link>
            : aba === "convenios"
              ? <Link href={`/convenios/${id}`} className={classe}>{conteudo}</Link>
              : (
                <button type="button" className={classe} onClick={() => {
                  if (aba === "exames") { lembrar({ tipo: "exame", id }); abrir({ tipo: "exame", id }); return; }
                  clicouAba.current = true;
                  setEsp(id);
                  setSecaoAtiva("profissionais");
                }}>{conteudo}</button>
              );
          return <Entrada>{corpo}</Entrada>;
        })()}

        {/* ÁREA DE RESULTADOS: só a aba ativa; ao trocar, a que sai esmaece e a que entra sobe */}
        <div id="resultados-busca" role="tabpanel" aria-label="Resultados da busca">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={secaoAtiva}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.35 } }}
              exit={{ opacity: 0, transition: { duration: 0.14 } }}
            >
              {/* ==================== 1. SEÇÃO ESPECIALIDADES ==================== */}
              {secaoAtiva === "especialidades" && (
                <div>
                  {tituloAba(filtrando ? `Especialidades filtradas (${especialidadesFiltradas.length})` : "Todas as especialidades", { href: "/especialidades", rotulo: "Ver tela completa de especialidades" })}
                  {especialidadesFiltradas.length > 0 ? (
                    <Lista className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {especialidadesFiltradas.map((e) => (
                        <Item key={e.id} className="h-full">
                          <motion.button
                            type="button"
                            whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={MOLA}
                            onClick={() => { setEsp(e.id); setSecaoAtiva("profissionais"); }}
                            className="cartao group flex h-full w-full cursor-pointer flex-col justify-between p-5 text-left transition-shadow hover:shadow-elevado"
                          >
                            <div className="flex w-full items-center justify-between">
                              <span className="grid size-12 place-items-center rounded-full bg-fundo text-texto transition-colors group-hover:bg-tinta group-hover:text-white">
                                <Icone nome={iconeDaEspecialidade(e)} className="size-6" />
                              </span>
                              <span className="grid size-9 place-items-center rounded-full bg-fundo text-suave transition-colors group-hover:bg-tinta group-hover:text-white">
                                <ArrowUpRight className="size-4" />
                              </span>
                            </div>
                            <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-texto">
                              <Destaque texto={e.nome} q={q} />
                            </h3>
                          </motion.button>
                        </Item>
                      ))}
                    </Lista>
                  ) : (
                    vazio("especialidade")
                  )}
                </div>
              )}

              {/* ==================== 2. SEÇÃO PROFISSIONAIS ==================== */}
              {secaoAtiva === "profissionais" && (
                <div>
                  {tituloAba(filtrando ? `Profissionais encontrados (${profissionaisFiltrados.length})` : "Todos os profissionais")}
                  {profissionaisFiltrados.length > 0 ? (
                    <Lista className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {profissionaisFiltrados.map((p, i) => {
                        const medEsp = nomeEsp(p.especialidadeId);
                        const medExames = p.exames.map((id) => dados.exames.find((e) => e.id === id)?.nome ?? "").filter(Boolean);
                        const bateuProc = q ? p.procedimentos.filter((x) => combina(x, q)) : [];
                        const bateuExames = q ? medExames.filter((x) => combina(x, q)) : [];
                        return (
                          <CartaoProfissional
                            key={p.id}
                            p={p}
                            i={i}
                            q={q}
                            onAbrir={() => lembrar({ tipo: "profissional", id: p.id })}
                            especialidade={medEsp}
                            destaque={
                              (bateuProc.length > 0 || bateuExames.length > 0) && (
                                <div className="border-t border-borda pt-3">
                                  <p className="rotulo">Atende nesta unidade</p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {bateuProc.map((x) => (
                                      <Chip key={x}>{x}</Chip>
                                    ))}
                                    {bateuExames.map((x) => (
                                      <Chip key={x} tom="acento">{x}</Chip>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                          />
                        );
                      })}
                    </Lista>
                  ) : (
                    vazio("profissional")
                  )}
                </div>
              )}

              {/* ==================== 3. SEÇÃO CONVÊNIOS ==================== */}
              {secaoAtiva === "convenios" && (
                <div>
                  {tituloAba(filtrando ? `Convênios encontrados (${conveniosFiltrados.length})` : "Todos os convênios", { href: "/convenios", rotulo: "Ver diretório de convênios" })}
                  {conveniosFiltrados.length > 0 ? (
                    <Lista className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {conveniosFiltrados.map((c) => {
                        const grupos = gruposPlanosDoConvenio(c);
                        const obs = observacoesDoConvenio(c);
                        const countAtende = grupos.find((g) => g.status === "atende")?.planos.length ?? 0;
                        const countSomente = grupos.find((g) => g.status === "somente_exames")?.planos.length ?? 0;
                        const countNao = grupos.find((g) => g.status === "nao_atende")?.planos.length ?? 0;

                        return (
                          <Item key={c.id} className="h-full">
                            <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={MOLA} className="h-full">
                              <Link href={`/convenios/${c.id}`} className="cartao group flex h-full flex-col p-6 text-left transition-shadow hover:shadow-elevado">
                                <div className="mb-4 flex items-center justify-between">
                                  <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="lg" />
                                  <div className="flex items-center gap-2">
                                    <Chip tom="mata">{c.subtipos.length} {c.subtipos.length === 1 ? "rede" : "redes"}</Chip>
                                    <span className="grid size-9 place-items-center rounded-full bg-fundo text-suave transition-colors group-hover:bg-tinta group-hover:text-white">
                                      <ArrowUpRight className="size-4" />
                                    </span>
                                  </div>
                                </div>

                                <h3 className="text-xl font-semibold tracking-[-0.02em] text-texto">
                                  <Destaque texto={c.nome} q={q} />
                                </h3>
                                <p className="mt-1 text-sm text-suave">Regras e planos da carteirinha</p>

                                <div className="mt-auto pt-4">
                                  <Linhas itens={[
                                    { rotulo: "Consultas e exames", valor: `${countAtende} planos`, tom: "mata" },
                                    { rotulo: "Somente exames", valor: `${countSomente} planos`, tom: "sol" },
                                    ...(countNao > 0 ? [{ rotulo: "Não atendidos", valor: `${countNao} planos`, tom: "perigo" as const }] : []),
                                    ...(obs.length > 0 ? [{ rotulo: <><ShieldAlert className="size-3.5 text-sol-escuro" />Regras operacionais</>, valor: `${obs.length} ativas` }] : []),
                                  ]} />
                                </div>
                              </Link>
                            </motion.div>
                          </Item>
                        );
                      })}
                    </Lista>
                  ) : (
                    vazio("convênio")
                  )}
                </div>
              )}

              {/* ==================== 4. SEÇÃO EXAMES ==================== */}
              {secaoAtiva === "exames" && (
                <div>
                  {tituloAba(filtrando ? `Exames encontrados (${examesFiltrados.length})` : "Todos os exames", { href: "/exames", rotulo: "Ver tela completa de exames" })}
                  {examesFiltrados.length > 0 ? (
                    <Lista className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {examesFiltrados.map((e) => {
                        const quemFaz = dados.profissionais.filter((p) => p.exames.includes(e.id));
                        const redes = e.subtipos.filter((id) => validos.has(id)).length;
                        return (
                          <Item key={e.id} className="h-full">
                            <motion.button
                              type="button"
                              whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={MOLA}
                              onClick={() => { lembrar({ tipo: "exame", id: e.id }); abrir({ tipo: "exame", id: e.id }); }}
                              className="cartao group flex h-full w-full cursor-pointer flex-col p-5 text-left transition-shadow hover:shadow-elevado"
                            >
                              <div className="flex items-center justify-between">
                                <span className="grid size-12 place-items-center rounded-full bg-acento-claro text-acento-escuro transition-colors group-hover:bg-acento group-hover:text-white">
                                  <FlaskConical className="size-6" />
                                </span>
                                <Chip tom="acento">{redes} {redes === 1 ? "rede" : "redes"}</Chip>
                              </div>

                              <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-texto">
                                <Destaque texto={e.nome} q={q} />
                              </h3>
                              <p className="mt-1 line-clamp-2 text-sm text-suave">
                                {e.preparo[0] ?? "Sem preparo específico cadastrado."}
                              </p>

                              <div className="mt-auto pt-4">
                                <Linhas itens={[{ rotulo: quemFaz.length === 1 ? "Profissional realiza" : "Profissionais realizam", valor: quemFaz.length, tom: "acento" }]} />
                                <div className="mt-2 flex items-center justify-between text-sm font-semibold text-acento-escuro">
                                  <span>Ver preparo e cobertura</span>
                                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
                                </div>
                              </div>
                            </motion.button>
                          </Item>
                        );
                      })}
                    </Lista>
                  ) : (
                    vazio("exame")
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
