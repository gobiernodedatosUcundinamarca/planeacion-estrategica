---
name: verificar-webkit
description: Verifica una página del sitio en WebKit real (escritorio y teléfono) con capturas, errores de consola/red y la comprobación del escalado de escritorio en móvil. Úsala tras cualquier cambio visual o interactivo, antes de publicarlo.
---

# Verificar en WebKit real

CLAUDE.md §4.2 exige WebKit real (`playwright.webkit`), no la emulación de
Chromium: este proyecto tiene bugs que solo aparecen ahí. **No escribas
`__*.mjs` para esto**: usa `captura.mjs`.

1. Si no hay navegador: `pnpm exec playwright install webkit` (una vez por equipo).
2. Levanta el sitio en segundo plano: `pnpm dev` (espera la línea `Ready`).
3. Corre, por cada ruta afectada:
   ```
   node .claude/skills/verificar-webkit/captura.mjs http://localhost:3000/<ruta> [--completa] [--clic "texto"]
   ```
   Imprime ✓/✗ por pantalla y la ruta de cada captura (en la carpeta temporal,
   nunca en el repo). En el teléfono comprueba `html.forzar-escritorio`,
   `scale()` en `#app-frame` y que no haya scroll horizontal.
4. Mira **solo las capturas que necesites** con Read (cada imagen cuesta
   contexto); la de teléfono suele bastar para un cambio de layout.
5. Detén el servidor al terminar.

Un error de consola no es tuyo hasta comprobarlo: si dudas, `git stash`,
repite la captura y compara (skill `refactorizar`, paso 4). Conocido y preexistente: una
advertencia de hidratación en modo dev en la vista de teléfono.

Rutas principales: `/`, `/transformaciones`, `/transformaciones-participacion`,
`/admin` (pide PIN). Ver `constants/navegacion.ts` para el resto.
