import { Avatar } from "@/components/ui";

// Círculos sobrepostos com as iniciais; quando sobra gente, um último círculo "+N"
export function PilhaAvatares({ nomes, max = 4, tamanho = "sm", className = "" }: { nomes: string[]; max?: number; tamanho?: "sm" | "md"; className?: string }) {
  if (!nomes.length) return null;
  const visiveis = nomes.slice(0, max);
  const resto = nomes.length - visiveis.length;
  const dim = tamanho === "sm" ? "size-8" : "size-11";
  return (
    <div className={`flex -space-x-2 ${className}`} aria-hidden="true">
      {visiveis.map((n, i) => (
        <div key={`${n}-${i}`} className="rounded-full ring-2 ring-superficie"><Avatar nome={n} tamanho={tamanho} /></div>
      ))}
      {resto > 0 && (
        <div className={`grid shrink-0 place-items-center rounded-full bg-fundo text-[11px] font-bold text-suave ring-2 ring-superficie ${dim}`}>+{resto}</div>
      )}
    </div>
  );
}
