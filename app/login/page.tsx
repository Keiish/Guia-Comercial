"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Usuario } from "@/lib/modelo";
import { PAPEIS } from "@/lib/permissoes";
import { useStore } from "@/lib/store";
import { Avatar, Logo } from "@/components/ui";
import { AnimatePresence, Entrada, MOLA, motion } from "@/components/movimento";

const campo = "h-12 w-full rounded-full border border-borda bg-fundo/70 px-5 text-[15px] outline-none transition placeholder:text-suave/70 focus:border-mata focus:bg-superficie focus:ring-4 focus:ring-mata/15";

export default function Login() {
  const { entrar, banco } = useStore();
  const router = useRouter();
  const [usuarioId, setUsuarioId] = useState("coordenador-comn");
  const escolhido = banco.usuarios.find((u) => u.id === usuarioId) ?? banco.usuarios[0];
  const alcance = (u: Usuario) =>
    `${PAPEIS[u.papel].rotulo} · ${u.clinicas.length ? u.clinicas.map((id) => banco.clinicas.find((c) => c.id === id)?.nome ?? id).join(", ") : "todas as clínicas"}`;

  return (
    <div className="grid min-h-screen md:grid-cols-[1.15fr_1fr]">
      {/* Painel da marca: verde-azulado de traje cirúrgico, logo branca como na v1, bolhas flutuando */}
      <div className="gradiente-saude relative hidden overflow-hidden p-10 text-white md:flex md:flex-col md:justify-between">
        <div className="bolha absolute -left-24 top-1/4 size-96 rounded-full bg-[#5eead4]/25 blur-3xl" />
        <div className="bolha absolute -right-20 bottom-8 size-80 rounded-full bg-[#38bdf8]/25 blur-3xl" style={{ animationDelay: "-7s" }} />
        <div className="bolha absolute right-1/4 top-10 size-40 rounded-full bg-white/10 blur-2xl" style={{ animationDelay: "-3s" }} />

        <Entrada className="relative"><Logo claro /></Entrada>

        <Entrada i={1} className="relative grid flex-1 place-items-center py-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem da marca */}
          <img src="/Fundo%20Login.png?v=2" alt="OncologyGroup" className="max-h-[42vh] w-auto max-w-[440px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.25)]" />
        </Entrada>

      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Entrada className="w-full max-w-sm">
          <form className="cartao p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); router.replace(entrar(escolhido.id) ? "/busca" : "/"); }}>
            <div className="mb-8 md:hidden"><Logo /></div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-mata">Bem-vindo de volta</p>
            <h2 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.025em]">Entrar</h2>

            <div className="mt-6 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">E-mail</span>
                <input key={escolhido.id} type="email" defaultValue={escolhido.email} className={campo} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Senha</span>
                <input type="password" placeholder="••••••••" className={campo} />
              </label>
            </div>

            <fieldset className="mt-6">
              <legend className="mb-3 block text-sm font-semibold">Quem está atendendo?</legend>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {banco.usuarios.map((u) => {
                  const marcado = u.id === escolhido.id;
                  return (
                    <label key={u.id} title={u.nome} className="pressionavel relative grid cursor-pointer place-items-center rounded-full p-1">
                      {marcado && <motion.span layoutId="aro-usuario" transition={MOLA} className="absolute inset-0 rounded-full ring-2 ring-mata" />}
                      <input type="radio" name="usuario" value={u.id} checked={marcado} onChange={() => setUsuarioId(u.id)} className="peer sr-only" />
                      <span className={`relative transition-opacity ${marcado ? "" : "opacity-60 hover:opacity-100"}`}><Avatar nome={u.nome} tamanho="md" /></span>
                    </label>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                <motion.p key={escolhido.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="mt-3 text-sm">
                  <span className="font-bold">{escolhido.nome}</span>
                  <span className="block truncate text-xs text-suave">{alcance(escolhido)}</span>
                </motion.p>
              </AnimatePresence>
            </fieldset>

            <button type="submit" className="pressionavel group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-mata font-bold text-white shadow-card hover:bg-mata-escuro">
              Entrar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
        </Entrada>
      </div>
    </div>
  );
}
