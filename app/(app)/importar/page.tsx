"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, FileSpreadsheet } from "lucide-react";
import { useStore } from "@/lib/store";
import { importarRedes, importarRedesPorMedico } from "@/lib/repositorio";
import { slug } from "@/lib/regras";
import { decodificarCsv, lerTabela, planejarRedes, planejarRedesPorMedico, semCabecalho } from "@/lib/importar";
import { Botao, CabecalhoPagina, Chip, LogoMarca, SeletorBusca, Vazio } from "@/components/ui";
import { Entrada } from "@/components/movimento";

type Modo = "redes" | "medico";
const ROTULO = { c: "Consulta", e: "Exame", ce: "Consulta e exame" } as const;

// Número do passo num círculo preto
function Passo({ n, titulo, i }: { n: number; titulo: string; i: number }) {
  return (
    <Entrada i={i}>
      <h2 className="mb-3 flex items-center gap-3 text-base font-semibold tracking-[-0.01em]">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tinta text-xs font-bold tabular-nums text-white">{n}</span>
        {titulo}
      </h2>
    </Entrada>
  );
}

export default function Importar() {
  const { dados, podeEditarAtual, executar, avisar } = useStore();
  const router = useRouter();
  const [convenioId, setConvenioId] = useState("");
  const [modo, setModo] = useState<Modo>("redes");
  const [texto, setTexto] = useState("");

  const convenio = dados.convenios.find((c) => c.id === convenioId);
  const linhas = useMemo(() => semCabecalho(lerTabela(texto, modo === "redes" ? ["\t", ";"] : undefined)), [texto, modo]);
  const planoRedes = useMemo(() => convenio && modo === "redes" ? planejarRedes(convenio, linhas.map((l) => l[0])) : null, [convenio, modo, linhas]);
  const planoMedico = useMemo(() => convenio && modo === "medico" ? planejarRedesPorMedico(dados, linhas) : null, [convenio, modo, linhas, dados]);
  const novasPorMedico = useMemo(() => convenio && planoMedico ? planejarRedes(convenio, planoMedico.itens.map((i) => i.rede)).novas : [], [convenio, planoMedico]);
  const total = planoRedes ? planoRedes.novas.length : planoMedico ? planoMedico.itens.length : 0;

  if (!podeEditarAtual) return <div><CabecalhoPagina titulo="Importar redes" /><Vazio icone={<FileSpreadsheet />} texto="Só quem edita esta unidade pode importar." /></div>;

  const lerArquivo = async (arquivo?: File) => {
    if (!arquivo) return;
    try { setTexto(decodificarCsv(await arquivo.arrayBuffer())); } catch { avisar("Não deu para ler o arquivo. Cole as colunas aqui ou salve como CSV.", true); }
  };

  const importar = () => {
    if (!convenio || !total) return;
    const ok = planoRedes
      ? executar((b, u) => importarRedes(b, u, convenio.id, planoRedes.novas), `${total} ${unidade(total, true)}`, { desfazer: true, desfeito: "Importação desfeita" })
      : executar((b, u) => importarRedesPorMedico(b, u, convenio.id, planoMedico!.itens), `${total} ${unidade(total, true)}`, { desfazer: true, desfeito: "Importação desfeita" });
    if (ok) { setTexto(""); router.push("/convenios"); }
  };

  const unidade = (n: number, feito: boolean) => modo === "medico" ? (n === 1 ? "vínculo" : "vínculos") + (feito ? (n === 1 ? " importado" : " importados") : "") : (n === 1 ? "rede" : "redes") + (feito ? (n === 1 ? " importada" : " importadas") : "");
  const campo = "w-full rounded-3xl border border-dashed border-borda bg-superficie p-4 text-[15px] outline-none transition focus:border-tinta focus:ring-4 focus:ring-tinta/10";

  return (
    <div className="max-w-3xl">
      <CabecalhoPagina titulo="Importar redes" sub="Traga as redes de um convênio direto da planilha, em quatro passos." />
      <div className="space-y-8">
        <section>
          <Passo n={1} titulo="Convênio" i={1} />
          <SeletorBusca valor={convenioId} onChange={setConvenioId} vazio="Escolha o convênio" placeholder="Buscar convênio..."
            atual={convenio && <span className="flex items-center gap-2 font-medium text-texto"><LogoMarca nome={convenio.nome} logo={convenio.logo} cor={convenio.cor} tamanho="sm" />{convenio.nome}</span>}
            opcoes={dados.convenios.map((c) => ({ id: c.id, texto: c.nome, rotulo: c.nome }))} />
        </section>

        <section>
          <Passo n={2} titulo="O que a planilha tem" i={2} />
          <div className="flex flex-wrap gap-2">
            {([["redes", "Redes do convênio (uma por linha)"], ["medico", "Redes por médico (médico, rede, atendimento)"]] as const).map(([m, r]) => (
              <button key={m} type="button" onClick={() => setModo(m)} aria-pressed={modo === m}
                className={`pressionavel h-10 rounded-full px-4 text-sm font-semibold transition-colors ${modo === m ? "bg-tinta text-white shadow-card" : "bg-superficie text-suave ring-1 ring-borda hover:text-texto"}`}>{r}</button>
            ))}
          </div>
          {modo === "medico" && <p className="mt-3 text-xs text-suave">Atendimento é opcional: &quot;consulta&quot;, &quot;exame&quot; ou vazio/&quot;ambos&quot;. Coluna de atendimento vazia vale &quot;consulta e exame&quot;. O que o médico já tinha é mantido; a planilha só acrescenta.</p>}
        </section>

        <section>
          <Passo n={3} titulo="Cole da planilha" i={3} />
          <p className="mb-3 text-sm text-suave">No Excel, copie as colunas e cole aqui, ou salve como CSV e escolha o arquivo.</p>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} aria-label="Dados da planilha" className={campo}
            placeholder={modo === "redes" ? "Gold\nFlex\nNacional" : "Dra. Ana Lima\tGold\tconsulta\nDr. Bruno Reis\tNacional"} />
          <label className="pressionavel mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-superficie px-4 text-sm font-semibold ring-1 ring-borda hover:bg-fundo">
            <FileUp className="size-4" />Escolher arquivo .csv
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { lerArquivo(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
        </section>

        {texto.trim() && (
          <section aria-live="polite">
            <Passo n={4} titulo="Prévia" i={0} />
            {planoRedes && (
              <div className="cartao space-y-4 p-5">
                <p className="text-sm font-semibold tabular-nums">{planoRedes.novas.length} novas · {planoRedes.existentes.length} já existiam · {planoRedes.repetidas.length} repetidas</p>
                {([["Novas", planoRedes.novas, "mata"], ["Já existiam", planoRedes.existentes, "neutro"], ["Repetidas na planilha", planoRedes.repetidas, "sol"]] as const).map(([t, l, tom]) => l.length > 0 && (
                  <div key={t}><p className="rotulo mb-2">{t}</p><div className="flex flex-wrap gap-2">{l.map((n, i) => <Chip key={n + i} tom={tom}>{n}</Chip>)}</div></div>
                ))}
              </div>
            )}
            {planoMedico && (
              <div className="cartao space-y-4 p-5">
                {planoMedico.itens.length > 0 && (
                  <table className="w-full text-left text-sm">
                    <thead><tr className="rotulo"><th className="py-1 pr-3 font-semibold">Médico</th><th className="py-1 pr-3 font-semibold">Rede</th><th className="py-1 font-semibold">Atendimento</th></tr></thead>
                    <tbody>{planoMedico.itens.map((i, k) => (
                      <tr key={k} className="border-t border-borda/60"><td className="py-2 pr-3">{i.nomePlanilha === i.medico ? i.medico : <span className={slug(i.nomePlanilha) === slug(i.medico) ? "" : "text-sol-escuro"}>{i.nomePlanilha} → {i.medico}</span>}</td><td className="py-2 pr-3">{i.rede}</td><td className="py-2">{ROTULO[i.atendimento]}</td></tr>
                    ))}</tbody>
                  </table>
                )}
                {novasPorMedico.length > 0 && (
                  <div><p className="rotulo mb-2 normal-case tracking-normal">{novasPorMedico.length} {novasPorMedico.length === 1 ? "rede nova será criada" : "redes novas serão criadas"} no convênio</p>
                    <div className="flex flex-wrap gap-2">{novasPorMedico.map((n) => <Chip key={n} tom="mata">{n}</Chip>)}</div></div>
                )}
                {planoMedico.semMedico.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-semibold text-sol-escuro">Médicos não encontrados</p>
                    <p className="mb-2 text-xs text-suave">Confira o nome como está no cadastro.</p>
                    <div className="flex flex-wrap gap-2">{planoMedico.semMedico.map((n) => <Chip key={n} tom="sol">{n}</Chip>)}</div>
                  </div>
                )}
              </div>
            )}
            {!convenio ? <p className="mt-3 text-sm text-suave">Escolha o convênio para ver a prévia.</p> : null}
          </section>
        )}

        {convenio && texto.trim() && (
          total > 0 ? <Botao tamanho="lg" onClick={importar}>Importar {total} {unidade(total, false)}</Botao> : <p className="text-sm text-suave">Nada novo para importar.</p>
        )}
      </div>
    </div>
  );
}
