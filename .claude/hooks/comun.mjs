/**
 * Utilidades que comparten los hooks de `.claude/settings.json`.
 *
 * Los hooks son Node puro y sin dependencias a propósito: corren antes de que
 * exista `node_modules` (un clon recién hecho) y en Windows, donde Git Bash no
 * siempre está disponible, así que no pueden depender ni de `jq` ni de un shell.
 */
import { readFileSync } from "node:fs";

/**
 * El JSON que Claude Code envía por stdin; `{}` si llega vacío o roto. Se
 * descarta un BOM inicial: PowerShell 5.1 lo antepone al canalizar texto, y con
 * él JSON.parse falla y todas las reglas pasarían en silencio.
 */
export function leerEntrada() {
  try {
    return JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "") || "{}");
  } catch {
    return {};
  }
}

/** Raíz del proyecto, con barras normales para comparar rutas en Windows. */
export function raizProyecto() {
  return (process.env.CLAUDE_PROJECT_DIR || process.cwd()).replace(/\\/g, "/");
}

/** Ruta relativa a la raíz, en minúsculas y con `/`, para comparar sin sorpresas. */
export function rutaRelativa(ruta) {
  const normalizada = String(ruta || "").replace(/\\/g, "/");
  const raiz = raizProyecto();
  const relativa = normalizada.toLowerCase().startsWith(raiz.toLowerCase() + "/")
    ? normalizada.slice(raiz.length + 1)
    : normalizada;
  return relativa.toLowerCase();
}

/** Decide sobre una llamada a herramienta (PreToolUse) y termina. */
export function decidir(decision, motivo) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: motivo,
      },
    })
  );
  process.exit(0);
}
