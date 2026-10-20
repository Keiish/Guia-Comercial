"use client";

import { useMemo, useState } from "react";
import { Building2, Download, Plus, RotateCcw, ShieldCheck, Upload, UserRound, Users } from "lucide-react";
import { useStore } from "@/lib/store";
import { PAPEIS, podeCriarUsuario } from "@/lib/permissoes";
import { exportarBackup, importarBackup, listarCopias, restaurarDemonstracao } from "@/lib/repositorio";
import { Avatar, Botao, CabecalhoPagina, Chip, Indicador, Indicadores, Vazio } from "@/components/ui";
import { Item, Lista } from "@/components/movimento";

export default function Usuarios() {
  const { banco, usuario, abrirForm, executar } = useStore();
  const [confirmando, setConfirmando] = useState(false);
  const [copia, setCopia] = useState<string | null>(null);
  const copias = useMemo(() => listarCopias(), []);
  if (!usuario || !podeCriarUsuario(usuario)) return <Vazio icone={<ShieldCheck />} texto="Só o Administrador gerencia usuários." />;

  const nomeClinica = (id: string) => banco.clinicas.find((c) => c.id === id)?.nome ?? id;
  const restaurar = () => {
    if (executar((b, u) => restaurarDemonstracao(b, u), "Demonstração restaurada")) setConfirmando(false);
  };

  const baixarTexto = (texto: string, nome: string) => {
    const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  };
  const baixar = () => baixarTexto(exportarBackup(banco), `cartilha-${new Date().toISOString().slice(0, 10)}.json`);
  const lerCopia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (arquivo) setCopia(await arquivo.text());
  };
  const restaurarCopia = () => {
    if (copia !== null && executar((b, u) => importarBackup(b, u, copia), "Cópia restaurada")) setCopia(null);
  };

  const editam = banco.usuarios.filter((u) => u.papel !== "recepcao" && u.papel !== "central").length;
  const porUnidade = banco.usuarios.filter((u) => u.clinicas.length > 0).length;

  return (
    <div>
      <CabecalhoPagina titulo="Usuários" sub="Quem acessa o guia e a quais unidades cada pessoa tem acesso."
        acao={<Botao onClick={() => abrirForm({ tipo: "usuario" })}><Plus />Usuário</Botao>} />

      <Indicadores>
        <Indicador icone={<Users />} valor={banco.usuarios.length} rotulo="usuários" />
        <Indicador i={1} icone={<ShieldCheck />} valor={editam} rotulo="editam tudo (admin e comercial)" tom="mata" />
        <Indicador i={2} icone={<Building2 />} valor={porUnidade} rotulo="vinculados a unidades" tom="acento" />
      </Indicadores>

      <Lista className="cartao divide-y divide-borda/60 overflow-hidden">
        {banco.usuarios.map((u) => (
          <Item key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
            <Avatar nome={u.nome} />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{u.nome}</span>
              <span className="block truncate text-sm text-suave">{u.email}</span>
            </span>
            <span className="flex flex-wrap gap-2">
              <Chip tom={u.papel === "recepcao" || u.papel === "central" ? "neutro" : "mata"}>{u.clinicas.length ? <UserRound /> : <ShieldCheck />}{PAPEIS[u.papel].rotulo}</Chip>
              {u.clinicas.length
                ? u.clinicas.map((id) => <Chip key={id} tom="acento"><Building2 />{nomeClinica(id)}</Chip>)
                : <Chip tom="acento">Todas as clínicas</Chip>}
            </span>
            <Botao variante="secundario" onClick={() => abrirForm({ tipo: "usuario", id: u.id })}>Editar</Botao>
          </Item>
        ))}
      </Lista>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Item i={3} className="h-full">
          <section className="cartao h-full p-6">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">Cópia de segurança</h2>
            <p className="mt-1 text-sm text-suave">Os dados ficam só neste navegador. Baixe uma cópia de vez em quando.</p>
            {copia !== null ? (
              <div className="cartao-sol mt-4 flex flex-wrap items-center gap-3 p-4">
                <p className="flex-1 text-sm font-semibold">Isto substitui todos os dados deste navegador. Restaurar?</p>
                <Botao variante="secundario" onClick={() => setCopia(null)}>Cancelar</Botao>
                <Botao onClick={restaurarCopia}><Upload />Restaurar</Botao>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Botao variante="secundario" onClick={baixar}><Download />Baixar cópia</Botao>
                <label className="pressionavel inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-superficie px-4 text-sm font-semibold ring-1 ring-borda hover:bg-fundo">
                  <Upload className="size-4" />Restaurar cópia
                  <input type="file" accept=".json,application/json" onChange={lerCopia} className="sr-only" />
                </label>
              </div>
            )}
            {copias.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="rotulo">Cópias guardadas automaticamente</p>
                {copias.map((c) => (
                  <div key={c.chave} className="flex items-center justify-between gap-2 rounded-2xl bg-fundo px-4 py-2 text-sm">
                    <span className="tabular-nums">{new Date(c.quando).toLocaleString("pt-BR")}</span>
                    <Botao variante="secundario" tamanho="sm" onClick={() => baixarTexto(c.texto, `cartilha-copia-${c.quando.slice(0, 10)}.json`)}><Download />Baixar</Botao>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Item>

        <Item i={4} className="h-full">
          <section className="cartao h-full p-6">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">Restaurar demonstração</h2>
            <p className="mt-1 text-sm text-suave">Apaga tudo que foi cadastrado.</p>
            {confirmando ? (
              <div className="cartao-sol mt-4 flex flex-wrap items-center gap-3 p-4">
                <p className="flex-1 text-sm font-semibold">Apagar tudo?</p>
                <Botao variante="secundario" onClick={() => setConfirmando(false)}>Cancelar</Botao>
                <Botao variante="perigo" onClick={restaurar}><RotateCcw />Apagar e restaurar</Botao>
              </div>
            ) : (
              <div className="mt-4">
                <Botao variante="secundario" onClick={() => setConfirmando(true)}><RotateCcw />Restaurar demonstração</Botao>
              </div>
            )}
          </section>
        </Item>
      </div>
    </div>
  );
}
