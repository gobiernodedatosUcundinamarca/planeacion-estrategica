/**
 * PreToolUse (Bash | PowerShell): pide confirmación del usuario si un comando puede
 * modificar la configuración protegida (.claude/, CLAUDE.md) o los hooks activos de
 * Git, y rechaza --no-verify. Es una red de seguridad, no una barrera: no ve lo que
 * un script hace por dentro ni lo que traen git pull o checkout.
 */
import { readFileSync } from "node:fs";

let comando = "";
try {
  const entrada = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, "") || "{}");
  comando = String(entrada.tool_input?.command ?? "");
} catch {}

function responder(decision, motivo) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: {
    hookEventName: "PreToolUse", permissionDecision: decision, permissionDecisionReason: motivo } }));
  process.exit(0);
}

if (/(?:^|\s)--no-verify(?:\s|$)/.test(comando))
  responder("deny", "No se saltan los hooks de Git (--no-verify).");
if (/\bcore\.hooksPath\b/i.test(comando) && !/--get\b/.test(comando))
  responder("ask", "Cambia los hooks de Git activos: requiere aprobación explícita.");

const PROTEGIDO = /(?:^|[\s"'`\\/~(=])\.claude(?=[\\/\s"'`)]|$)|CLAUDE(?:\.local)?\.md/i;
if (!PROTEGIDO.test(comando)) process.exit(0);

const SOLO_LECTURA = /^(?:git\s+(?:status|diff|log|show|ls-files|grep|blame|var|rev-parse)\b|(?:cat|head|tail|less|ls|dir|grep|rg|wc|stat|Get-Content|Get-ChildItem|Get-Item|Select-String|Test-Path|Resolve-Path|Select-Object|Where-Object|Sort-Object|Measure-Object)\b)/i;
const segmentos = comando.split(/\r?\n|;|&&|\|\||\|/).map((s) => s.trim()).filter(Boolean);
const redirige = /(?<![<>=-])>{1,2}(?!&)/.test(comando);
if (redirige || segmentos.some((s) => !SOLO_LECTURA.test(s)))
  responder("ask", "El comando puede modificar configuración protegida (.claude/ o CLAUDE.md); CLAUDE.md exige aprobación explícita del conjunto.");
