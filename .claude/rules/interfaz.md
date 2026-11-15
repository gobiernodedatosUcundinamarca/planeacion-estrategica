---
paths:
  - "components/**"
  - "app/**/*.tsx"
  - "app/**/*.css"
---
# Interfaz
- El sitio se ve igual en cualquier dispositivo: `app/layout.tsx` escala el escritorio.
  Los breakpoints de Tailwind (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`) evalúan el viewport
  real y rompen ese efecto: usa el valor de escritorio sin prefijo.
- Excepción deliberada: `md:text-sm` en `components/ui/input.tsx` y `textarea.tsx`
  (evita el zoom de iOS al enfocar).
- Reutiliza `components/ui/` (`@base-ui/react`, no Radix).
- Textos estáticos visibles: `TextoEditorial` o `EtiquetaEditorial` con su entrada en
  `editorial/catalogo.json` (ver `editorial/README.md`).
- Cambios visuales: verifica en WebKit real con Playwright; hay fallos que solo
  aparecen ahí (ejemplos en `scripts/probar-*.cjs`).
