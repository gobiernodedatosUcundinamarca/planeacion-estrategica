/**
 * Prueba una ruta en WebKit REAL (no la emulación de Chromium, CLAUDE.md §4.2)
 * con dos pantallas: escritorio y teléfono. En el teléfono comprueba lo que el
 * proyecto promete —que el sitio se ve como escritorio escalado
 * (`html.forzar-escritorio` + `scale()` sobre #app-frame) y sin scroll
 * horizontal— y en ambas junta errores de consola, de página y de red.
 *
 * Uso: node .claude/skills/verificar-webkit/captura.mjs <url> [--completa] [--clic "texto"]
 *   --completa   captura la página entera (por defecto solo lo visible: pesa menos)
 *   --clic       hace clic en el primer elemento con ese texto antes de capturar
 *
 * Las capturas van a la carpeta temporal del sistema, nunca al repo.
 */
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { webkit } from "playwright";

const argumentos = process.argv.slice(2);
const url = argumentos.find((a) => /^https?:\/\//.test(a));
if (!url) {
  console.log("Uso: node .claude/skills/verificar-webkit/captura.mjs <url> [--completa] [--clic \"texto\"]");
  process.exit(1);
}
const completa = argumentos.includes("--completa");
const indiceClic = argumentos.indexOf("--clic");
const textoClic = indiceClic >= 0 ? argumentos[indiceClic + 1] : null;

const carpeta = join(tmpdir(), "verificar-webkit");
mkdirSync(carpeta, { recursive: true });
const sello = new URL(url).pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "inicio";

const PANTALLAS = [
  { nombre: "escritorio", opciones: { viewport: { width: 1440, height: 900 } } },
  {
    nombre: "telefono",
    opciones: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  },
];

const navegador = await webkit.launch();
let fallos = 0;

for (const { nombre, opciones } of PANTALLAS) {
  const contexto = await navegador.newContext(opciones);
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 200)}`));
  pagina.on("pageerror", (e) => errores.push(`página: ${e.message.slice(0, 200)}`));
  pagina.on("response", (r) => r.status() >= 400 && errores.push(`red ${r.status()}: ${r.url().slice(0, 150)}`));

  await pagina.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  if (textoClic) {
    await pagina.getByText(textoClic, { exact: false }).first().click();
    await pagina.waitForLoadState("networkidle");
  }
  await pagina.waitForTimeout(800);

  const medidas = await pagina.evaluate(() => {
    const frame = document.getElementById("app-frame");
    return {
      forzarEscritorio: document.documentElement.classList.contains("forzar-escritorio"),
      transformacion: frame ? getComputedStyle(frame).transform : null,
      scrollHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
      anchoContenido: document.documentElement.scrollWidth,
      anchoVentana: window.innerWidth,
    };
  });

  const problemas = [...errores];
  if (nombre === "telefono") {
    if (!medidas.forzarEscritorio) problemas.push("no se activó html.forzar-escritorio");
    if (!medidas.transformacion || medidas.transformacion === "none") problemas.push("#app-frame no está escalado");
  }
  if (medidas.scrollHorizontal)
    problemas.push(`scroll horizontal: contenido ${medidas.anchoContenido}px > ventana ${medidas.anchoVentana}px`);

  const archivo = join(carpeta, `${sello}-${nombre}.png`);
  await pagina.screenshot({ path: archivo, fullPage: completa });
  fallos += problemas.length;
  console.log(`${problemas.length ? "✗" : "✓"} ${nombre}: ${archivo}`);
  for (const p of problemas.slice(0, 15)) console.log(`    · ${p}`);
  await contexto.close();
}

await navegador.close();
process.exit(fallos ? 1 : 0);
