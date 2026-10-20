"use client";

// Primitivas de movimento (biblioteca `motion`): tudo que anima passa por aqui, para a curva e os tempos serem os mesmos no app inteiro
import { useEffect } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, animate, motion, useMotionValue, useReducedMotion, useTransform, type HTMLMotionProps, type Variants } from "motion/react";

export { AnimatePresence, LayoutGroup, motion, useReducedMotion };

export const SUAVE = [0.23, 1, 0.32, 1] as const;
export const MOLA = { type: "spring", stiffness: 420, damping: 38, mass: 0.8 } as const;

export function ProvedorMovimento({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.4, ease: SUAVE }}>{children}</MotionConfig>;
}

// Lista com filhos entrando um atrás do outro
export const variantesLista: Variants = {
  oculto: {},
  visivel: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};
export const variantesItem: Variants = {
  oculto: { opacity: 0, y: 14, scale: 0.985 },
  visivel: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.48, ease: SUAVE } },
};

export function Lista({ children, className, ...resto }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={variantesLista} initial="oculto" animate="visivel" className={className} {...resto}>
      {children}
    </motion.div>
  );
}

// Item de uma Lista; fora de uma Lista, anima sozinho com atraso `i`
export function Item({ children, className, i, ...resto }: HTMLMotionProps<"div"> & { i?: number }) {
  if (i === undefined) return <motion.div variants={variantesItem} className={className} {...resto}>{children}</motion.div>;
  return (
    <motion.div initial="oculto" animate="visivel" variants={variantesItem} transition={{ delay: Math.min(i, 12) * 0.045 }} className={className} {...resto}>
      {children}
    </motion.div>
  );
}

// Entrada de um bloco isolado (cabeçalho, barra de filtros)
export function Entrada({ children, className, i = 0, ...resto }: HTMLMotionProps<"div"> & { i?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: SUAVE, delay: i * 0.06 }} className={className} {...resto}>
      {children}
    </motion.div>
  );
}

// Troca de tela: a que sai desfoca e some, a que entra sobe nítida (como na referência)
export function Pagina({ chave, children, className }: { chave: string; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={chave}
        className={className}
        initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.42, ease: SUAVE } }}
        exit={{ opacity: 0, y: -10, filter: "blur(10px)", transition: { duration: 0.22, ease: "easeIn" } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// Bloco que abre e fecha animando a altura
export function Desdobra({ aberto, children, className }: { aberto: boolean; children: React.ReactNode; className?: string }) {
  return (
    <AnimatePresence initial={false}>
      {aberto && (
        <motion.div
          key="conteudo"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1, transition: { height: { duration: 0.36, ease: SUAVE }, opacity: { duration: 0.28, delay: 0.06 } } }}
          exit={{ height: 0, opacity: 0, transition: { height: { duration: 0.28, ease: SUAVE }, opacity: { duration: 0.16 } } }}
          className={`overflow-hidden ${className ?? ""}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Número que conta de 0 até o valor ao aparecer (e de um valor ao outro quando muda)
export function Contador({ valor, className }: { valor: number; className?: string }) {
  const reduzido = useReducedMotion();
  const mv = useMotionValue(reduzido ? valor : 0);
  const texto = useTransform(mv, (v) => Math.round(v).toLocaleString("pt-BR"));
  useEffect(() => {
    if (reduzido) { mv.set(valor); return; }
    const controle = animate(mv, valor, { duration: 0.9, ease: SUAVE });
    return () => controle.stop();
  }, [valor, mv, reduzido]);
  return <motion.span className={className}>{texto}</motion.span>;
}

// Hover e toque padrão dos cartões clicáveis
export const toque = { whileHover: { y: -3 }, whileTap: { scale: 0.985 }, transition: MOLA } as const;
