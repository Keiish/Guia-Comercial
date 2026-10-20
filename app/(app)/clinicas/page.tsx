"use client";

import { Building2, Pencil, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { podeCriarClinica, podeEditar, podeGerenciarUnidades } from "@/lib/permissoes";
import { Botao, CabecalhoPagina, LogoMarca, Vazio } from "@/components/ui";
import { Item, Lista } from "@/components/movimento";

// Edição das unidades, separada da tela inicial para ela ficar só de consulta
export default function Clinicas() {
  const { banco, usuario, clinicas, abrirForm } = useStore();
  if (!usuario || !podeGerenciarUnidades(usuario)) return <Vazio icone={<Building2 />} texto="Seu usuário só consulta as unidades." />;
  const criar = podeCriarClinica(usuario);
  // Administrador e Comercial também veem organizações ainda sem clínica
  const orgs = banco.organizacoes.filter((o) => criar || clinicas.some((c) => c.organizacaoId === o.id));

  return (
    <div>
      <CabecalhoPagina titulo="Gerenciar unidades" voltar={{ href: "/", rotulo: "Unidades" }}
        acao={criar && (
          <>
            <Botao variante="secundario" onClick={() => abrirForm({ tipo: "organizacao" })}><Plus />Organização</Botao>
            <Botao onClick={() => abrirForm({ tipo: "clinica" })}><Plus />Clínica</Botao>
          </>
        )} />

      {!orgs.length && <Vazio icone={<Building2 />} texto="Nenhuma organização cadastrada." />}
      <Lista className="space-y-5">
        {orgs.map((o) => {
          const daOrg = clinicas.filter((c) => c.organizacaoId === o.id);
          return (
            <Item key={o.id}>
              <section className="cartao overflow-hidden">
                <h2 className="rotulo border-b border-borda/60 px-6 py-4">{o.nome}</h2>
                {daOrg.length ? daOrg.map((c, k) => (
                  <div key={c.id} className={`flex items-center gap-4 px-6 py-4 ${k ? "border-t border-borda/60" : ""}`}>
                    <span className="grid h-12 w-24 shrink-0 place-items-center">
                      {c.logo
                        // eslint-disable-next-line @next/next/no-img-element -- data URL ou arquivo local
                        ? <img src={c.logo} alt={`Logo ${c.nome}`} className="max-h-10 max-w-full object-contain" />
                        : <LogoMarca nome={c.nome} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{c.nome}</span>
                    {podeEditar(usuario, c.id) && (
                      <Botao variante="secundario" onClick={() => abrirForm({ tipo: "clinica", id: c.id })}><Pencil />Editar</Botao>
                    )}
                  </div>
                )) : <p className="px-6 py-5 text-sm text-suave">Nenhuma clínica nesta organização.</p>}
              </section>
            </Item>
          );
        })}
      </Lista>
    </div>
  );
}
