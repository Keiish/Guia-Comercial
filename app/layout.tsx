import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Provider } from "@/lib/store";
import { ProvedorMovimento } from "@/components/movimento";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guia Comercial",
  description: "Consulta rápida de médicos, convênios e exames para o Guia Comercial.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${manrope.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full font-sans">
        <ProvedorMovimento>
          <Provider>{children}</Provider>
        </ProvedorMovimento>
      </body>
    </html>
  );
}
