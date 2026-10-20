"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Network, Plus, ShieldAlert, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import { useStore } from "@/lib/store";
import { combina, gruposPlanosDoConvenio, novoId, observacoesDoConvenio, resumoRedes } from "@/lib/regras";
import { salvarConvenio } from "@/lib/repositorio";
import type { Convenio } from "@/lib/modelo";
import { Botao, CabecalhoPagina, Filtro, Indicador, Indicadores, Linhas, LogoMarca, Vazio } from "@/components/ui";
import { PilhaAvatares } from "@/components/pilha-avatares";
import { Entrada, Item, Lista, MOLA, motion } from "@/components/movimento";

export default function Convenios() {
  const { dados, clinica, podeEditarAtual, abrirForm, executar } = useStore();
  const [busca, setBusca] = useState("");

  const conveniosFiltrados = dados.convenios.filter((c) =>
    combina(c.nome, busca)
  );

  // totais da unidade para os indicadores do topo
  const todasRedes = dados.convenios.flatMap((c) => resumoRedes(c, dados));
  const redesComMedico = todasRedes.filter((r) => r.consultas || r.exames).length;

  const criarConvenioModelo = () => {
    if (!clinica) return;
    const convId = novoId("conv");
    const modelo: Convenio = {
      id: convId,
      clinicaId: clinica.id,
      nome: "Saúde Mais",
      cor: "#0b7a69",
      subtipos: [
        { id: `${convId}-essencial`, nome: "Essencial" },
        { id: `${convId}-prime`, nome: "Prime" },
        { id: `${convId}-select`, nome: "Select" },
        { id: `${convId}-preferencial`, nome: "Preferencial" },
        { id: `${convId}-facil`, nome: "Fácil" },
      ],
      gruposPlanos: [
        {
          status: "atende",
          titulo: "Atende consultas e exames",
          planos: [
            "Essencial",
            "Prime",
            "Select",
            "Quality",
            "Flex Empresarial",
            "Compacto",
            "Intercâmbio",
            "Federação",
          ],
        },
        {
          status: "somente_exames",
          titulo: "Somente exames",
          nota: "Não precisa de encaminhamento para a clínica",
          planos: ["Preferencial", "Fácil", "Prático", "Pleno", "Flex"],
        },
        {
          status: "nao_atende",
          titulo: "Não atendemos",
          planos: ["Life", "Ser"],
        },
      ],
      observacoesGerais: [
        "Procedimentos ginecológicos não precisam de pacote",
        "Biópsia: apenas autorização do procedimento",
        "Documentação por e-mail de autorização",
      ],
    };

    executar((b, u) => salvarConvenio(b, u, modelo), "Convênio de exemplo (fictício) adicionado. Apague antes de usar com dados reais.");
  };

  return (
    <div>
      <CabecalhoPagina
        titulo="Convênios e manuais de atendimento"
        acao={
          podeEditarAtual && (
            <>
              {dados.convenios.length === 0 && (
                <Botao variante="secundario" onClick={criarConvenioModelo}>
                  <Sparkles />
                  Inserir exemplo fictício (Saúde Mais)
                </Botao>
              )}
              <Botao onClick={() => abrirForm({ tipo: "convenio" })}>
                <Plus />
                Novo convênio
              </Botao>
            </>
          )
        }
      />

      <Indicadores>
        <Indicador icone={<ShieldCheck />} valor={dados.convenios.length} rotulo="Convênios" />
        <Indicador icone={<Network />} valor={todasRedes.length} rotulo="Redes cadastradas" tom="acento" i={1} />
        <Indicador icone={<Stethoscope />} valor={redesComMedico} rotulo="Redes com médico" tom="mata" i={2} />
      </Indicadores>

      <Entrada i={4} className="mb-6 max-w-md">
        <Filtro valor={busca} onChange={setBusca} placeholder="Buscar convênio por nome..." />
      </Entrada>

      {conveniosFiltrados.length > 0 ? (
        <Lista className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {conveniosFiltrados.map((conv) => {
            const grupos = gruposPlanosDoConvenio(conv);
            const obs = observacoesDoConvenio(conv);
            const gAtende = grupos.find((g) => g.status === "atende");
            const gSomente = grupos.find((g) => g.status === "somente_exames");
            const gNao = grupos.find((g) => g.status === "nao_atende");

            const countAtende = gAtende?.planos.length ?? 0;
            const countSomente = gSomente?.planos.length ?? 0;
            const countNao = gNao?.planos.length ?? 0;
            const redes = resumoRedes(conv, dados);
            const comMedico = redes.filter((r) => r.consultas || r.exames).length;
            const quemAtende = dados.profissionais.filter((p) => conv.subtipos.some((s) => p.atende[s.id])).map((p) => p.nome);
            const gruposVazios = !countAtende && !countSomente && !countNao;

            return (
              <Item key={conv.id} className="h-full">
                <motion.div whileHover={{ y: -4 }} whileTap={{ scale: 0.985 }} transition={MOLA} className="h-full">
                  <Link
                    href={`/convenios/${conv.id}`}
                    className="cartao group flex h-full flex-col gap-5 p-6 transition-shadow hover:shadow-elevado"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <LogoMarca nome={conv.nome} logo={conv.logo} cor={conv.cor} tamanho="lg" />
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fundo text-suave transition-colors group-hover:bg-tinta group-hover:text-white">
                        <ArrowUpRight className="size-4" />
                      </span>
                    </div>

                    <div>
                      <h2 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-texto">{conv.nome}</h2>
                      <p className="mt-1 text-sm text-suave">Manual e regras da carteirinha</p>
                    </div>

                    <PilhaAvatares nomes={quemAtende} />

                    <div className="mt-auto">
                      <Linhas
                        itens={[
                          { rotulo: "Redes cadastradas", valor: redes.length },
                          { rotulo: "Redes com médico", valor: comMedico, tom: comMedico ? "neutro" : "sol" },
                          ...(gruposVazios ? [] : [
                            { rotulo: "Consultas e exames", valor: `${countAtende} planos`, tom: "mata" as const },
                            { rotulo: "Somente exames", valor: `${countSomente} planos`, tom: "sol" as const },
                            ...(countNao > 0 ? [{ rotulo: "Não atendidos", valor: `${countNao} planos`, tom: "perigo" as const }] : []),
                          ]),
                          // linha sempre presente: os rodapés dos cartões ficam na mesma altura
                          {
                            rotulo: <><ShieldAlert className={`size-3.5 ${obs.length ? "text-sol-escuro" : "text-suave/60"}`} />Regras operacionais</>,
                            valor: obs.length ? `${obs.length} ativas` : "nenhuma",
                          },
                        ]}
                      />
                    </div>
                  </Link>
                </motion.div>
              </Item>
            );
          })}
        </Lista>
      ) : (
        <Entrada i={5} className="space-y-4">
          <Vazio
            icone={<ShieldCheck />}
            texto={
              busca
                ? "Nenhum convênio encontrado com esse nome."
                : "Nenhum convênio cadastrado nesta unidade."
            }
          />
          {podeEditarAtual && !busca && (
            <div className="flex flex-wrap justify-center gap-3">
              <Botao onClick={criarConvenioModelo}>
                <Sparkles /> Inserir exemplo fictício (Saúde Mais)
              </Botao>
              <Botao variante="secundario" onClick={() => abrirForm({ tipo: "convenio" })}>
                <Plus /> Cadastrar novo convênio
              </Botao>
            </div>
          )}
        </Entrada>
      )}
    </div>
  );
}
