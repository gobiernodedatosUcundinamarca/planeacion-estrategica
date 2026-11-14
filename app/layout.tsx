import {PreferenciasTipograficas} from "@/components/editorial/preferencias-tipograficas";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "@/components/layout/app-providers";
import { EditorTextos } from '@/components/editorial/texto-editorial';
import '@/components/editorial/editorial.css';

// Debe ser >= al breakpoint Tailwind más alto usado en la app (xl = 1280px),
// para que sm/md/lg/xl siempre resuelvan a su estado desktop.
const ANCHO_ESCRITORIO = 1280;

/**
 * El <meta viewport> se fija SIEMPRE en 1280 (no `device-width`). Necesario:
 * si se declarara `width=device-width` y luego #app-frame tuviera
 * `width:1280px` vía CSS, el navegador expandiría por su cuenta el viewport
 * para contener ese ancho — y `window.innerWidth` dejaría de reflejar el
 * ancho real del dispositivo (se probó y reprodujo este ciclo). Fijar 1280
 * de entrada evita esa ambigüedad.
 *
 * `height: "device-height"` cierra el mismo hueco pero en el eje vertical: sin
 * declararlo, el navegador expande el viewport verticalmente para "contener"
 * el contenido de 1280px de #app-frame (a pesar del recorte por overflow en
 * #app-frame-outer) — `window.innerHeight` terminaba reportando el alto
 * completo sin escalar (p.ej. 2179px) en vez del alto real del teléfono, y la
 * página dejaba de necesitar scroll porque, para el navegador, "ya cabía todo"
 * en ese viewport gigante. Fijar `device-height` ancla el viewport al alto
 * físico real, igual que `width` lo hace con el ancho.
 */
export const viewport: Viewport = {
  width: ANCHO_ESCRITORIO,
  height: "device-height",
  // Sustituye el valor 1 predeterminado de Next: el navegador encaja los 1280 px.
  initialScale: undefined,
};

/**
 * Mantiene una composición de 1280 px, sin cambiar las columnas en teléfonos.
 * El navegador puede encajar ese ancho por sí mismo. El marco solo aplica la
 * reducción que falte, y compensa su altura porque transform no reduce el
 * espacio del documento. ResizeObserver conserva el alto al filtrar o editar.
 * visualViewport también permite centrar los dialog nativos, que se muestran
 * fuera del marco transformado, sin confundir device-height con el alto visible.
 */
const ESCALA_ESCRITORIO = `(() => {
  var anchoAnterior = 0, layoutAnterior = 0, escalaNavegador = 1;
  function actualizarCentroVisible() {
    var visual = window.visualViewport;
    document.documentElement.style.setProperty('--centro-ventana-x', ((visual ? visual.offsetLeft : 0) + (visual ? visual.width : window.innerWidth) / 2) + 'px');
    document.documentElement.style.setProperty('--centro-ventana-y', ((visual ? visual.offsetTop : 0) + (visual ? visual.height : window.innerHeight) / 2) + 'px');
  }
  function calcularEscala() {
    var visual = window.visualViewport;
    var anchoVisual = visual ? Math.round(visual.width * visual.scale) : window.innerWidth;
    var anchoPantalla = Math.min((window.screen && window.screen.width) || anchoVisual, anchoVisual);
    var anchoLayout = document.documentElement.clientWidth;
    // Safari puede encajar ya los 1280 px. No volver a reducir ese encaje.
    // La base se conserva durante el zoom manual del usuario.
    if (anchoPantalla !== anchoAnterior || anchoLayout !== layoutAnterior) {
      anchoAnterior = anchoPantalla;
      layoutAnterior = anchoLayout;
      escalaNavegador = visual ? Math.min(1, visual.scale) : 1;
    }
    var esMovil = anchoPantalla > 0 && anchoPantalla < ${ANCHO_ESCRITORIO};
    document.documentElement.classList.toggle('forzar-escritorio', esMovil);
    var escala = esMovil ? Math.min(1, anchoPantalla / (${ANCHO_ESCRITORIO} * escalaNavegador)) : 1;
    document.documentElement.style.setProperty('--escala-escritorio', String(escala));
    var altoVisible = visual ? visual.height : window.innerHeight;
    document.documentElement.style.setProperty('--alto-escritorio', (altoVisible / escala) + 'px');
    actualizarCentroVisible();
    return { esMovil: esMovil, escala: escala };
  }

  function actualizarAltura() {
    var outer = document.getElementById('app-frame-outer');
    var frame = document.getElementById('app-frame');
    if (!outer || !frame) return;
    var estado = calcularEscala();
    if (!estado.esMovil) {
      outer.style.height = '';
      return;
    }
    outer.style.height = (frame.scrollHeight * estado.escala) + 'px';
  }

  calcularEscala();
  window.addEventListener('resize', actualizarAltura);
  window.addEventListener('orientationchange', actualizarAltura);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', actualizarAltura);
    window.visualViewport.addEventListener('scroll', actualizarCentroVisible);
  }

  function iniciarObservador() {
    var frame = document.getElementById('app-frame');
    if (!frame) return;
    anchoAnterior = 0;
    actualizarAltura();
    if (window.ResizeObserver) new ResizeObserver(actualizarAltura).observe(frame);
  }
  window.addEventListener('load', function() { anchoAnterior = 0; actualizarAltura(); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarObservador);
  } else {
    iniciarObservador();
  }
})();`;

const montserrat = localFont({
  variable:"--font-sans",display:"swap",
  src:[{path:"../public/assets/fonts/montserrat-latin.woff2",weight:"400 700",style:"normal"},{path:"../public/assets/fonts/montserrat-latin-ext.woff2",weight:"400 700",style:"normal"}],
});
const geistMono = localFont({
  variable:"--font-geist-mono",display:"swap",
  src:[{path:"../public/assets/fonts/geist-mono-latin.woff2",weight:"100 900",style:"normal"},{path:"../public/assets/fonts/geist-mono-latin-ext.woff2",weight:"100 900",style:"normal"}],
});

export const metadata: Metadata = {
  title: {
    default: "Participación, tu voz es fundamental | Universidad de Cundinamarca",
    template: "%s | Participación UCundinamarca",
  },
  description:
    "Portal de visualización estratégica institucional: explora los resultados del diagnóstico de participación para la construcción del Plan Estratégico de la Universidad de Cundinamarca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-CO"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Script id="escala-escritorio" strategy="beforeInteractive">
          {ESCALA_ESCRITORIO}
        </Script>
        {/* El script previo a React fija el alto de este contenedor al escalar
            el escritorio. Esa dimensión depende del dispositivo y no del SSR. */}
        <div id="app-frame-outer" suppressHydrationWarning>
          <div id="app-frame">
            <AppProviders><EditorTextos><PreferenciasTipograficas>{children}</PreferenciasTipograficas></EditorTextos></AppProviders>
          </div>
        </div>
      </body>
    </html>
  );
}
