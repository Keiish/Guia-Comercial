import { Suspense } from "react";
import { Estrutura } from "@/components/estrutura";

// A casca usa a URL (menu ativo, página do médico). Na rota dinâmica /profissionais/[id]
// ela só existe no navegador, e o Next 16 exige Suspense em volta.
export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-tinta border-t-transparent" />
            <p className="text-sm font-semibold text-suave">Carregando...</p>
          </div>
        </div>
      }
    >
      <Estrutura>{children}</Estrutura>
    </Suspense>
  );
}
