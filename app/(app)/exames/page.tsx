"use client";

import { useState } from "react";
import { FlaskConical, Plus, Stethoscope, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { combina, idsDeRedes, pontuacao } from "@/lib/regras";
import { Botao, CabecalhoPagina, Chip, Filtro, Indicador, Indicadores, Vazio } from "@/components/ui";
import { Entrada, Item, Lista, MOLA, motion } from "@/components/movimento";

export default function Exames() {
  const { dados, plano, podeEditarAtual, abrir, abrirForm } = useStore();
  const [q, setQ] = useState("");
  const validos = idsDeRedes(dados);
  const lista = dados.exames.filter((e) => combina(e.nome, q))
    .sort((a, b) => q.trim() ? pontuacao(b.nome, q) - pontuacao(a.nome, q) : a.nome.localeCompare(b.nome, "pt-BR"));
  const comValor = dados.exames.filter((e) => e.valor?.trim()).length;
  const comMedico = dados.exames.filter((e) => dados.profissionais.some((p) => p.exames.includes(e.id))).length;

  return (
    <div>
      <CabecalhoPagina titulo="Exames" sub="Valor particular, médicos que fazem e convênios que cobrem."
        acao={podeEditarAtual && <Botao onClick={() => abrirForm({ tipo: "exame" })}><Plus />Exame</Botao>} />

      <Indicadores>
        <Indicador icone={<FlaskConical />} valor={dados.exames.length} rotulo="exames" tom="acento" />
        <Indicador i={1} icone={<Wallet />} valor={comValor} rotulo="com valor cadastrado" tom="mata" />
        <Indicador i={2} icone={<Stethoscope />} valor={comMedico} rotulo="com médico vinculado" />
      </Indicadores>

      <Entrada i={2} className="mb-6 max-w-md"><Filtro valor={q} onChange={setQ} placeholder="Filtrar exames" /></Entrada>

      <Lista className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((e) => {
          const redes = e.subtipos.filter((id) => validos.has(id));
          const convenios = dados.convenios.filter((c) => c.subtipos.some((st) => redes.includes(st.id))).length;
          const medicos = dados.profissionais.filter((p) => p.exames.includes(e.id)).length;
          const cobre = plano ? e.subtipos.includes(plano.subtipoId) : null;
          return (
            <Item key={e.id} className="h-full">
              <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={MOLA} className="h-full">
                <button type="button" onClick={() => abrir({ tipo: "exame", id: e.id })}
                  className="cartao flex h-full w-full flex-col gap-3 p-5 text-left transition-shadow hover:shadow-elevado">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acento-claro text-acento-escuro"><FlaskConical className="size-[18px]" /></span>
                    <p className="line-clamp-2 min-w-0 flex-1 pt-2 font-semibold leading-snug">{e.nome}</p>
                  </div>
                  {/* mesma altura nos dois casos: os cartões da linha alinham */}
                  <div>
                    <p className="rotulo">Valor particular</p>
                    {e.valor?.trim()
                      ? <p className="numero text-2xl">{e.valor}</p>
                      : <p className="text-2xl font-semibold leading-8 text-suave/60">—</p>}
                  </div>
                  <p className="text-sm text-suave">
                    <b className="text-texto">{medicos}</b> {medicos === 1 ? "médico" : "médicos"} · cobre <b className="text-texto">{convenios}</b> {convenios === 1 ? "convênio" : "convênios"}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    {!e.valor?.trim() && <Chip>Valor não cadastrado</Chip>}
                    {!convenios && <Chip>Sem convênio cadastrado</Chip>}
                    {!medicos && <Chip tom="sol">Nenhum médico vinculado</Chip>}
                    {cobre != null && (cobre ? <Chip tom="mata" solido>Cobre</Chip> : <Chip tom="perigo" solido>Não cobre</Chip>)}
                  </div>
                </button>
              </motion.div>
            </Item>
          );
        })}
      </Lista>
      {!lista.length && <Vazio icone={<FlaskConical />} texto={dados.exames.length ? "Nenhum exame com esse nome." : "Nenhum exame cadastrado."} />}
    </div>
  );
}
