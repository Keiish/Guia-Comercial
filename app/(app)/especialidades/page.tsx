"use client";

import { useState } from "react";
import { CalendarCheck, Plus, Stethoscope, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { Botao, CabecalhoPagina, CartaoProfissional, Chip, Icone, Indicador, Indicadores, Vazio, iconeDaEspecialidade, useHoje } from "@/components/ui";
import { PilhaAvatares } from "@/components/pilha-avatares";
import { AnimatePresence, Entrada, Item, Lista, MOLA, motion } from "@/components/movimento";

export default function Especialidades() {
  const { dados, podeEditarAtual, abrirForm } = useStore();
  const hoje = useHoje();
  const [escolhida, setSel] = useState("");
  // sem escolha (ou escolha que sumiu) cai na primeira, inclusive a recém-cadastrada
  const sel = dados.especialidades.some((e) => e.id === escolhida) ? escolhida : dados.especialidades[0]?.id ?? "";
  const atual = dados.especialidades.find((e) => e.id === sel);
  const lista = dados.profissionais.filter((p) => p.especialidadeId === sel);
  const atendemHoje = hoje ? dados.profissionais.filter((p) => p.horarios.some((h) => h.dia === hoje)).length : 0;

  return (
    <div>
      <CabecalhoPagina titulo="Especialidades" sub="Escolha a especialidade para ver os profissionais e o que cada um faz."
        acao={podeEditarAtual && (
          <>
            <Botao variante="secundario" onClick={() => abrirForm({ tipo: "especialidade" })}><Plus />Especialidade</Botao>
            <Botao onClick={() => abrirForm({ tipo: "profissional" })}><Plus />Profissional</Botao>
          </>
        )} />

      <Indicadores>
        <Indicador icone={<Stethoscope />} valor={dados.especialidades.length} rotulo="especialidades" />
        <Indicador i={1} icone={<Users />} valor={dados.profissionais.length} rotulo="profissionais" tom="acento" />
        <Indicador i={2} icone={<CalendarCheck />} valor={atendemHoje} rotulo="atendem hoje" tom="mata" />
      </Indicadores>

      {!dados.especialidades.length && <Vazio icone={<Stethoscope />} texto="Nenhuma especialidade cadastrada." />}

      <Lista className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {dados.especialidades.map((e) => {
          const doGrupo = dados.profissionais.filter((p) => p.especialidadeId === e.id);
          const n = doGrupo.length;
          const ativa = e.id === sel;
          return (
            <Item key={e.id}>
              <motion.button type="button" onClick={() => setSel(e.id)} aria-pressed={ativa} whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }} transition={MOLA}
                className={`relative flex w-full items-center gap-3 overflow-hidden rounded-full p-2.5 pr-5 text-left transition-colors ${ativa ? "bg-tinta text-white" : "cartao text-texto"}`}>
                {ativa && <motion.span layoutId="especialidade-ativa" transition={MOLA} className="absolute inset-0 bg-tinta" />}
                <span className={`relative grid size-11 shrink-0 place-items-center rounded-full transition-colors ${ativa ? "bg-white/15 text-white" : "bg-fundo text-texto"}`}>
                  <Icone nome={iconeDaEspecialidade(e)} className="size-5" />
                </span>
                <span className="relative min-w-0">
                  <span className="block truncate text-sm font-semibold">{e.nome}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={`text-xs tabular-nums ${ativa ? "text-white/70" : "text-suave"}`}>{n} {n === 1 ? "profissional" : "profissionais"}</span>
                    <PilhaAvatares nomes={doGrupo.map((p) => p.nome)} max={3} />
                  </span>
                </span>
              </motion.button>
            </Item>
          );
        })}
      </Lista>

      {atual && (
        <section className="mt-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={sel} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}>
              <Entrada className="mb-5 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-[-0.02em]">{atual.nome}</h2>
                <Chip tom="acento">{lista.length} {lista.length === 1 ? "profissional" : "profissionais"}</Chip>
                {podeEditarAtual && <Botao variante="secundario" tamanho="sm" onClick={() => abrirForm({ tipo: "especialidade", id: atual.id })}>Editar</Botao>}
              </Entrada>
              {lista.length ? (
                <Lista className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((p, i) => (
                    <CartaoProfissional key={p.id} p={p} i={i}
                      destaque={
                        <div className="flex flex-wrap gap-1.5 border-t border-borda pt-3">
                          {p.procedimentos.length
                            ? p.procedimentos.map((x) => <Chip key={x}>{x}</Chip>)
                            : <span className="text-xs text-suave">Só consulta</span>}
                        </div>
                      } />
                  ))}
                </Lista>
              ) : <Vazio icone={<Users />} texto="Nenhum profissional." />}
            </motion.div>
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}
