/**
 * Espera el resultado del deployment de Vercel para un commit (CLAUDE.md §4.6),
 * consultando el API público de estado de commits de GitHub. Imprime una sola
 * línea por consulta y termina con código 0 (success), 1 (failure/error) o
 * 2 (sigue pendiente al agotar el tiempo).
 *
 * Uso: node .claude/skills/publicar-cambios/verificar-vercel.mjs [sha] [--minutos 6]
 */
import { execFileSync } from "node:child_process";

const argumentos = process.argv.slice(2);
const indiceMinutos = argumentos.indexOf("--minutos");
const minutos = indiceMinutos >= 0 ? Number(argumentos[indiceMinutos + 1]) : 6;
const sha =
  argumentos.find((a, i) => !a.startsWith("--") && i !== indiceMinutos + 1) ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const remoto = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
const repo = remoto.match(/github\.com[/:]([^/]+\/[^/.]+)/)?.[1];
if (!repo) {
  console.log(`✗ El remoto origin no es de GitHub: ${remoto}`);
  process.exit(1);
}

const limite = Date.now() + minutos * 60_000;
const hora = () => new Date().toLocaleTimeString("es-CO", { hour12: false });

while (true) {
  let estado = "pending";
  let detalle = "";
  try {
    const respuesta = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/status`, {
      headers: { "User-Agent": "verificar-vercel", Accept: "application/vnd.github+json" },
    });
    const datos = await respuesta.json();
    const vercel = (datos.statuses ?? []).filter((s) => /vercel/i.test(s.context));
    if (vercel.length) {
      estado = vercel.some((s) => s.state === "failure" || s.state === "error")
        ? "failure"
        : vercel.every((s) => s.state === "success")
          ? "success"
          : "pending";
      detalle = vercel.map((s) => `${s.context}=${s.state}${s.target_url ? ` ${s.target_url}` : ""}`).join(" · ");
    } else {
      detalle = respuesta.ok ? "Vercel aún no reporta" : `GitHub respondió ${respuesta.status}`;
    }
  } catch (error) {
    detalle = `sin conexión: ${error.message}`;
  }

  console.log(`[${hora()}] ${repo}@${sha.slice(0, 7)} ${estado} — ${detalle}`);
  if (estado === "success") process.exit(0);
  if (estado === "failure") process.exit(1);
  if (Date.now() > limite) {
    console.log(`… sigue pendiente tras ${minutos} min; vuelve a correrlo más tarde.`);
    process.exit(2);
  }
  await new Promise((resolver) => setTimeout(resolver, 20_000));
}
