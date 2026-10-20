"use client";

import { reduzirImagem } from "@/lib/logo";
import Link from "next/link";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import * as Icones from "lucide-react";
import { Activity, Baby, Bone, Brain, Dna, Droplets, Ear, Eye, Heart, HeartPulse, Microscope, Pill, Radiation, Ribbon, ScanLine, Scissors, Smile, Stethoscope, Sun, Syringe, X, type LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { DIAS_PARA_REVISAR, combina, iniciais, subtipoInfo, tempoDesde, trechosDestaque } from "@/lib/regras";
import { DIAS, type DadosClinica, type Horario, type Profissional, type Tipo } from "@/lib/modelo";
import { AnimatePresence, Contador, Entrada, Item, MOLA, SUAVE, motion } from "./movimento";

// A casca lê o título da página atual para mostrá-lo na barra quando ela encolhe ao rolar
export const TituloContexto = createContext<(titulo: string | null) => void>(() => {});

export function Logo({ claro = false, compacto = false }: { claro?: boolean; compacto?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid size-10 place-items-center rounded-2xl p-1.5 ${claro ? "bg-white/10 ring-1 ring-white/20" : "bg-tinta shadow-card"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Fundo%20Login.png" alt="OncologyGroup" className="h-full w-full object-contain" />
      </div>
      {!compacto && (
        <div className="leading-tight">
          <p className={`text-[15px] font-bold tracking-tight ${claro ? "text-white" : "text-texto"}`}>OncologyGroup</p>
          <p className={`text-xs font-semibold ${claro ? "text-white/60" : "text-suave"}`}>Guia Comercial</p>
        </div>
      )}
    </div>
  );
}

// Ícones de especialidade: mapa explícito (importar tudo do lucide pesa); nome desconhecido cai no estetoscópio
const ICONES_ESPECIALIDADE: Record<string, LucideIcon> = {
  Stethoscope, Activity, Baby, Bone, Brain, Dna, Droplets, Ear, Eye, Heart, HeartPulse, Microscope, Pill, Radiation, Ribbon, ScanLine, Scissors, Smile, Sun, Syringe,
};
// Sem ícone escolhido, o nome da especialidade sugere um: "Mastologia" vira o laço, "Radiologia" o símbolo de radiação
const ICONE_PELO_NOME: [RegExp, string][] = [
  [/mastolog/i, "Ribbon"], [/oncolog|quimio/i, "Dna"], [/hematolog/i, "Droplets"], [/dermatolog/i, "Sun"], [/cirurg/i, "Scissors"],
  [/radiolog|imagem/i, "Radiation"], [/ginecolog|obstetr|pediatr/i, "Baby"], [/cardiolog/i, "HeartPulse"], [/neuro|psiq/i, "Brain"],
  [/oftalmo/i, "Eye"], [/otorrino/i, "Ear"], [/ortoped|reumato/i, "Bone"], [/odonto|bucomaxilo/i, "Smile"], [/patolog|laborat/i, "Microscope"],
];
export function iconeDaEspecialidade({ nome, icone }: { nome: string; icone: string }): string {
  if (icone && icone !== "Stethoscope") return icone;
  return ICONE_PELO_NOME.find(([re]) => re.test(nome))?.[1] ?? "Stethoscope";
}
export function Icone({ nome, className }: { nome: string; className?: string }) {
  const C = Object.hasOwn(ICONES_ESPECIALIDADE, nome) ? ICONES_ESPECIALIDADE[nome] : Stethoscope;
  return <C className={className} />;
}

// Tom do avatar sai do nome: a mesma pessoa tem sempre a mesma cor
const TONS_AVATAR = ["bg-mata-claro text-mata", "bg-sol-claro text-sol-escuro", "bg-acento-claro text-acento-escuro", "bg-tinta text-white"];
export function Avatar({ nome, grande = false, tamanho }: { nome: string; grande?: boolean; tamanho?: "sm" | "md" | "lg" | "xl" }) {
  const t = tamanho ?? (grande ? "xl" : "md");
  const tom = TONS_AVATAR[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % TONS_AVATAR.length];
  const dim = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-14 text-base", xl: "size-20 text-2xl" }[t];
  return <div className={`grid shrink-0 place-items-center rounded-full font-bold ${dim} ${tom}`}>{iniciais(nome)}</div>;
}

// Cabeçalho de página: título grande em duas linhas, descrição e ações à direita
export function CabecalhoPagina({ titulo, sub, acao, voltar }: { titulo: string; sub?: string; acao?: React.ReactNode; voltar?: { href: string; rotulo: string } }) {
  const registrar = useContext(TituloContexto);
  useEffect(() => { registrar(titulo); return () => registrar(null); }, [titulo, registrar]);
  return (
    <Entrada className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {voltar && (
          <Link href={voltar.href} className="pressionavel mb-4 inline-flex h-8 items-center gap-1.5 rounded-full bg-superficie/70 pl-2 pr-3 text-xs font-bold text-suave ring-1 ring-borda hover:text-texto">
            <Icones.ArrowLeft className="size-3.5" />{voltar.rotulo}
          </Link>
        )}
        <h1 className="max-w-[18ch] text-[34px] font-semibold leading-[1.02] tracking-[-0.025em] text-texto sm:text-[42px]">{titulo}</h1>
        {sub && <p className="mt-3 max-w-prose text-[15px] text-suave">{sub}</p>}
      </div>
      {acao && <div className="flex flex-wrap items-center gap-2">{acao}</div>}
    </Entrada>
  );
}

// Indicadores do topo da página: ícone num círculo, número grande e rótulo (três por linha)
export function Indicadores({ children }: { children: React.ReactNode }) {
  return <div className="mb-8 flex flex-wrap gap-x-8 gap-y-4">{children}</div>;
}
export function Indicador({ icone, valor, rotulo, tom = "neutro", onClick, i = 0 }: {
  icone: React.ReactNode; valor: React.ReactNode; rotulo: string; tom?: "neutro" | "mata" | "acento" | "sol" | "perigo"; onClick?: () => void; i?: number;
}) {
  const cor = { neutro: "bg-superficie text-texto ring-1 ring-borda", mata: "bg-mata-claro text-mata", acento: "bg-acento-claro text-acento-escuro", sol: "bg-sol-claro text-sol-escuro", perigo: "bg-perigo-claro text-perigo" }[tom];
  const Tag = onClick ? "button" : "div";
  return (
    <Entrada i={i + 1}>
      <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`flex items-center gap-3 text-left ${onClick ? "pressionavel rounded-2xl" : ""}`}>
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${cor} [&>svg]:size-[18px]`}>{icone}</span>
        <span className="leading-tight">
          <span className="numero block text-[22px] text-texto">{typeof valor === "number" ? <Contador valor={valor} /> : valor}</span>
          <span className="block text-xs font-semibold text-suave">{rotulo}</span>
        </span>
      </Tag>
    </Entrada>
  );
}

export function Botao({ children, onClick, variante = "primario", type = "button", tamanho = "md", disabled, className = "" }: {
  children: React.ReactNode; onClick?: () => void; variante?: "primario" | "secundario" | "acento" | "fantasma" | "perigo"; type?: "button" | "submit"; tamanho?: "sm" | "md" | "lg"; disabled?: boolean; className?: string;
}) {
  const estilo = {
    primario: "bg-tinta text-white shadow-card hover:bg-tinta-2",
    secundario: "bg-superficie text-texto ring-1 ring-borda hover:bg-fundo",
    acento: "bg-acento text-white shadow-card hover:bg-acento-escuro",
    fantasma: "text-suave hover:bg-superficie hover:text-texto",
    perigo: "bg-perigo text-white hover:brightness-110",
  }[variante];
  const dim = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-[15px]" }[tamanho];
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`pressionavel inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-50 [&>svg]:size-4 ${dim} ${estilo} ${className}`}>
      {children}
    </button>
  );
}

// Botão redondo só com ícone
export function BotaoIcone({ children, onClick, rotulo, ativo = false, escuro = false, className = "" }: {
  children: React.ReactNode; onClick?: () => void; rotulo: string; ativo?: boolean; escuro?: boolean; className?: string;
}) {
  const estilo = escuro
    ? ativo ? "bg-white text-tinta" : "text-white/70 hover:bg-white/10 hover:text-white"
    : ativo ? "bg-tinta text-white" : "bg-superficie text-suave ring-1 ring-borda hover:text-texto";
  return (
    <button type="button" onClick={onClick} aria-label={rotulo} title={rotulo}
      className={`pressionavel grid size-10 place-items-center rounded-full [&>svg]:size-[18px] ${estilo} ${className}`}>
      {children}
    </button>
  );
}

export function Chip({ children, tom = "neutro", solido = false }: {
  children: React.ReactNode; tom?: "neutro" | "verde" | "azul" | "alerta" | "perigo" | "mata" | "acento" | "sol" | "tinta"; solido?: boolean;
}) {
  const t = {
    neutro: solido ? "bg-tinta text-white" : "bg-fundo text-texto ring-1 ring-borda/70",
    verde: solido ? "bg-mata text-white" : "bg-mata-claro text-mata",
    mata: solido ? "bg-mata text-white" : "bg-mata-claro text-mata",
    azul: solido ? "bg-acento text-white" : "bg-acento-claro text-acento-escuro",
    acento: solido ? "bg-acento text-white" : "bg-acento-claro text-acento-escuro",
    alerta: solido ? "bg-sol text-tinta" : "bg-sol-claro text-sol-escuro",
    sol: solido ? "bg-sol text-tinta" : "bg-sol-claro text-sol-escuro",
    perigo: solido ? "bg-perigo text-white" : "bg-perigo-claro text-perigo",
    tinta: "bg-tinta text-white",
  }[tom];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold [&>svg]:size-3.5 ${t}`}>{children}</span>;
}

export function Atualizado({ em, por }: { em?: string; por?: string }) {
  const tempo = em ? tempoDesde(em) : "";
  if (!em || !tempo) return null;
  const velho = (Date.now() - Date.parse(em)) / 86400000 > DIAS_PARA_REVISAR;
  return (
    <Chip tom={velho ? "sol" : "neutro"}>
      Atualizado {tempo}{por && ` por ${por}`}{velho && " · pode estar desatualizado"}
    </Chip>
  );
}

// Só chega aqui quando o usuário pode ver (a recepção recebe os dados sem este campo)
export function ObservacaoInterna({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <div className="space-y-1.5 rounded-2xl border border-dashed border-borda bg-superficie/60 px-3.5 py-2.5">
      <Chip><Icones.Lock />Interno</Chip>
      <p className="whitespace-pre-line text-[15px] leading-relaxed">{texto}</p>
    </div>
  );
}

export function TipoBadge({ tipo }: { tipo: Tipo }) {
  return tipo === "consulta"
    ? <Chip tom="mata"><Icones.Stethoscope />Consulta</Chip>
    : <Chip tom="acento"><Icones.FlaskConical />Exame</Chip>;
}

// Controle segmentado: a pílula ativa desliza entre as opções
export function Segmentado<T extends string>({ opcoes, valor, onChange, desativado = false, escuro = false }: {
  opcoes: { valor: T; rotulo: string }[]; valor: T; onChange: (v: T) => void; desativado?: boolean; escuro?: boolean;
}) {
  const id = useId();
  return (
    <div className={`relative grid rounded-full p-1 ${escuro ? "bg-white/10" : "bg-fundo ring-1 ring-borda/70"}`} style={{ gridTemplateColumns: `repeat(${opcoes.length}, 1fr)` }}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button key={o.valor} type="button" onClick={() => onChange(o.valor)} disabled={desativado}
            className={`relative h-9 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              ativo ? (escuro ? "text-tinta" : "text-white") : escuro ? "text-white/70 enabled:hover:text-white" : "text-suave enabled:hover:text-texto"}`}>
            {ativo && <motion.span layoutId={`seg-${id}`} transition={MOLA} className={`absolute inset-0 rounded-full ${escuro ? "bg-white" : "bg-tinta"}`} />}
            <span className="relative">{o.rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}

// Abas em pílula (nível de página): a ativa é preta e desliza
export function Abas<T extends string>({ abas, valor, onChange, contagem, rotuloAria = "Seções" }: {
  abas: readonly { id: T; rotulo: string }[]; valor: T; onChange: (v: T) => void; contagem?: Partial<Record<T, number>>; rotuloAria?: string;
}) {
  const id = useId();
  const tecla = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = abas.findIndex((a) => a.id === valor);
    const prox = abas[(i + (e.key === "ArrowRight" ? 1 : abas.length - 1)) % abas.length].id;
    onChange(prox);
    document.getElementById(`${id}-${prox}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={rotuloAria} onKeyDown={tecla} className="sem-rolagem flex gap-1 overflow-x-auto">
      {abas.map((a) => {
        const ativo = a.id === valor;
        const n = contagem?.[a.id];
        return (
          <button key={a.id} id={`${id}-${a.id}`} type="button" role="tab" aria-selected={ativo} tabIndex={ativo ? 0 : -1} onClick={() => onChange(a.id)}
            className={`pressionavel relative flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${ativo ? "text-white" : "text-suave hover:text-texto"}`}>
            {ativo && <motion.span layoutId={`aba-${id}`} transition={MOLA} className="absolute inset-0 rounded-full bg-tinta shadow-card" />}
            <span className="relative">{a.rotulo}</span>
            {n !== undefined && <span className={`relative rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${ativo ? "bg-white/15 text-white" : "bg-superficie text-suave ring-1 ring-borda/70"}`}>{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

type OpcaoLista = { id: string; texto: string; rotulo: React.ReactNode; grupo?: string };

// Botão + lista com busca: Esc fecha, ↑/↓ movem a opção ativa, Enter escolhe
export function SeletorBusca({ valor, onChange, vazio, placeholder, atual, opcoes, grupos = {}, abertoInicial = false, buscaInicial = "", onFechar, largo = true, icone }: {
  valor: string; onChange: (v: string) => void; vazio: string; placeholder: string; atual: React.ReactNode;
  opcoes: OpcaoLista[]; grupos?: Record<string, React.ReactNode>;
  abertoInicial?: boolean; buscaInicial?: string; onFechar?: () => void; largo?: boolean; icone?: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const [busca, setBusca] = useState(buscaInicial);
  const [ativa, setAtiva] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const base = useId();

  const q = busca.trim();
  // com texto, a opção "qualquer" sai para o Enter cair no primeiro resultado
  const lista = [...(q ? [] : [{ id: "", texto: vazio, rotulo: vazio }]), ...opcoes.filter((o) => combina(o.texto, q))];

  const fechar = (focar = false) => {
    setAberto(false);
    setBusca("");
    onFechar?.();
    if (focar) gatilho.current?.focus();
  };
  const escolher = (id: string) => { onChange(id); fechar(true); };

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) fechar(); };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  });

  useEffect(() => {
    if (aberto) document.getElementById(`${base}-${ativa}`)?.scrollIntoView({ block: "nearest" });
  }, [aberto, ativa, base]);

  const alternar = () => {
    if (aberto) return fechar();
    setAtiva(Math.max(0, lista.findIndex((o) => o.id === valor)));
    setAberto(true);
  };

  const tecla = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAtiva((a) => Math.min(a + 1, lista.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtiva((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && lista[ativa]) { e.preventDefault(); escolher(lista[ativa].id); }
  };

  let grupoAnterior: string | undefined;
  return (
    <div ref={caixa} className="relative w-full"
      onKeyDown={(e) => { if (e.key === "Escape" && aberto) { e.preventDefault(); e.stopPropagation(); fechar(true); } }}>
      <button
        ref={gatilho}
        type="button"
        onClick={alternar}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={`flex h-12 w-full items-center gap-2 rounded-full border bg-superficie pl-4 text-left text-sm outline-none transition ${aberto ? "border-tinta ring-4 ring-tinta/10" : "border-borda hover:border-suave/50"} ${valor ? "pr-16" : "pr-10"}`}
      >
        {icone && <span className="shrink-0 text-suave [&>svg]:size-4">{icone}</span>}
        <span className="truncate">{valor ? atual : <span className="text-suave">{vazio}</span>}</span>
      </button>
      <div className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-suave">
        {valor && (
          <button type="button" aria-label="Limpar" onClick={() => onChange("")}
            className="pointer-events-auto rounded-full p-1.5 hover:bg-fundo hover:text-texto">
            <X className="size-3.5" />
          </button>
        )}
        <span className="grid size-7 place-items-center rounded-full bg-fundo">
          <Icones.ChevronDown className={`size-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
        </span>
      </div>

      <AnimatePresence>
        {aberto && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.22, ease: SUAVE }}
            className={`absolute left-0 top-full z-50 mt-2 w-full ${largo ? "min-w-[300px]" : ""} rounded-3xl border border-borda bg-superficie p-2 shadow-elevado`}>
            <div className="relative mb-2">
              <Icones.Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-suave" />
              <input
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setAtiva(0); }}
                onKeyDown={tecla}
                placeholder={placeholder}
                autoFocus
                role="combobox"
                aria-expanded
                aria-controls={`${base}-lista`}
                aria-activedescendant={lista[ativa] ? `${base}-${ativa}` : undefined}
                className="h-10 w-full rounded-full bg-fundo pl-10 pr-3 text-sm outline-none ring-1 ring-transparent transition focus:bg-superficie focus:ring-tinta"
              />
            </div>

            <div id={`${base}-lista`} role="listbox" className="rolagem-fina max-h-72 space-y-0.5 overflow-y-auto pr-1 text-sm">
              {lista.length ? lista.map((o, n) => {
                const titulo = o.grupo && o.grupo !== grupoAnterior ? grupos[o.grupo] : null;
                grupoAnterior = o.grupo;
                const marcado = o.id === valor;
                return (
                  <div key={o.id || "vazio"}>
                    {titulo && <div className="rotulo mt-2 flex items-center gap-2 px-2.5 py-1.5 normal-case tracking-normal [&>*:last-child]:text-xs">{titulo}</div>}
                    <div
                      id={`${base}-${n}`}
                      role="option"
                      aria-selected={marcado}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => escolher(o.id)}
                      onMouseMove={() => setAtiva(n)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-colors ${o.grupo ? "ml-2" : ""} ${
                        marcado ? "bg-tinta font-semibold text-white" : n === ativa ? "bg-fundo text-texto" : "text-texto"}`}
                    >
                      <span>{o.rotulo}</span>
                      {marcado && <Icones.Check className="size-3.5" />}
                    </div>
                  </div>
                );
              }) : (
                <p className="py-4 text-center text-sm text-suave">Nada encontrado para &quot;{busca}&quot;.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SeletorConvenio({ dados, valor, onChange, abertoInicial, buscaInicial, onFechar }: {
  dados: DadosClinica; valor: string; onChange: (v: string) => void;
  abertoInicial?: boolean; buscaInicial?: string; onFechar?: () => void;
}) {
  const info = valor ? subtipoInfo(dados, valor) : undefined;
  const grupos = Object.fromEntries(dados.convenios.map((c) => [c.id, <><LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" /><span>{c.nome}</span></>]));
  const opcoes = dados.convenios.flatMap((c) => c.subtipos.map((s) => ({ id: s.id, texto: `${c.nome} ${s.nome}`, rotulo: s.nome, grupo: c.id })));
  return (
    <SeletorBusca valor={valor} onChange={onChange} vazio="Qualquer convênio" placeholder="Buscar convênio ou plano..." icone={<Icones.ShieldCheck />}
      atual={info && <span className="font-medium text-texto"><strong className="font-bold">{info.convenio.nome}</strong> · {info.subtipo.nome}</span>}
      opcoes={opcoes} grupos={grupos} abertoInicial={abertoInicial} buscaInicial={buscaInicial} onFechar={onFechar} />
  );
}

export function SeletorEspecialidade({ dados, valor, onChange }: { dados: DadosClinica; valor: string; onChange: (v: string) => void }) {
  return (
    <SeletorBusca valor={valor} onChange={onChange} vazio="Todas as especialidades" placeholder="Buscar especialidade..." icone={<Icones.LayoutGrid />}
      atual={<span className="font-medium text-texto">{dados.especialidades.find((e) => e.id === valor)?.nome}</span>}
      opcoes={dados.especialidades.map((e) => ({ id: e.id, texto: e.nome, rotulo: e.nome }))} largo={false} />
  );
}

// Destaca as palavras do texto que começam com alguma palavra da busca
export function Destaque({ texto, q }: { texto: string; q: string }) {
  return <>{trechosDestaque(texto, q).map((x, n) => x.marca ? <mark key={n} className="rounded bg-sol-claro px-0.5 text-texto">{x.t}</mark> : x.t)}</>;
}

// Quem está dentro da gaveta (o botão Cancelar) fecha por aqui, para passar pelo aviso de descartar
export const FecharGaveta = createContext<() => void>(() => {});
export const useFecharGaveta = () => useContext(FecharGaveta);

export function Gaveta({ aberta, onFechar, alterado = false, largura = "max-w-xl", children }: {
  aberta: boolean; onFechar: () => void; alterado?: boolean; largura?: string; children: React.ReactNode;
}) {
  const [descartando, setDescartando] = useState(false);
  const tentar = () => (alterado ? setDescartando(true) : onFechar());
  // Esc com a barra aberta volta a editar; sem ela, tenta fechar
  const tentarRef = useRef(tentar);
  tentarRef.current = () => (descartando ? setDescartando(false) : tentar());
  const barra = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!aberta) setDescartando(false); }, [aberta]);
  const corpo = useRef<HTMLDivElement>(null);
  // ao abrir, o foco vai ao primeiro campo editável
  useEffect(() => {
    if (!aberta) return;
    const t = setTimeout(() => corpo.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]),textarea:not([disabled]),select:not([disabled])")?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, [aberta]);
  useEffect(() => { if (descartando) barra.current?.querySelector("button")?.focus(); }, [descartando]);
  useEffect(() => {
    if (!aberta) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && tentarRef.current();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberta]);
  return (
    <>
      <div data-aberta={aberta} onClick={tentar} className="veu fixed inset-0 z-40 bg-tinta/30 backdrop-blur-[3px]" />
      <aside data-aberta={aberta} aria-hidden={!aberta} inert={!aberta}
        className={`gaveta fixed inset-y-0 right-0 z-50 flex w-full ${largura} flex-col bg-superficie shadow-elevado sm:inset-y-3 sm:right-3 sm:rounded-[28px]`}>
        <button onClick={tentar} aria-label="Fechar"
          className="pressionavel absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-fundo text-suave hover:bg-tinta hover:text-white">
          <X className="size-5" />
        </button>
        <FecharGaveta.Provider value={tentar}>
          <div ref={corpo} className="rolagem-fina flex-1 overflow-y-auto">{children}</div>
        </FecharGaveta.Provider>
        {descartando && (
          <div ref={barra} role="alertdialog" aria-label="Descartar as alterações?"
            className="entrar flex flex-wrap items-center gap-3 border-t border-borda bg-sol-claro p-4 sm:rounded-b-[28px]">
            <p className="flex-1 text-sm font-semibold text-sol-escuro">Descartar as alterações?</p>
            <Botao variante="secundario" onClick={() => setDescartando(false)}>Continuar editando</Botao>
            <Botao onClick={onFechar}>Descartar</Botao>
          </div>
        )}
      </aside>
    </>
  );
}

// Painel lateral à direita: fundo escurecido (clique fecha), Esc fecha, foco vai ao botão Fechar e volta a quem abriu
export function Janela({ aberta, titulo, sobre, onFechar, children }: {
  aberta: boolean; titulo: string; sobre?: string; onFechar: () => void; children: React.ReactNode;
}) {
  const { form } = useStore();
  const idTitulo = useId();
  const fechar = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLElement>(null);
  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;
  const formAberto = useRef(false);
  formAberto.current = !!form;

  useEffect(() => {
    if (!aberta) return;
    const origem = document.activeElement as HTMLElement | null;
    fechar.current?.focus({ preventScroll: true });
    // com um formulário por cima, o Esc é dele
    const tecla = (e: KeyboardEvent) => {
      if (formAberto.current) return;
      if (e.key === "Escape") return onFecharRef.current();
      if (e.key !== "Tab") return;
      // prende o Tab dentro do painel
      const itens = [...painel.current!.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')];
      const primeiro = itens[0], ultimo = itens[itens.length - 1];
      const dentro = painel.current!.contains(document.activeElement);
      if (!dentro || (e.shiftKey && document.activeElement === primeiro)) { e.preventDefault(); (e.shiftKey ? ultimo : primeiro).focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    };
    window.addEventListener("keydown", tecla);
    return () => {
      window.removeEventListener("keydown", tecla);
      // o foco só volta se não foi para outro lugar (ex.: o formulário de edição)
      const destino = origem?.isConnected ? origem : document.querySelector<HTMLElement>("main");
      if (destino && (!document.activeElement || document.activeElement === document.body || painel.current?.contains(document.activeElement))) destino.focus({ preventScroll: true });
    };
  }, [aberta]);

  return (
    <>
      <div data-aberta={aberta} onClick={onFechar} className="veu fixed inset-0 z-40 bg-tinta/30 backdrop-blur-[3px]" />
      <aside ref={painel} role="dialog" aria-modal="true" aria-labelledby={idTitulo} data-aberta={aberta} aria-hidden={!aberta} inert={!aberta}
        className="gaveta fixed inset-y-0 right-0 z-50 flex w-[min(600px,100vw)] flex-col bg-superficie shadow-elevado sm:inset-y-3 sm:right-3 sm:rounded-[28px]">
        <header className="flex shrink-0 items-start gap-3 px-6 pb-4 pt-6">
          <div className="min-w-0 flex-1">
            {sobre && <p className="rotulo mb-1">{sobre}</p>}
            <h2 id={idTitulo} className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{titulo}</h2>
          </div>
          <button ref={fechar} type="button" onClick={onFechar} aria-label="Fechar"
            className="pressionavel grid size-10 shrink-0 place-items-center rounded-full bg-fundo text-suave hover:bg-tinta hover:text-white">
            <X className="size-5" />
          </button>
        </header>
        <div className="rolagem-fina flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}

export function Secao({ titulo, icone, children, i = 0, acao }: { titulo: string; icone: React.ReactNode; children: React.ReactNode; i?: number; acao?: React.ReactNode }) {
  return (
    <Entrada i={i} >
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="rotulo flex items-center gap-2 [&>svg]:size-4 [&>svg]:text-texto">{icone}{titulo}</h3>
          {acao}
        </div>
        {children}
      </section>
    </Entrada>
  );
}

export function Vazio({ texto, icone }: { texto: string; icone?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-borda bg-superficie/50 px-6 py-10 text-center">
      {icone && <span className="grid size-12 place-items-center rounded-full bg-fundo text-suave [&>svg]:size-5">{icone}</span>}
      <p className="max-w-sm text-sm text-suave">{texto}</p>
    </div>
  );
}

// Dia da semana ("Seg".."Sáb", null no domingo) só no navegador, para não divergir do HTML do servidor
export function useHoje() {
  const [hoje, setHoje] = useState<string | null>(null);
  useEffect(() => setHoje(DIAS[new Date().getDay() - 1] ?? null), []);
  return hoje;
}

// Caixa de busca local: lupa, campo e botão de limpar
export function Filtro({ valor, onChange, placeholder, grande = false }: { valor: string; onChange: (v: string) => void; placeholder: string; grande?: boolean }) {
  return (
    <div className="relative">
      <Icones.Search className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-suave ${grande ? "left-5 size-5" : "left-4 size-4"}`} />
      <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        className={`w-full rounded-full border border-borda bg-superficie outline-none transition placeholder:text-suave/80 focus:border-tinta focus:ring-4 focus:ring-tinta/10 ${grande ? "h-14 pl-13 pr-12 text-[17px]" : "h-11 pl-11 pr-10 text-sm"}`} />
      {valor && (
        <button type="button" onClick={() => onChange("")} aria-label="Limpar"
          className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-fundo text-suave hover:bg-tinta hover:text-white">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function CartaoProfissional({ p, especialidade, destaque, i, q = "", onAbrir }: {
  p: Profissional; especialidade?: string; destaque?: React.ReactNode; i: number; q?: string; onAbrir?: () => void;
}) {
  const { plano } = useStore();
  const hoje = useHoje();
  const atendeHoje = !!hoje && p.horarios.some((h) => h.dia === hoje);
  // restrições ligadas ao plano da ligação aparecem por extenso; as demais viram só a contagem
  const doPlano = plano ? p.restricoes.filter((r) => r.subtipoId === plano.subtipoId) : [];
  const outras = p.restricoes.length - doPlano.length;

  return (
    <Item i={i} className="h-full">
      <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={MOLA} className="h-full">
        <Link href={`/profissionais/${p.id}`} onClick={onAbrir}
          className="cartao group flex h-full w-full flex-col gap-4 p-5 text-left transition-shadow hover:shadow-elevado">
          <div className="flex items-center gap-3">
            <Avatar nome={p.nome} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-bold leading-snug"><Destaque texto={p.nome} q={q} /></p>
              {especialidade && <p className="text-sm text-suave">{especialidade}</p>}
            </div>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fundo text-suave transition-colors group-hover:bg-tinta group-hover:text-white">
              <Icones.ArrowUpRight className="size-4" />
            </span>
          </div>
          {/* dias e horários ficam no cartão: a atendente decide sem abrir a ficha */}
          <FaixaSemana horarios={p.horarios} hoje={hoje} />
          {/* chips e destaque colam no rodapé: cartões da mesma linha ficam alinhados */}
          {(atendeHoje || p.restricoes.length > 0 || p.valor) && (
            <div className="mt-auto flex flex-wrap items-center gap-1.5">
              {atendeHoje && <Chip tom="mata"><span className="pulso size-1.5 rounded-full bg-mata" />Atende hoje</Chip>}
              {doPlano.map((r, k) => <Chip key={k} tom="sol"><Icones.TriangleAlert className="shrink-0" />{r.texto}</Chip>)}
              {outras > 0 && <Chip tom="sol"><Icones.TriangleAlert />{outras === 1 ? "1 restrição" : `${outras} restrições`}</Chip>}
              {p.valor && <Chip>Particular {p.valor}</Chip>}
            </div>
          )}
          {destaque && <div className="mt-auto">{destaque}</div>}
        </Link>
      </motion.div>
    </Item>
  );
}

// Semana em seis colunas: dia com atendimento em verde, hoje em destaque; sem atendimento, apagado
export function FaixaSemana({ horarios, hoje }: { horarios: Horario[]; hoje: string | null }) {
  if (!horarios.length) return <p className="text-sm text-suave">Horários não informados</p>;
  return (
    <div className="grid grid-cols-6 gap-1 text-center" aria-label="Dias e horários de atendimento">
      {DIAS.map((d) => {
        const h = horarios.find((x) => x.dia === d);
        const eHoje = d === hoje;
        return (
          <div key={d} title={h ? `${d} · ${h.inicio}–${h.fim}` : `${d}: não atende`}
            className={`rounded-xl py-1.5 ${h ? (eHoje ? "bg-mata text-white" : "bg-mata-claro text-mata") : "bg-fundo/80 text-suave/40"}`}>
            <p className="text-[11px] font-bold uppercase tracking-wide">{d}</p>
            {h
              ? <p className={`mt-0.5 text-xs leading-tight tabular-nums ${eHoje ? "text-white/90" : "text-texto"}`}>{h.inicio}<br />{h.fim}</p>
              : <p className="mt-0.5 text-xs leading-tight">—<br />&nbsp;</p>}
          </div>
        );
      })}
    </div>
  );
}

// Logo da clínica ou do convênio; sem imagem, mostra as iniciais sobre a cor
export function LogoMarca({ nome, logo, cor = "#0b7a73", tamanho = "md" }: {
  nome: string; logo?: string; cor?: string; tamanho?: "sm" | "md" | "lg" | "xl";
}) {
  const t = { sm: "size-6 rounded-lg text-[10px]", md: "size-9 rounded-xl text-xs", lg: "size-14 rounded-2xl text-base", xl: "h-20 w-44 rounded-2xl text-xl" }[tamanho];
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
    try { onChange(await reduzirImagem(arquivo)); } catch (e) { avisar((e as Error).message, true); }
  };
  return (
    <div className="flex items-center gap-4">
      <label className="pressionavel group relative cursor-pointer rounded-2xl" title="Escolher logo">
        <LogoMarca nome={nome || "?"} logo={valor} cor={cor} tamanho="xl" />
        <span className="absolute inset-0 grid place-items-center rounded-2xl bg-tinta/0 text-white opacity-0 transition group-hover:bg-tinta/50 group-hover:opacity-100">
          <Icones.ImageUp className="size-5" />
        </span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { escolher(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      <div className="text-sm">
        <p className="font-semibold">Logo</p>
        {valor && <button type="button" onClick={() => onChange(undefined)} className="mt-1 font-semibold text-acento hover:underline">Remover logo</button>}
      </div>
    </div>
  );
}

// Lista de pares rótulo/valor, como o rodapé dos cartões da referência
export function Linhas({ itens }: { itens: { rotulo: React.ReactNode; valor: React.ReactNode; tom?: "neutro" | "mata" | "acento" | "sol" | "perigo" }[] }) {
  const cor = { neutro: "text-texto", mata: "text-mata", acento: "text-acento-escuro", sol: "text-sol-escuro", perigo: "text-perigo" };
  return (
    <dl className="divide-y divide-borda/60 text-sm">
      {itens.map((x, k) => (
        <div key={k} className="flex items-center justify-between gap-3 py-2">
          <dt className="flex items-center gap-2 text-suave">{x.rotulo}</dt>
          <dd className={`font-bold tabular-nums ${cor[x.tom ?? "neutro"]}`}>{x.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
