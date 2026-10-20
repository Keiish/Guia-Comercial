"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Building2, Settings2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { podeGerenciarUnidades } from "@/lib/permissoes";
import type { Clinica, Organizacao } from "@/lib/modelo";
import { Botao, CabecalhoPagina, LogoMarca, Segmentado, Vazio } from "@/components/ui";
import { AnimatePresence, Item, Lista, MOLA, motion } from "@/components/movimento";

// Uma organização = um cartão. Com várias clínicas (ex.: COMN / ONCY), elas viram abas dentro do cartão.
function CartaoOrganizacao({ org, lista }: { org: Organizacao; lista: Clinica[] }) {
  const { clinica, escolherClinica } = useStore();
  const router = useRouter();
  const [sel, setSel] = useState(clinica && lista.some((x) => x.id === clinica.id) ? clinica.id : lista[0].id);
  const c = lista.find((x) => x.id === sel) ?? lista[0];
  const atual = c.id === clinica?.id;
  const daOrg = lista.some((x) => x.id === clinica?.id);
  const abrir = () => {
    escolherClinica(c.id);
    router.push("/busca");
  };

  return (
    <Item className="h-full">
      <motion.section whileHover={{ y: -4 }} transition={MOLA}
        aria-label={org.nome}
        className={`group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-elevado ${daOrg ? "cartao-tinta shadow-trilho" : "cartao"}`}>
        {/* a unidade ativa ganha o cartão escuro com manchas de cor e a logo em branco */}
        {daOrg && (
          <>
            <div className="bolha pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-acento/40 blur-3xl" />
            <div className="bolha pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-mata/50 blur-3xl" style={{ animationDelay: "-5s" }} />
          </>
        )}
        {/* palco da logo: espaço grande sobre o fundo suave */}
        <div className={`relative m-3 mb-0 grid h-36 place-items-center rounded-[20px] px-6 ${daOrg ? "bg-white/5 ring-1 ring-white/10" : "bg-fundo"}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={c.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.2 }}
              className="flex h-full w-full items-center justify-center p-4">
              {c.logo
                // eslint-disable-next-line @next/next/no-img-element -- data URL ou arquivo local
                ? <img src={c.logo} alt={`Logo ${c.nome}`} className={`max-h-20 max-w-[85%] object-contain ${daOrg ? "brightness-0 invert" : ""}`} />
                : <LogoMarca nome={c.nome} tamanho="lg" />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative flex flex-1 flex-col gap-4 p-5">
          {/* abas e título ocupam a mesma altura, para os cartões vizinhos ficarem alinhados */}
          <div className="flex min-h-11 items-center">
            {lista.length > 1
              ? <div className="w-full"><Segmentado opcoes={lista.map((x) => ({ valor: x.id, rotulo: x.nome }))} valor={c.id} onChange={setSel} escuro={daOrg} /></div>
              : <h3 className="truncate text-lg font-semibold tracking-[-0.02em]">{c.nome}</h3>}
          </div>
          <Botao tamanho="lg" variante={daOrg ? "secundario" : "primario"} onClick={abrir} className="mt-auto w-full justify-between">
            {atual ? "Continuar na unidade" : "Entrar na unidade"}
            <ArrowUpRight />
          </Botao>
        </div>
      </motion.section>
    </Item>
  );
}

export default function UnidadesPage() {
  const { banco, usuario, clinicas, escolherClinica } = useStore();
  const router = useRouter();
  const unica = clinicas.length === 1 && usuario && !podeGerenciarUnidades(usuario) ? clinicas[0] : null;
  // Central e Recepção com uma unidade só não têm o que escolher: vão direto para a busca
  useEffect(() => {
    if (!unica) return;
    escolherClinica(unica.id);
    router.replace("/busca");
  }, [unica?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const orgs = banco.organizacoes.filter((o) => clinicas.some((c) => c.organizacaoId === o.id));

  return (
    <div>
      <CabecalhoPagina titulo="Guia Comercial" sub="Escolha a unidade para consultar médicos, exames e convênios."
        acao={usuario && podeGerenciarUnidades(usuario) && (
          <Link href="/clinicas" className="pressionavel inline-flex h-10 items-center gap-2 rounded-full bg-superficie px-4 text-sm font-semibold text-texto ring-1 ring-borda hover:bg-fundo">
            <Settings2 className="size-4" />Gerenciar unidades
          </Link>
        )} />

      {orgs.length === 0 ? (
        <Vazio icone={<Building2 />} texto="Nenhuma unidade vinculada ao seu usuário." />
      ) : (
        <Lista className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {orgs.map((o) => (
            <CartaoOrganizacao key={o.id} org={o} lista={clinicas.filter((c) => c.organizacaoId === o.id)} />
          ))}
        </Lista>
      )}
    </div>
  );
}
