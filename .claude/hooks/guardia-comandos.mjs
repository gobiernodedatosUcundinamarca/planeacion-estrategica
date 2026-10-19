/**
 * PreToolUse (Bash | PowerShell): hace cumplir en la terminal las reglas de
 * CLAUDE.md §1, §4 y §5 que una regla de permisos por prefijo no alcanza a ver
 * —por ejemplo `cd x; npm i` o un `git add .` al final de una cadena—.
 *
 * deny = nunca se permite; ask = solo con confirmación explícita del usuario.
 */
import { decidir, leerEntrada } from "./comun.mjs";

const comando = String(leerEntrada().tool_input?.command ?? "");

// Inicio de un comando: principio de línea o tras ; | & ( o un `&&`/`||`.
const INICIO = String.raw`(?:^|[;&|(\n]\s*)`;

const PROHIBIDOS = [
  {
    patron: new RegExp(`${INICIO}(?:npm|npx|yarn|bun|bunx)(?:\\.cmd|\\.ps1)?(?=\\s|$)`, "im"),
    motivo:
      "CLAUDE.md §1: el gestor es pnpm, obligatorio. Usa `pnpm`, `pnpm add`, `pnpm exec` o `pnpm dlx` en lugar de npm/npx/yarn/bun.",
  },
  {
    patron: /\bgit\s+add\b[^\n;|&]*?(?:\s(?:-A|--all|-u|--update)\b|\s\.(?=\s|$|;)|\s--\s+\.(?=\s|$))/i,
    motivo:
      "CLAUDE.md §4.3: nunca `git add -A` ni `git add .`. Añade los archivos explícitos por nombre después de revisar `git status` y `git diff`.",
  },
  {
    patron: /--no-verify\b|--no-gpg-sign\b|commit\.gpgsign\s*=\s*false/i,
    motivo: "CLAUDE.md §4.4: no se saltan hooks ni la firma de commits.",
  },
  {
    patron: /\bgit\s+commit\b[\s\S]*(?:co-authored-by:[^\n]*(?:claude|anthropic|copilot|openai|gpt)|generated with[^\n]*claude|noreply@anthropic\.com)/i,
    motivo:
      "CLAUDE.md §5: el mensaje de commit no lleva Co-Authored-By ni créditos de asistentes de IA. Quita esa línea y vuelve a intentarlo.",
  },
];

const CON_CONFIRMACION = [
  {
    patron: /\bgit\s+push\b[^\n;|&]*(?:\s--force(?:-with-lease)?\b|\s-f\b|\s\+\S)/i,
    motivo: "CLAUDE.md §4.5: un push forzado necesita autorización explícita del usuario.",
  },
  {
    patron: /\bgit\s+(?:reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--\s+\.|restore\s+\.)/i,
    motivo: "Descarta cambios locales sin posibilidad de recuperarlos; confírmalo con el usuario.",
  },
  {
    patron: /(?:\brm\b|\bRemove-Item\b|\bdel\b)[^\n;|&]*data[\\/]source/i,
    motivo:
      "Borra algo dentro de data/source-*/, que es la fuente de verdad del sitio (CLAUDE.md §2). Confírmalo con el usuario.",
  },
];

for (const { patron, motivo } of PROHIBIDOS) {
  if (patron.test(comando)) decidir("deny", motivo);
}
for (const { patron, motivo } of CON_CONFIRMACION) {
  if (patron.test(comando)) decidir("ask", motivo);
}
