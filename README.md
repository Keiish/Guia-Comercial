# Guia Comercial — visual v2

Cópia do projeto `central-clinica` com a interface refeita: fundo creme, navegação em pílulas, trilho de ações flutuante, cartões de canto grande e animações com [Motion](https://motion.dev). Dados, regras de convênio e permissões são os mesmos do projeto original (`lib/`).

A direção visual e o guia de implementação estão em `docs/superpowers/specs/2026-10-19-visual-v2-design.md`.

## Rodar

```bash
npm install
npm run dev   # http://localhost:3001
```

Os dados ficam no navegador (`localStorage`, chave `cartilha:v1`) através de `lib/repositorio.ts`. Checagem rápida: `node lib/dados.check.mjs`.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Motion · lucide-react. Hospedagem na Vercel.
