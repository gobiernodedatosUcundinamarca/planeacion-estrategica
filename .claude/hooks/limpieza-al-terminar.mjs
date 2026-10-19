/**
 * Stop: antes de dar un turno por terminado, busca lo que CLAUDE.md §4.7 y la
 * skill `refactorizar` prohíben dejar suelto —scripts temporales `__*`, backups de Excel y carpetas
 * del build portable—. Si encuentra algo, pide a Claude que lo resuelva una sola
 * vez (`stop_hook_active` evita el bucle): puede borrarlo o explicar por qué lo
 * conserva, por ejemplo un script que espera la decisión del usuario.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { leerEntrada, raizProyecto } from "./comun.mjs";

const entrada = leerEntrada();
const raiz = raizProyecto();

const IGNORAR = new Set(["node_modules", ".git", ".next", ".claude"]);
const hallazgos = [];

function recorrer(directorio, relativa, profundidad) {
  if (profundidad > 6) return;
  let entradas;
  try {
    entradas = readdirSync(directorio, { withFileTypes: true });
  } catch {
    return;
  }
  for (const item of entradas) {
    const ruta = relativa ? `${relativa}/${item.name}` : item.name;
    if (item.isDirectory()) {
      if (IGNORAR.has(item.name)) continue;
      if (!relativa && (item.name === "portal-build-portable" || item.name === "portal-portable")) {
        hallazgos.push(`${ruta}/ (carpeta del build portable)`);
        continue;
      }
      recorrer(join(directorio, item.name), ruta, profundidad + 1);
    } else if (/^__.*\.(?:m?[jt]s|tsx?)$/.test(item.name)) {
      hallazgos.push(`${ruta} (script temporal)`);
    } else if (/\.backup.*\.xlsx$/i.test(item.name)) {
      hallazgos.push(`${ruta} (backup temporal de Excel)`);
    }
  }
}

if (existsSync(raiz)) recorrer(raiz, "", 0);

if (hallazgos.length > 0 && !entrada.stop_hook_active) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason:
        `Quedan archivos temporales en el repo (CLAUDE.md §4.7):\n- ${hallazgos.join("\n- ")}\n` +
        "Bórralos si ya cumplieron su función. Si alguno debe quedarse (por ejemplo, porque espera una decisión del usuario), dilo en una línea y termina.",
    })
  );
}
