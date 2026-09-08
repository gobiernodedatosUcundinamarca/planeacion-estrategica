import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // El cargue del Momento 4 no impone un tope de tamaño propio: cualquier
      // export del formulario debe poder subirse. Pero las server actions
      // rechazan cuerpos de más de 1 MB por defecto, y ese rechazo ocurre ANTES
      // de que corra el código del cargue —un archivo de 2 MB devolvía un 500
      // sin explicación—, así que se sube a un valor holgado. No existe un
      // "sin límite": el cuerpo se recibe entero en memoria.
      //
      // Medido en este equipo: 30.000 respuestas (29 MB) se cargan en 35 s. Con
      // 100 MB el margen llega a unas 100.000 respuestas, muy por encima de
      // cualquier export previsible del formulario. Ojo: en Vercel manda su
      // propio tope de ~4,5 MB por petición, que esta opción no puede levantar.
      bodySizeLimit: "100mb",
    },
  },
  // Empaqueta un servidor Node mínimo y autocontenido en .next/standalone —
  // base de la distribución portable (exe). Solo se activa con
  // BUILD_STANDALONE=1 para no alterar el build normal que usa Vercel.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  // Fija la raíz de trazado a este proyecto en vez de dejar que Next la
  // deduzca subiendo por el árbol hasta encontrar un workspace. Sin esto, el
  // build del portable —que Compilar-Portable.bat hace en una copia dentro de
  // la propia carpeta del proyecto— detecta el pnpm-workspace.yaml del padre,
  // se cree un monorepo y anida la salida en
  // `.next/standalone/<carpeta-de-la-copia>/server.js`; el launcher espera
  // `server.js` en la raíz y el .exe arranca sin servidor.
  outputFileTracingRoot: process.cwd(),
  // Permite el query param ?v= en imágenes locales de /public (usado como
  // cache-busting manual: el nombre de archivo no cambia entre ediciones de
  // imagen, así que sin esto los navegadores seguirían sirviendo la versión
  // cacheada tras reemplazar el archivo).
  images: {
    // "/**" cubre TODAS las imágenes locales de /public (logos, fotos de
    // conferencistas, etc.) — restringirlo a una sola carpeta rompe el resto
    // del sitio, ya que localPatterns funciona como lista blanca completa.
    // Sin la clave "search" no se exige que la URL venga sin query string,
    // así el ?v= de cache-busting también pasa.
    localPatterns: [{ pathname: "/**" }],
  },
  // Cabeceras de seguridad para todas las respuestas. No se pone
  // Content-Security-Policy: una CSP estricta chocaría con el
  // `transform: scale()` de `app/layout.tsx` y con los estilos en línea de
  // recharts, y afinarla necesita su propia verificación. Estas cinco no
  // afectan el render:
  //  · X-Frame-Options — el sitio no se embebe en ningún <iframe>; bloquear el
  //    encuadre evita clickjacking sobre /admin.
  //  · nosniff — Next ya sirve cada recurso con su tipo correcto.
  //  · HSTS — los navegadores lo ignoran sobre http://localhost, así que el
  //    .exe portable no se ve afectado; en Vercel (siempre https) fuerza https.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=15552000; includeSubDomains",
          },
        ],
      },
    ];
  },
  // Asegura que los .xlsx (fuente de datos en vivo, leídos con fs en el
  // servidor) queden incluidos en el bundle serverless — de otra forma el
  // file-tracing automático de Vercel podría omitirlos por no ser código.
  outputFileTracingIncludes: {
    "/*": [
      "./data/source/**",
      "./data/source-metas/**",
      "./data/source-conferencistas/**",
      "./data/source-valoraciones/**",
      "./data/source-analitica-momentos/**",
      "./data/source-cai/**",
    ],
  },
};

export default nextConfig;
