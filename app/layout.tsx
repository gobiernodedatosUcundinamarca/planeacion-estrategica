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
  initialScale: 1,
};

/**
 * Con el viewport ya anclado en 1280, `window.innerWidth` no sirve para saber
 * el ancho real del dispositivo (siempre da 1280). Se usa `window.screen.width`:
 * es una propiedad de la pantalla física, ajena a cualquier <meta viewport> o
 * CSS de la página.
 *
 * El escalado visual se hace con `transform: scale()` sobre #app-frame — NO
 * con `zoom`. Se probó `zoom` primero (más simple: además de escalar, ajusta
 * solo el alto ocupado) pero en Safari/WebKit real (no en la emulación de
 * Chromium, que es donde se probó primero) los componentes que se miden a sí
 * mismos con ResizeObserver — los gráficos de recharts — quedaban rotos: en
 * WebKit, bajo `zoom`, `getBoundingClientRect()` devuelve el tamaño YA
 * escalado (390px) mientras que `offsetWidth` devuelve el tamaño sin escalar
 * (1280px) — dos APIs de medición dan resultados distintos para el mismo
 * elemento — y ResizeObserver sigue a la primera, así que los gráficos se
 * calculaban a sí mismos con un contenedor minúsculo y todo el texto quedaba
 * envuelto en columnas angostas. `transform` no tiene esa ambigüedad: por
 * especificación, actúa solo en la etapa de pintado, después de que el layout
 * ya se calculó — ninguna API de medición (offsetWidth, getBoundingClientRect,
 * ResizeObserver) se ve afectada por él, en ningún navegador. La contrapartida
 * es que `transform` no reduce el alto ocupado en el documento (a diferencia
 * de `zoom`), así que hay que compensarlo a mano: #app-frame-outer mide la
 * altura natural (sin escalar) de #app-frame y fija su propio alto en
 * `alturaNatural * escala`, actualizándose con un ResizeObserver para que
 * cambios dinámicos de contenido (filtros, datos) no dejen un hueco en blanco
 * ni corten contenido.
 */
const ESCALA_ESCRITORIO = `(() => {
  function calcularEscala() {
    var anchoPantalla = window.screen && window.screen.width;
    var esMovil = anchoPantalla > 0 && anchoPantalla < ${ANCHO_ESCRITORIO};
    document.documentElement.classList.toggle('forzar-escritorio', esMovil);
    var escala = esMovil ? anchoPantalla / ${ANCHO_ESCRITORIO} : 1;
    document.documentElement.style.setProperty('--escala-escritorio', String(escala));
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

  function iniciarObservador() {
    var frame = document.getElementById('app-frame');
    if (!frame) return;
    actualizarAltura();
    if (window.ResizeObserver) new ResizeObserver(actualizarAltura).observe(frame);
  }
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
        <div id="app-frame-outer">
          <div id="app-frame">
            <AppProviders><EditorTextos><PreferenciasTipograficas>{children}</PreferenciasTipograficas></EditorTextos></AppProviders>
          </div>
        </div>
      </body>
    </html>
  );
}
