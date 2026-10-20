"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, ClipboardList, Copy, FlaskConical, Info, Pencil, ShieldCheck, TriangleAlert, UserRound, X } from "lucide-react";
import { useStore, type Painel } from "@/lib/store";
import { atende, coberturaDaBusca, combina, subtipoInfo } from "@/lib/regras";
import type { DadosClinica, Exame, Profissional } from "@/lib/modelo";
import { Atualizado, Avatar, Botao, Chip, Filtro, Janela, LogoMarca, ObservacaoInterna, Secao, Vazio, useHoje } from "./ui";
import { Desdobra, Entrada, Item, Lista } from "./movimento";

export function Paineis() {
  const { painel, abrir, dados } = useStore();
  // mantém o conteúdo visível enquanto a janela some
  const [ultimo, setUltimo] = useState<Painel>(null);
  if (painel && painel !== ultimo) setUltimo(painel);
  const atual = painel ?? ultimo;

  return (
    <Janela aberta={!!painel} onFechar={() => abrir(null)} sobre="Exame"
      titulo={dados.exames.find((e) => e.id === atual?.id)?.nome ?? ""}>
      {atual && <FichaExame key={atual.id} id={atual.id} />}
    </Janela>
  );
}

// Quem realiza: exibe o médico de forma compacta (nome, especialidade, atende hoje) com detalhes expansíveis
function QuemRealiza({ p, cobre }: { p: Profissional; cobre: boolean }) {
  const { dados, plano } = useStore();
  const rede = plano ? subtipoInfo(dados, plano.subtipoId)?.subtipo : undefined;
  const [aberto, setAberto] = useState(false);
  const espNome = dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;
  const hoje = useHoje();
  const atendeHoje = !!hoje && p.horarios.some((h) => h.dia === hoje);
  const semNotas = !p.observacoes && !p.observacoesInternas && !p.restricoes.length && !p.idadeMinima;

  return (
    <div className={`cartao overflow-hidden transition-shadow ${aberto ? "shadow-elevado" : ""}`}>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        className="pressionavel flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <Avatar nome={p.nome} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-1 text-sm font-semibold text-texto">{p.nome}</span>
          {espNome && <span className="block text-xs text-suave">{espNome}</span>}
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {atendeHoje && (
              <Chip tom="mata">
                <span className="pulso size-1.5 rounded-full bg-mata" />
                Atende hoje
              </Chip>
            )}
            {p.restricoes.length > 0 && (
              <Chip tom="sol">
                {p.restricoes.length === 1 ? "1 restrição" : `${p.restricoes.length} restrições`}
              </Chip>
            )}
            {plano && rede && cobre && (
              atende(p, plano.subtipoId, "exame")
                ? <Chip tom="mata">Faz pelo {rede.nome}</Chip>
                : <Chip tom="perigo">Não faz pelo {rede.nome}</Chip>
            )}
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-suave transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
      </button>

      <Desdobra aberto={aberto}>
        <div className="space-y-2.5 border-t border-borda/60 p-4 text-sm">
          {p.idadeMinima && <Chip>A partir de {p.idadeMinima} anos</Chip>}
          {p.restricoes.map((r, k) => {
            const info = r.subtipoId ? subtipoInfo(dados, r.subtipoId) : undefined;
            return (
              <p key={k} className="flex gap-2 rounded-2xl bg-sol-claro px-3 py-2 text-xs font-medium text-sol-escuro">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>{r.texto}{info && <span className="ml-1 opacity-75">· {info.convenio.nome} · {info.subtipo.nome}</span>}</span>
              </p>
            );
          })}
          {p.observacoes && <p className="whitespace-pre-line rounded-2xl bg-fundo p-3 text-xs leading-relaxed text-texto">{p.observacoes}</p>}
          <ObservacaoInterna texto={p.observacoesInternas} />
          {semNotas && <p className="text-xs text-suave">Sem observações cadastradas.</p>}
          <div className="pt-1">
            <Link href={`/profissionais/${p.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-mata hover:underline">
              Abrir ficha do médico <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Desdobra>
    </div>
  );
}

function FichaExame({ id }: { id: string }) {
  const { dados, podeEditarAtual, abrirForm, avisar, plano } = useStore();
  const ex = dados.exames.find((e) => e.id === id);
  if (!ex) return null;
  const info = plano ? subtipoInfo(dados, plano.subtipoId) : undefined;
  const cobre = !!plano && ex.subtipos.includes(plano.subtipoId);
  const quemFaz = dados.profissionais.filter((p) => p.exames.includes(ex.id));

  const copiar = async () => {
    const texto = [
      ex.nome,
      ex.preparo.length ? `Preparo:\n${ex.preparo.map((x, i) => `${i + 1}. ${x}`).join("\n")}` : "",
      ex.documentos ? `Trazer: ${ex.documentos}` : "",
      ex.valor ? `Valor particular: ${ex.valor}` : "",
      ex.observacoes ? `Observações: ${ex.observacoes}` : "",
    ].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(texto); avisar("Orientações copiadas"); } catch { avisar("Não foi possível copiar", true); }
  };

  return (
    <div className="space-y-7 p-5 sm:p-6">
      {plano && info && (
        <Entrada>
          <div className={`flex items-center gap-4 p-5 ${cobre ? "cartao-mata" : "cartao-acento"}`}>
            <LogoMarca nome={info.convenio.nome} logo={info.convenio.logo} cor={info.convenio.cor} tamanho="lg" />
            <div className="min-w-0 flex-1">
              <p className="rotulo !text-current opacity-70">{info.convenio.nome} · {info.subtipo.nome}</p>
              <p className="mt-1 flex items-start gap-2 text-2xl font-semibold leading-tight tracking-[-0.02em]">
                {cobre ? <Check className="mt-1 size-6 shrink-0" /> : <X className="mt-1 size-6 shrink-0" />}
                <span>{cobre ? "O plano cobre este exame" : "O plano não cobre este exame"}</span>
              </p>
            </div>
          </div>
        </Entrada>
      )}

      <Entrada i={1} className="cartao flex flex-wrap items-end justify-between gap-4 p-5">
        {/* a resposta mais pedida na ligação: quanto custa sem convênio */}
        <div>
          <p className="rotulo flex items-center gap-1.5"><FlaskConical className="size-3.5" />Valor particular</p>
          {ex.valor
            ? <p className="numero mt-1 text-3xl">{ex.valor}</p>
            : <p className="mt-1 text-lg font-semibold text-suave">Consulte a recepção</p>}
          <div className="mt-2"><Atualizado em={ex.atualizadoEm} por={ex.atualizadoPor} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao onClick={copiar}><Copy />Copiar orientações</Botao>
          {podeEditarAtual && <Botao variante="secundario" onClick={() => abrirForm({ tipo: "exame", id: ex.id })}><Pencil />Editar</Botao>}
        </div>
      </Entrada>

      {ex.observacoes && (
        <Entrada i={2} className="flex gap-3 whitespace-pre-line rounded-3xl bg-sol-claro px-5 py-4 text-[15px] text-sol-escuro">
          <Info className="mt-0.5 size-4 shrink-0" />{ex.observacoes}
        </Entrada>
      )}
      <ObservacaoInterna texto={ex.observacoesInternas} />

      <Secao titulo="Convênios que cobrem" icone={<ShieldCheck />} i={3}>
        <ChecadorConveniosExame ex={ex} dados={dados} />
      </Secao>

      <Secao titulo="Preparo do paciente" icone={<ClipboardList />} i={4}>
        {ex.preparo.length ? (
          <Lista className="space-y-2">
            {ex.preparo.map((passo, k) => (
              <Item key={k} className="cartao flex items-start gap-3 px-4 py-3.5 text-[15px]">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tinta text-xs font-bold tabular-nums text-white">{k + 1}</span>
                <span className="pt-0.5">{passo}</span>
              </Item>
            ))}
          </Lista>
        ) : !ex.documentos && <Vazio icone={<ClipboardList />} texto="Sem preparo cadastrado." />}
        {ex.documentos && (
          <div className={`cartao-sol px-5 py-4 ${ex.preparo.length ? "mt-3" : ""}`}>
            <p className="rotulo !text-current opacity-70">Trazer</p>
            <p className="mt-1 text-[15px] font-semibold">{ex.documentos}</p>
          </div>
        )}
      </Secao>

      <Secao titulo={`Quem realiza (${quemFaz.length})`} icone={<UserRound />} i={5}>
        <ChecadorMedicosExame ex={ex} dados={dados} cobre={cobre} />
      </Secao>
    </div>
  );
}

// Checador de convênios para o exame: permite pesquisar qualquer convênio da clínica
function ChecadorConveniosExame({ ex, dados }: { ex: Exame; dados: DadosClinica }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const porConvenio = useMemo(() => {
    return dados.convenios
      .map((c) => ({ c, subs: c.subtipos.filter((s) => ex.subtipos.includes(s.id)) }))
      .filter((x) => x.subs.length > 0);
  }, [dados.convenios, ex.subtipos]);

  const q = busca.trim();
  const resultadoBusca = useMemo(
    () => (q ? coberturaDaBusca(dados.convenios, (s) => ex.subtipos.includes(s.id), q) : null),
    [dados.convenios, ex.subtipos, q],
  );

  if (!dados.convenios.length) return <Vazio icone={<ShieldCheck />} texto="Nenhum convênio cadastrado nesta clínica." />;

  return (
    <div className="space-y-3">
      <Filtro valor={busca} onChange={setBusca} placeholder={`Pesquisar se um convênio cobre este exame (${porConvenio.length} credenciados)`} />

      {resultadoBusca ? (
        resultadoBusca.length === 0 ? (
          <Vazio icone={<ShieldCheck />} texto={`Nenhum convênio ou rede com “${q}” nesta unidade.`} />
        ) : (
          <Lista className="space-y-2">
            {resultadoBusca.map(({ convenio: c, cobre, naoCobre }) => (
              <Item key={c.id} className={`cartao space-y-2 p-4 ${cobre.length ? "" : "opacity-70"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />{c.nome}
                  </span>
                  {cobre.length > 0 ? (
                    <Chip tom="mata"><Check />Cobre ({cobre.length})</Chip>
                  ) : (
                    <Chip tom="neutro">Não cobre este exame</Chip>
                  )}
                </div>
                {cobre.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cobre.map((s) => <Chip key={s.id} tom="mata">{s.nome}</Chip>)}
                  </div>
                )}
                {naoCobre.length > 0 && cobre.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 text-xs text-suave">
                    <span className="mr-1 self-center text-xs font-medium text-suave">Demais redes sem cobertura:</span>
                    {naoCobre.map((s) => <span key={s.id} className="rounded-full bg-fundo px-2 py-0.5 text-xs text-suave">{s.nome}</span>)}
                  </div>
                )}
              </Item>
            ))}
          </Lista>
        )
      ) : porConvenio.length > 0 ? (
        <Lista className="space-y-2">
          {porConvenio.map(({ c, subs }) => {
            const sel = aberto === c.id;
            return (
              <Item key={c.id} className={`cartao overflow-hidden transition-shadow ${sel ? "shadow-elevado" : ""}`}>
                <button
                  type="button"
                  aria-expanded={sel}
                  onClick={() => setAberto(sel ? null : c.id)}
                  className="pressionavel flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <LogoMarca nome={c.nome} logo={c.logo} cor={c.cor} tamanho="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.nome}</span>
                  <Chip tom="mata">{subs.length} {subs.length === 1 ? "rede" : "redes"}</Chip>
                  <ChevronDown className={`size-4 shrink-0 text-suave transition-transform duration-200 ${sel ? "rotate-180" : ""}`} />
                </button>
                <Desdobra aberto={sel}>
                  <div className="flex flex-wrap gap-1.5 border-t border-borda/60 p-3.5">
                    {subs.map((s) => <Chip key={s.id} tom="mata">{s.nome}</Chip>)}
                  </div>
                </Desdobra>
              </Item>
            );
          })}
        </Lista>
      ) : (
        <Vazio icone={<ShieldCheck />} texto="Nenhum convênio vinculado a este exame (apenas particular). Use a busca acima para verificar qualquer convênio da clínica." />
      )}
    </div>
  );
}

// Checador de médicos para o exame: pesquisa qualquer médico da clínica para saber se realiza este exame
function ChecadorMedicosExame({
  ex,
  dados,
  cobre,
}: {
  ex: Exame;
  dados: DadosClinica;
  cobre: boolean;
}) {
  const [busca, setBusca] = useState("");
  const q = busca.trim();

  const quemFaz = useMemo(
    () => dados.profissionais.filter((p) => p.exames.includes(ex.id)),
    [dados.profissionais, ex.id],
  );

  const hoje = useHoje();

  const resultadoBusca = useMemo(() => {
    if (!q) return null;
    return dados.profissionais
      .filter((p) => combina(p.nome, q))
      .map((p) => {
        const faz = p.exames.includes(ex.id);
        const espNome = dados.especialidades.find((e) => e.id === p.especialidadeId)?.nome;
        const atendeHoje = hoje ? p.horarios.some((h) => h.dia === hoje) : false;
        return { p, faz, espNome, atendeHoje };
      });
  }, [dados.profissionais, dados.especialidades, ex.id, hoje, q]);

  return (
    <div className="space-y-3">
      <Filtro valor={busca} onChange={setBusca} placeholder={`Pesquisar se um médico realiza este exame (${quemFaz.length} vinculados)`} />

      {resultadoBusca ? (
        resultadoBusca.length === 0 ? (
          <Vazio icone={<UserRound />} texto={`Nenhum profissional com “${q}” nesta clínica.`} />
        ) : (
          <Lista className="space-y-2">
            {resultadoBusca.map(({ p, faz, espNome, atendeHoje }) => (
              <Item key={p.id} className={`cartao p-4 ${faz ? "" : "opacity-70"}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar nome={p.nome} />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold text-texto">{p.nome}</p>
                      {espNome && <p className="truncate text-xs text-suave">{espNome}</p>}
                    </div>
                  </div>
                  {faz ? (
                    <Chip tom="mata">
                      <Check /> Realiza este exame
                    </Chip>
                  ) : (
                    <Chip tom="neutro">Não vinculado</Chip>
                  )}
                </div>

                {faz && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-borda/40 pt-2 text-xs">
                    {atendeHoje && (
                      <Chip tom="mata">
                        <span className="pulso size-1.5 rounded-full bg-mata" /> Atende hoje
                      </Chip>
                    )}
                    {p.restricoes.length > 0 && (
                      <Chip tom="sol">
                        {p.restricoes.length === 1 ? "1 restrição" : `${p.restricoes.length} restrições`}
                      </Chip>
                    )}
                    <Link
                      href={`/profissionais/${p.id}`}
                      className="ml-auto font-semibold text-mata hover:underline"
                    >
                      Ver ficha &rarr;
                    </Link>
                  </div>
                )}
              </Item>
            ))}
          </Lista>
        )
      ) : quemFaz.length > 0 ? (
        <Lista className="space-y-2">
          {quemFaz.map((p) => (
            <Item key={p.id}><QuemRealiza p={p} cobre={cobre} /></Item>
          ))}
        </Lista>
      ) : (
        <Vazio icone={<UserRound />} texto="Nenhum profissional vinculado a este exame. Use a busca acima para verificar qualquer médico." />
      )}
    </div>
  );
}
