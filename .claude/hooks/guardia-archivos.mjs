/**
 * PreToolUse (Write | Edit | MultiEdit): revisa el texto que se va a escribir
 * contra las reglas de CLAUDE.md que más se han roto por descuido. Solo mira el
 * texto NUEVO (content / new_string), no el archivo entero, para que una
 * edición pequeña no quede bloqueada por algo que ya estaba.
 */
import { decidir, leerEntrada, rutaRelativa } from "./comun.mjs";

const entrada = leerEntrada().tool_input ?? {};
const ruta = rutaRelativa(entrada.file_path);
const texto = [
  entrada.content,
  entrada.new_string,
  ...(Array.isArray(entrada.edits) ? entrada.edits.map((e) => e?.new_string) : []),
]
  .filter((t) => typeof t === "string")
  .join("\n");

const esCodigo = /\.(tsx?|jsx?|mjs|css)$/.test(ruta);
const esConfigDeClaude = ruta.startsWith(".claude/");

// §2: nada de JSON intermedios con datos de negocio dentro de data/.
if (/^data\/.*\.json$/.test(ruta)) {
  decidir(
    "deny",
    "CLAUDE.md §2: no se reintroducen `data/*.json` con datos de negocio; el Excel de data/source-*/ es la única fuente de verdad."
  );
}

// §3: sin breakpoints de Tailwind. Excepción deliberada: input.tsx y textarea.tsx.
const excepcionBreakpoint = /^components\/ui\/(input|textarea)\.tsx$/.test(ruta);
if (esCodigo && !esConfigDeClaude && !excepcionBreakpoint) {
  const breakpoint = texto.match(/(?:^|[\s"'`{(])((?:sm|md|lg|xl|2xl):[!\-a-z[])/m);
  if (breakpoint) {
    decidir(
      "deny",
      `CLAUDE.md §3: sin breakpoints de Tailwind (encontrado "${breakpoint[1]}…"). El sitio se escala como escritorio en cualquier pantalla; usa el valor de escritorio sin prefijo.`
    );
  }
}

// §2: rutas siempre relativas a la raíz, nunca del escritorio.
if (esCodigo && !esConfigDeClaude && /[A-Za-z]:[\\/]{1,2}Users[\\/]/i.test(texto)) {
  decidir(
    "deny",
    'CLAUDE.md §2: nada de rutas absolutas del equipo (C:\\Users\\…). Usa join(process.cwd(), "data", "source-*"): Vercel corre en Linux y el .exe portable debe ser autocontenido.'
  );
}

// §5: sin créditos de asistentes de IA en código ni documentación.
if (
  !esConfigDeClaude &&
  /co-authored-by:[^\n]*(?:claude|anthropic|copilot)|generated (?:with|by)[^\n]*(?:claude|copilot|chatgpt)|noreply@anthropic\.com/i.test(texto)
) {
  decidir("deny", "CLAUDE.md §5: no se incluyen créditos ni metadatos de herramientas de IA.");
}

// Secretos: la cadena de Neon y el PIN solo pueden vivir en .env (ignorado por git).
const esEnvPrivado = /(^|\/)\.env(\.[^/]*)?$/.test(ruta) && !ruta.endsWith(".env.example");
if (!esEnvPrivado && /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@|\bnpg_[A-Za-z0-9]{8,}/.test(texto)) {
  decidir(
    "deny",
    "Parece una cadena de conexión real de Neon con contraseña. Los secretos van solo en .env (que git ignora), nunca en código, docs ni .env.example."
  );
}
