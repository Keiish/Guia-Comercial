"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Building2, Check, CheckCircle2, ChevronsUpDown, FileUp, FlaskConical, LayoutGrid, Lock, LogOut, PhoneCall, Plus, Search, ShieldCheck, Stethoscope, TriangleAlert, UserRound, Users, type LucideIcon } from "lucide-react";
import type { Usuario } from "@/lib/modelo";
import { PAPEIS, podeCriarUsuario, podeGerenciarUnidades } from "@/lib/permissoes";
import { semAcento, subtipoInfo } from "@/lib/regras";
import { useStore, type Formulario } from "@/lib/store";
import { useMotionValueEvent, useScroll } from "motion/react";
import { Avatar, Logo, LogoMarca, SeletorConvenio, TituloContexto, Vazio } from "@/components/ui";
import { AnimatePresence, Entrada, MOLA, Pagina, SUAVE, motion } from "@/components/movimento";
import { Paineis } from "@/components/paineis";
import { Formularios } from "@/components/formularios";

type ItemMenu = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  requerClinica?: boolean;
  mostrar?: (u: Usuario, unidades: number, edita: boolean) => boolean;
};

const menu: ItemMenu[] = [
  { href: "/", rotulo: "Unidades", icone: Building2, mostrar: (u, n) => n !== 1 || podeGerenciarUnidades(u) },
  { href: "/busca", rotulo: "Busca", icone: Search, requerClinica: true },
  { href: "/especialidades", rotulo: "Especialidades", icone: LayoutGrid, requerClinica: true },
  { href: "/convenios", rotulo: "Convênios", icone: ShieldCheck, requerClinica: true },
  { href: "/exames", rotulo: "Exames", icone: FlaskConical, requerClinica: true },
  { href: "/importar", rotulo: "Importar", icone: FileUp, requerClinica: true, mostrar: (_u, _n, edita) => edita },
  { href: "/usuarios", rotulo: "Usuários", icone: Users, mostrar: podeCriarUsuario },
];

export function Estrutura({ children }: { children: React.ReactNode }) {
  const { usuario, carregado, sair, aviso, avisar, clinica, clinicas, form, abrir, podeEditarAtual } = useStore();
  const router = useRouter();
  const rota = usePathname();
  // telas que funcionam sem unidade escolhida
  const livre = rota === "/" || rota === "/clinicas";

  useEffect(() => {
    if (carregado && !usuario) router.replace("/login");
  }, [carregado, usuario, router]);

  // Se o usuário não tiver uma unidade selecionada, só pode navegar na tela de Unidades
  useEffect(() => {
    if (carregado && usuario && !clinica && !livre) {
      router.replace("/");
      avisar("Escolha uma unidade para acessar o sistema.", true);
    }
  }, [carregado, usuario, clinica, livre, router, avisar]);

  // Ctrl+K (ou "/" fora de campo de texto) leva à busca e foca o campo
  const irParaBusca = () => {
    if (!clinica) return avisar("Escolha uma unidade para buscar.", true);
    // fora da busca só navega: o painel fecha porque o ?exame= some da URL (um replace de volta à rota velha venceria o push)
    if (rota !== "/busca") router.push("/busca"); else abrir(null);
    window.dispatchEvent(new Event("cartilha:focar-busca"));
  };
  const irRef = useRef(irParaBusca);
  irRef.current = irParaBusca;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      const emCampo = !!alvo && (["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName) || alvo.isContentEditable);
      const atalho = ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !emCampo && !e.ctrlKey && !e.metaKey);
      if (!atalho || !clinica || form) return;
      e.preventDefault();
      irRef.current();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [clinica, form]);

  // ao rolar, a barra encolhe e o título da página sobe para dentro dela
  const [titulo, setTitulo] = useState<string | null>(null);
  const [rolou, setRolou] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setRolou(y > 72));

  const itens = menu.filter((m) => !m.mostrar || (usuario && m.mostrar(usuario, clinicas.length, podeEditarAtual)));
  const ativo = itens.findIndex((m) => (m.href === "/" ? rota === "/" : rota.startsWith(m.href)));
  const deslogar = () => { sair(); router.replace("/login"); };
  // no celular o menu rola de lado sem barra: o item ativo precisa entrar na vista
  const menuCelular = useRef<HTMLElement>(null);
  useEffect(() => {
    menuCelular.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [ativo, carregado, usuario]);

  if (!carregado || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4" aria-busy="true" aria-label="Carregando Guia Comercial">
          <div className="mx-auto w-fit"><Logo /></div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="entrar cartao h-24 animate-pulse" style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
      </div>
    );
  }

  const pilulas = (chave: string, ref?: React.RefObject<HTMLElement | null>) => (
    <nav ref={ref} aria-label="Seções" className="sem-rolagem flex items-center gap-1 overflow-x-auto">
      {itens.map((m, i) => {
        const bloqueado = m.requerClinica && !clinica;
        const atual = i === ativo;
        const classe = `pressionavel relative flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
          atual ? "text-white" : bloqueado ? "text-suave/40" : "text-suave hover:text-texto"}`;
        const miolo = (
          <>
            {atual && <motion.span layoutId={`pilula-${chave}`} transition={MOLA} className="absolute inset-0 rounded-full bg-tinta shadow-card" />}
            <m.icone className="relative size-4" />
            <span className="relative">{m.rotulo}</span>
            {bloqueado && <Lock className="relative size-3 text-suave/50" />}
          </>
        );
        if (bloqueado) {
          return (
            <button key={m.href} type="button" onClick={() => avisar("Escolha uma unidade para acessar esta opção.", true)} title="Escolha uma unidade para acessar" className={classe}>
              {miolo}
            </button>
          );
        }
        return <Link key={m.href} href={m.href} aria-current={atual ? "page" : undefined} className={classe}>{miolo}</Link>;
      })}
    </nav>
  );

  return (
    <TituloContexto.Provider value={setTitulo}>
    <div className="min-h-screen">
      {/* Barra superior: logo, abas em pílula e o usuário; encolhe ao rolar */}
      <header data-rolou={rolou} className={`vidro sticky top-0 z-30 transition-shadow duration-300 ${rolou ? "shadow-card" : ""}`}>
        <div className={`mx-auto flex max-w-[1360px] items-center gap-3 px-4 transition-[height] duration-300 ease-saida sm:px-8 md:pl-28 md:pr-8 xl:pr-10 ${rolou ? "h-12" : "h-16"}`}>
          <Link href="/" className="shrink-0" aria-label="Início"><Logo compacto /></Link>
          <AnimatePresence>
            {rolou && titulo && (
              <motion.span key={titulo} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25, ease: SUAVE }}
                className="hidden min-w-0 items-center gap-3 sm:flex">
                <span className="h-5 w-px bg-borda" />
                <span className="truncate text-sm font-bold tracking-[-0.01em] text-texto">{titulo}</span>
              </motion.span>
            )}
          </AnimatePresence>
          <div className="hidden min-w-0 flex-1 justify-center lg:flex">{pilulas("topo")}</div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <div className="md:hidden"><SeletorClinica modo="topo" /></div>
            <button type="button" onClick={irParaBusca} aria-label="Buscar (Ctrl K)"
              className="pressionavel hidden h-10 items-center gap-2 rounded-full bg-superficie pl-3 pr-1.5 text-sm font-medium text-suave ring-1 ring-borda hover:text-texto md:flex">
              <Search className="size-4" />
              <span className="hidden xl:inline">Buscar</span>
              <kbd className="rounded-full bg-fundo px-2 py-0.5 font-sans text-[11px] font-bold text-suave">Ctrl K</kbd>
            </button>
            <MenuUsuario usuario={usuario} sair={deslogar} />
          </div>
        </div>
        <div ref={menuCelular as React.RefObject<HTMLDivElement>} className="px-3 pb-2 md:pl-28 lg:hidden">{pilulas("celular")}</div>
      </header>

      {/* Trilho escuro flutuante: unidade e ações rápidas */}
      <aside className="fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-tinta p-2 shadow-trilho md:flex">
        <SeletorClinica modo="trilho" />
        <span className="my-1 h-px w-6 bg-white/15" />
        <BotaoTrilho icone={Search} rotulo="Buscar · Ctrl K" onClick={irParaBusca} />
        {clinica && <NovaLigacaoTrilho />}
        {podeEditarAtual && <AdicionarTrilho />}
        <span className="my-1 h-px w-6 bg-white/15" />
        <BotaoTrilho icone={LogOut} rotulo="Sair" onClick={deslogar} />
      </aside>

      {/* a troca de tela desfoca a que sai e revela a que entra */}
      <main tabIndex={-1} className="mx-auto w-full max-w-[1360px] px-4 pb-28 pt-6 outline-none sm:px-8 md:pl-28 md:pr-8 lg:pt-8 xl:pr-10">
        <Pagina chave={`${rota}-${clinica?.id}`}>
          {clinica && !livre && <FaixaPlano />}
          {clinica || livre ? children : <Vazio texto="Escolha uma unidade para acessar esta opção." />}
        </Pagina>
      </main>

      <Paineis />
      <Suspense><ExameNaUrl /></Suspense>
      <Formularios />

      <AnimatePresence>
        {aviso && (
          <motion.div key={aviso.texto} role="status"
            initial={{ opacity: 0, y: 18, x: "-50%", scale: 0.96 }} animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }} exit={{ opacity: 0, y: 10, x: "-50%", scale: 0.98 }} transition={MOLA}
            className="fixed bottom-6 left-1/2 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full bg-tinta py-2.5 pl-4 pr-2.5 text-sm font-medium text-white shadow-elevado">
            {aviso.erro ? <TriangleAlert className="size-4 shrink-0 text-acento" /> : <CheckCircle2 className="size-4 shrink-0 text-sol" />}
            <span className="py-1">{aviso.texto}</span>
            {aviso.acao
              ? <button type="button" onClick={aviso.acao.fazer} className="pressionavel rounded-full bg-sol px-3 py-1.5 text-xs font-bold text-tinta hover:brightness-105">{aviso.acao.rotulo}</button>
              : <span className="w-1.5" />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </TituloContexto.Provider>
  );
}

// Botão do trilho: ícone redondo com o rótulo aparecendo ao lado no hover
function BotaoTrilho({ icone: I, rotulo, onClick, ativo = false, children }: { icone: LucideIcon; rotulo: string; onClick?: () => void; ativo?: boolean; children?: React.ReactNode }) {
  return (
    <div className="group relative">
      <button type="button" onClick={onClick} aria-label={rotulo} aria-expanded={children ? ativo : undefined}
        className={`pressionavel grid size-11 place-items-center rounded-full transition-colors ${ativo ? "bg-white text-tinta" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
        <I className="size-5" />
      </button>
      <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full bg-tinta px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-elevado transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100">
        {rotulo}
      </span>
      {children}
    </div>
  );
}

function NovaLigacaoTrilho() {
  const { novaLigacao, plano, avisar } = useStore();
  const router = useRouter();
  return (
    <BotaoTrilho icone={PhoneCall} rotulo={plano ? "Nova ligação (limpa o plano)" : "Nova ligação"} ativo={!!plano}
      onClick={() => { novaLigacao(); router.push("/busca"); avisar("Nova ligação: busca limpa"); }} />
  );
}

// Menu "adicionar" do trilho: abre ao lado com as opções de cadastro
function AdicionarTrilho() {
  const { abrirForm } = useStore();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);
  const opcoes: { tipo: NonNullable<Formulario>["tipo"]; rotulo: string; icone: LucideIcon }[] = [
    { tipo: "profissional", rotulo: "Profissional", icone: UserRound },
    { tipo: "exame", rotulo: "Exame", icone: FlaskConical },
    { tipo: "convenio", rotulo: "Convênio", icone: ShieldCheck },
    { tipo: "especialidade", rotulo: "Especialidade", icone: Stethoscope },
  ];
  return (
    <div ref={caixa} className="relative">
      <BotaoTrilho icone={Plus} rotulo="Adicionar" ativo={aberto} onClick={() => setAberto((a) => !a)} />
      <AnimatePresence>
        {aberto && (
          <motion.div initial={{ opacity: 0, x: -8, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -8, scale: 0.96 }} transition={{ duration: 0.2, ease: SUAVE }}
            className="absolute left-full top-0 z-50 ml-3 w-52 rounded-3xl border border-borda bg-superficie p-1.5 shadow-elevado">
            <p className="rotulo px-3 pb-1 pt-2">Cadastrar</p>
            {opcoes.map((o) => (
              <button key={o.tipo} type="button" onClick={() => { setAberto(false); abrirForm({ tipo: o.tipo } as Formulario); }}
                className="pressionavel flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold text-texto hover:bg-fundo">
                <span className="grid size-8 place-items-center rounded-full bg-fundo text-suave"><o.icone className="size-4" /></span>{o.rotulo}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Avatar do usuário com menu: nome, papel e sair
function MenuUsuario({ usuario, sair }: { usuario: Usuario; sair: () => void }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);
  return (
    <div ref={caixa} className="relative">
      <button type="button" onClick={() => setAberto((a) => !a)} aria-haspopup="menu" aria-expanded={aberto} aria-label={`${usuario.nome}, ${PAPEIS[usuario.papel].rotulo}`}
        className={`pressionavel rounded-full ring-2 ring-offset-2 ring-offset-fundo transition ${aberto ? "ring-tinta" : "ring-transparent hover:ring-borda"}`}>
        <Avatar nome={usuario.nome} tamanho="md" />
      </button>
      <AnimatePresence>
        {aberto && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.2, ease: SUAVE }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-3xl border border-borda bg-superficie p-2 shadow-elevado">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Avatar nome={usuario.nome} tamanho="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{usuario.nome}</p>
                <p className="truncate text-xs text-suave">{PAPEIS[usuario.papel].rotulo}</p>
              </div>
            </div>
            <div className="my-1 h-px bg-borda/70" />
            <button type="button" role="menuitem" onClick={sair} className="pressionavel flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold hover:bg-fundo">
              <span className="grid size-8 place-items-center rounded-full bg-fundo text-suave"><LogOut className="size-4" /></span>Sair
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mantém "?exame=<id>" igual ao painel aberto, sem mexer nos outros parâmetros da URL
function ExameNaUrl() {
  const { painel, abrir, dados, carregado, clinica } = useStore();
  const router = useRouter();
  const rota = usePathname();
  const params = useSearchParams();
  const naUrl = params.get("exame");
  const id = painel?.id ?? null;
  const visto = useRef(id);
  const urlAntes = useRef(naUrl);

  // URL -> painel: link/recarregar abre; id que não existe é descartado; o parâmetro sumir (Voltar, outra tela) fecha
  useEffect(() => {
    const antes = urlAntes.current;
    urlAntes.current = naUrl;
    if (!naUrl) { if (antes) abrir(null); return; }
    if (!carregado || !clinica || naUrl === id) return;
    if (dados.exames.some((e) => e.id === naUrl)) abrir({ tipo: "exame", id: naUrl });
    else {
      const p = new URLSearchParams(params.toString());
      p.delete("exame");
      router.replace(p.size ? `${rota}?${p}` : rota, { scroll: false });
    }
    // só reage à mudança do ?exame=
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naUrl, carregado, clinica]);

  // painel -> URL: abrir empilha (o Voltar fecha), fechar pelo X/Esc só troca a URL; a tela mudar não conta
  useEffect(() => {
    if (visto.current === id) return;
    visto.current = id;
    if (id === naUrl) return;
    const p = new URLSearchParams(params.toString());
    if (id) p.set("exame", id); else p.delete("exame");
    const url = p.size ? `${rota}?${p}` : rota;
    if (id) router.push(url, { scroll: false }); else router.replace(url, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return null;
}

// O plano do paciente da ligação atual, visível em todas as telas da unidade: cartão escuro no topo
function FaixaPlano() {
  const { dados, plano, escolherPlano, novaLigacao } = useStore();
  const rota = usePathname();
  const [trocando, setTrocando] = useState(false);
  const info = plano && subtipoInfo(dados, plano.subtipoId);
  // telas de gestão não são de atendimento: a ligação não aparece lá
  if (!plano || !info || /^\/(importar|usuarios|clinicas)/.test(rota)) return null;
  // "Unimed · Unimed Intercâmbio" vira só "Unimed Intercâmbio"
  const redeRepeteConvenio = info.subtipo.nome.toLowerCase().startsWith(info.convenio.nome.toLowerCase());
  return (
    <Entrada className="gradiente-acento mb-6 flex flex-wrap items-center gap-3 rounded-[24px] px-4 py-3 text-white shadow-card">
      <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/15">
        <PhoneCall className="size-4 text-white" />
        <span className="pulso absolute right-0 top-0 size-2 rounded-full bg-sol" />
      </span>
      <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
        <LogoMarca nome={info.convenio.nome} logo={info.convenio.logo} cor={info.convenio.cor} tamanho="sm" />
        <p className="min-w-0 flex-1 text-sm leading-tight sm:truncate">
          <span className="rotulo block text-white/70">Ligação atual · {plano.tipo === "consulta" ? "Consulta" : "Exame"}</span>
          {redeRepeteConvenio
            ? <strong className="font-bold">{info.subtipo.nome}</strong>
            : <><strong className="font-bold">{info.convenio.nome}</strong> <span className="text-white/60">·</span> {info.subtipo.nome}</>}
        </p>
      </div>
      {trocando ? (
        <div className="w-full text-texto sm:w-80">
          <SeletorConvenio dados={dados} valor={plano.subtipoId} abertoInicial onFechar={() => setTrocando(false)}
            onChange={(v) => escolherPlano(v ? { subtipoId: v, tipo: plano.tipo } : null)} />
        </div>
      ) : (
        <button type="button" onClick={() => setTrocando(true)}
          className="pressionavel rounded-full px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">Trocar plano</button>
      )}
      <button type="button" onClick={novaLigacao}
        className="pressionavel flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-tinta hover:bg-sol">
        <PhoneCall className="size-4" />Nova ligação
      </button>
    </Entrada>
  );
}

// Unidade ativa: no trilho é a logo redonda que abre a lista ao lado; no topo (celular) é uma pílula com o nome
function SeletorClinica({ modo }: { modo: "trilho" | "topo" }) {
  const { banco, clinicas, clinica, escolherClinica } = useStore();
  const router = useRouter();
  const rota = usePathname();
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState("");
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

  // Separação em grupos: redes multi-unidades vs unidades individuais
  const grupos = useMemo(() => {
    const q = semAcento(termo.trim());
    const clinicasFiltradas = clinicas.filter((c) => {
      if (!q) return true;
      const o = banco.organizacoes.find((orgItem) => orgItem.id === c.organizacaoId);
      return semAcento(c.nome).includes(q) || (o && semAcento(o.nome).includes(q));
    });

    const mapa = new Map<string, { org: typeof banco.organizacoes[0]; itens: typeof clinicas }>();
    for (const c of clinicasFiltradas) {
      const o = banco.organizacoes.find((orgItem) => orgItem.id === c.organizacaoId) ?? { id: c.organizacaoId, nome: c.nome };
      if (!mapa.has(o.id)) mapa.set(o.id, { org: o, itens: [] });
      mapa.get(o.id)!.itens.push(c);
    }

    const redesMulti: { org: typeof banco.organizacoes[0]; itens: typeof clinicas }[] = [];
    const unidadesSoltas: typeof clinicas = [];

    mapa.forEach((grupo) => {
      const totalOrgNoBanco = clinicas.filter((c) => c.organizacaoId === grupo.org.id).length;
      if (totalOrgNoBanco > 1 && grupo.org.nome.trim().toLowerCase() !== grupo.itens[0]?.nome.trim().toLowerCase()) {
        redesMulti.push(grupo);
      } else {
        unidadesSoltas.push(...grupo.itens);
      }
    });

    return { redesMulti, unidadesSoltas, total: clinicasFiltradas.length };
  }, [banco.organizacoes, clinicas, termo]);

  if (!clinica) return null;

  const varias = clinicas.length > 1;
  const org = banco.organizacoes.find((o) => o.id === clinica.organizacaoId);

  const escolher = (id: string) => {
    setAberto(false);
    setTermo("");
    escolherClinica(id);
    if (rota.startsWith("/profissionais/")) router.push("/busca");
  };

  const linha = (c: (typeof clinicas)[number]) => {
    const ativa = c.id === clinica.id;
    return (
      <button key={c.id} type="button" onClick={() => escolher(c.id)}
        className={`pressionavel group flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition-colors ${ativa ? "bg-tinta text-white" : "text-texto hover:bg-fundo"}`}>
        <LogoMarca nome={c.nome} logo={c.logo} tamanho="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.nome}</span>
        {ativa
          ? <Check className="size-4 text-sol" strokeWidth={3} />
          : <span className="text-xs font-semibold text-suave opacity-0 transition-opacity group-hover:opacity-100">Acessar</span>}
      </button>
    );
  };

  const painel = (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0, x: modo === "trilho" ? -8 : 0, y: modo === "topo" ? -6 : 0, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: modo === "trilho" ? -8 : 0, y: modo === "topo" ? -6 : 0, scale: 0.97 }}
          transition={{ duration: 0.22, ease: SUAVE }}
          className={`absolute z-50 flex w-80 flex-col rounded-3xl border border-borda bg-superficie shadow-elevado ${modo === "trilho" ? "left-full top-0 ml-3" : "right-0 top-full mt-2"}`}
          style={{ maxHeight: "26rem" }}
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <span className="rotulo">Trocar de unidade</span>
            <span className="rounded-full bg-fundo px-2 py-0.5 text-xs font-semibold text-suave">{clinicas.length}</span>
          </div>

          {clinicas.length > 4 && (
            <div className="px-2 pb-1">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-suave" />
                <input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar unidade..."
                  className="h-9 w-full rounded-full bg-fundo pl-9 pr-3 text-sm outline-none ring-1 ring-transparent transition focus:bg-superficie focus:ring-tinta" />
              </div>
            </div>
          )}

          <div className="rolagem-fina flex-1 space-y-2 overflow-y-auto p-2">
            {grupos.total === 0 ? (
              <p className="py-4 text-center text-xs text-suave">Nenhuma unidade encontrada.</p>
            ) : (
              <>
                {grupos.redesMulti.map(({ org: o, itens }) => (
                  <div key={o.id} className="space-y-0.5 rounded-2xl bg-fundo/60 p-1.5">
                    <div className="flex items-center justify-between px-2.5 pb-1 pt-1.5">
                      <span className="rotulo truncate">{o.nome}</span>
                      <span className="text-[11px] font-semibold text-suave">{itens.length} {itens.length === 1 ? "unidade" : "unidades"}</span>
                    </div>
                    {itens.map(linha)}
                  </div>
                ))}
                {grupos.unidadesSoltas.length > 0 && (
                  <div className="space-y-0.5">
                    {grupos.redesMulti.length > 0 && <p className="rotulo px-2.5 pb-1 pt-1.5">Outras unidades</p>}
                    {grupos.unidadesSoltas.map(linha)}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-borda/60 p-1.5">
            <Link href="/" onClick={() => setAberto(false)}
              className="pressionavel flex w-full items-center justify-between rounded-2xl px-3 py-2 text-xs font-bold text-texto hover:bg-fundo">
              <span>Ver painel de unidades</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (modo === "trilho") {
    return (
      <div ref={caixa} className="group relative">
        <button type="button" disabled={!varias} onClick={() => setAberto(!aberto)} aria-expanded={aberto} aria-label={`Unidade: ${clinica.nome}`}
          className={`pressionavel grid size-11 place-items-center rounded-full ring-2 transition ${aberto ? "ring-sol" : "ring-white/15 hover:ring-white/40"} ${varias ? "" : "cursor-default"}`}>
          <LogoMarca nome={clinica.nome} logo={clinica.logo} tamanho="md" />
        </button>
        {!aberto && (
          <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full bg-tinta px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-elevado transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            {org && org.nome !== clinica.nome ? `${org.nome} · ` : ""}{clinica.nome}{varias ? " · trocar" : ""}
          </span>
        )}
        {painel}
      </div>
    );
  }

  return (
    <div ref={caixa} className="relative">
      <button type="button" disabled={!varias} onClick={() => setAberto(!aberto)} aria-expanded={aberto}
        className={`pressionavel flex h-10 max-w-44 items-center gap-2 rounded-full bg-superficie pl-1.5 pr-2.5 text-left ring-1 transition ${aberto ? "ring-tinta" : "ring-borda"} ${varias ? "" : "cursor-default"}`}>
        <LogoMarca nome={clinica.nome} logo={clinica.logo} tamanho="sm" />
        <span className="truncate text-sm font-bold">{clinica.nome}</span>
        {varias ? <ChevronsUpDown className="size-3.5 shrink-0 text-suave" /> : <Lock className="size-3 shrink-0 text-suave/60" />}
      </button>
      {painel}
    </div>
  );
}
