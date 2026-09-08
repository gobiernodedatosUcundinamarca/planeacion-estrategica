# 04 · Arquitectura

Documento de referencia de cómo está montado el proyecto. Acompaña a los dos
diagramas interactivos de [`docs/diagramas/`](diagramas/) y a las reglas de
[`CLAUDE.md`](../CLAUDE.md), que mandan sobre cualquier convención genérica.

| Diagrama | Archivo | Qué muestra |
|---|---|---|
| Arquitectura de capas | [`diagramas/arquitectura.html`](diagramas/arquitectura.html) | El flujo de datos en una sola dirección, de la fuente a la vista, y los dos destinos de despliegue. |
| Cargue desde `/admin` | [`diagramas/cargue.html`](diagramas/cargue.html) | El recorrido de un `.xlsx` subido en producción: validación, anonimización, persistencia en Postgres y consumo. |

Los `.html` son autocontenidos (se abren con doble clic, sin servidor). Se
regeneran con `archify` a partir de los `.json` que están al lado — ver la
última sección.

---

## 1. Vista general

El sitio es una app **Next.js (App Router)** que vive en la **raíz del
repositorio**: `app/`, `components/`, `repositories/`, `lib/`, `data/` cuelgan
directamente de ahí. No hay carpeta contenedora intermedia.

El dato entra por uno de dos orígenes, pasa por una cadena de capas fija y sale
a la pantalla. **El flujo va siempre en una dirección y sin saltarse
escalones:**

```
data/source-*/*.xlsx   ó   Postgres (Neon)
        ↓
repositories/datasource/infrastructure/   (cómo se lee y se cachea)
        ↓
repositories/datasource/*-source.ts       (qué significan las celdas / filas)
        ↓
repositories/*Repository.ts               (única puerta de entrada a los datos)
        ↓
app/**/page.tsx                           (Server Component)
        ↓
components/**                             (presentación)
```

Reglas que se derivan y que un cambio nuevo no debe romper:

- **Una página o componente nunca importa un `datasource`** — solo
  repositorios. El único acoplamiento hacia abajo permitido es
  repositorio → su datasource.
- **Ningún módulo llama a `XLSX` ni a `readFileSync` por su cuenta**: se pasa
  por [`datasource/infrastructure/excel.ts`](../repositories/datasource/infrastructure/excel.ts).
  Que la lectura esté en un solo sitio es lo que garantiza que dos módulos
  interpreten igual una misma celda.
- **La conexión a Postgres se construye solo en
  [`datasource/infrastructure/neon.ts`](../repositories/datasource/infrastructure/neon.ts)**,
  igual que `excel.ts` es la única puerta a los `.xlsx`.
- Cada origen implementa un **contrato declarado en
  [`datasource/types.ts`](../repositories/datasource/types.ts)**, y el
  repositorio depende del contrato, nunca de la clase. Migrar un módulo a SQL o
  a una API es escribir otra clase que cumpla el contrato y cambiar una línea
  de [`datasource/index.ts`](../repositories/datasource/index.ts).
- Un datasource se construye **solo** en `datasource/index.ts`, vía
  `crearSingleton`. La instancia guarda la caché: crear una nueva por consulta
  la tiraría.

### Dónde va cada cosa

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Infraestructura | `repositories/datasource/infrastructure/` | Leer archivos, cachear, instanciar. Nada de negocio. |
| Origen de datos | `repositories/datasource/*-source.ts` | Interpretar UN origen y tiparlo. |
| Contratos | `repositories/datasource/types.ts` | Interfaz que cumple cada origen. |
| Repositorio | `repositories/*Repository.ts` | Puerta única de datos; agrega y compone. |
| Reglas de negocio | `lib/reglas/` | Umbrales y criterios que comparten servidor y vista. |
| Tipos de dominio | `types/` | Forma de los datos. Nunca dentro de un datasource. |
| Utilidades | `lib/` | Funciones puras sin estado (formato, búsqueda, texto). |
| Configuración | `constants/` | Valores fijos que no salen del Excel (navegación, marca). |

---

## 2. Los dos orígenes de datos

### 2.1 El Excel es la fuente de verdad (ruta por defecto)

**Todos** los módulos, salvo la excepción de abajo, leen su Excel en vivo con
`fs` desde `data/source-*/`. No hay JSON intermedios ni scripts ETL: editar el
Excel se refleja en la siguiente petición, sin regenerar nada.

- Agregar una fila/persona/actividad nueva debe bastar con editar el Excel (y,
  cuando aplique, soltar un archivo de foto con el slug correcto) — nunca
  hardcodear datos en componentes, constantes o datasources.
- Las rutas de los Excel son **siempre relativas** a la raíz
  (`join(process.cwd(), "data", "source-*")`). Nunca una ruta absoluta del
  escritorio: Vercel corre en Linux y el `.exe` portable debe ser
  autocontenido.
- Todo `data/source-*/` nuevo debe registrarse en `outputFileTracingIncludes`
  ([`next.config.ts`](../next.config.ts)) o Vercel no empaqueta los `.xlsx` en
  el bundle serverless.

Módulos que siguen esta ruta: encuesta, fundamentos de planeación, visión
estratégica, metas, conferencistas / ciclos de diálogo, valoraciones,
accesos a CAI y analítica de momentos.

### 2.2 Única excepción: lo que se sube desde `/admin` vive en Postgres (Neon)

Los módulos del **Momento 4** —"Transformaciones que nos conectan", su sección
de **Participación**, y los **Aportes generales** al Plan— **no** se leen de un
Excel en vivo: se guardan en Postgres. El motivo es que se actualizan **desde
el sitio publicado** (`/admin`), y en Vercel —como en cualquier entorno
serverless— el sistema de archivos es de solo lectura, así que un `.xlsx` en
disco no se podría reemplazar.

Lo que **no** cambia: el `.xlsx` sigue siendo el formato de entrada y se valida
columna por columna contra `lib/reglas/` antes de guardar nada; los datos
siguen sin estar hardcodeados. Lo que cambia es dónde quedan las filas.

| Tabla(s) | Módulo | Migración (idempotente) |
|---|---|---|
| `momento4_documentos`, `momento4_respuestas`, `momento4_clusters` | Transformaciones que nos conectan | `pnpm migrar:momento4`, `pnpm migrar:clusters` |
| `participacion_documentos`, `participacion_registros` | Participación en territorio | `pnpm migrar:participacion` |
| `aportes_documento`, `aportes_respuestas` | Aportes generales al Plan (formulario abierto de UCUNDINAMARCA) | `pnpm migrar:aportes` |
| `secciones_publicadas` | Qué secciones están publicadas | `pnpm migrar:secciones` |
| `metricas_uso` | Tablero de uso (agregado por sección y día) | `pnpm migrar:metricas` |

- La conexión se construye solo en `datasource/infrastructure/neon.ts`.
  Requiere `DATABASE_URL` en el entorno (`.env` local y portable; variables de
  entorno en Vercel). Ver `.env.example`.
- **Esto no abre la puerta a migrar otros módulos**: el resto sigue leyendo su
  Excel en vivo, y esa sigue siendo la regla por defecto para un módulo nuevo.

---

## 3. El cargue desde `/admin`

Ver [`diagramas/cargue.html`](diagramas/cargue.html). El recorrido de un
archivo subido en producción:

1. **Fuente** — export de Microsoft Forms o planilla de asistencia en
   territorio, subido en `/admin` (protegido por `ADMIN_PIN`, que solo se lee
   en el servidor).
2. **Validación** — `lib/reglas/momento4.ts` / `lib/reglas/participacion.ts`.
   El formato se reconoce **por nombre de columna, no por posición ni orden**.
   Para Participación, quien sube elige entre *anexar* (un evento nuevo) y
   *reemplazar todo* (corregir un cargue); el modo viaja en el formulario y
   **se valida en la server action**, porque "reemplazar" borra datos y una
   server action es un endpoint público.
3. **Transformación** — `*-formato.ts` se queda **solo con los campos de la
   lista** y los tipa. Todo lo demás que traiga el archivo —cédula, correo,
   nombres y apellidos por separado, creador de la sesión— se descarta al
   leerlo y **nunca llega a la base**: esa es la anonimización.
   - **Corte por fecha**: solo se guardan las respuestas a partir de
     `FECHA_MINIMA_RESPUESTA`. Los exports arrastran las respuestas de prueba
     de la puesta en marcha del formulario.
   - **Deduplicación (Momento 4)**: `quitarCorreosRepetidos` deja una respuesta
     por correo **y rol** dentro de un mismo documento.
4. **Persistencia** — `*-almacen.ts` inserta dentro de una **transacción**. En
   modo "reemplazar", el borrado de lo anterior va **después** de insertar lo
   nuevo y dentro de la misma transacción: si algo falla, no se ha perdido
   nada.
5. **Consumo** — los repositorios leen de Postgres y los paneles de
   `/transformaciones*` pintan gráficos y filtros.

### Clasificación temática de comentarios

Los aportes abiertos se agrupan por tema con **TF-IDF + K-Means**
(`lib/reglas/clasificacion.ts`), **sin servicios externos ni modelos
descargados** — el `.exe` portable debe seguir siendo autocontenido y los
comentarios son de personas identificables. Se recalcula entera en cada cargue
y en cada borrado, porque los grupos salen del conjunto.

### Normalización de texto libre: programa de los graduados

La pregunta "¿De qué programa eres graduado?" es de texto libre y llega escrita
de decenas de formas. `programasDeGraduado` (`lib/reglas/momento4.ts`) la
unifica **por palabra clave** a una lista canónica de 13 carreras; una
respuesta que nombra varias suma en cada barra; lo que no nombra ninguna
carrera cae en "Sin especificar". El valor crudo se guarda tal cual: la
estandarización se aplica en cada render, así que mejorar la regla no obliga a
re-migrar.

---

## 4. Reglas de negocio compartidas (`lib/reglas/`)

Cuando un umbral o un criterio lo necesitan **el servidor y la vista a la
vez**, vive en `lib/reglas/` — un módulo neutro, sin `server-only` ni
`"use client"`, que ambos importan. Ejemplo real: los rangos de días de
accesos y `UMBRAL_ATENCION_DIAS` estaban duplicados en el datasource y en el
panel; cambiar el criterio obligaba a editar dos capas y, si se olvidaba una,
el gráfico y las tarjetas se contradecían. Una regla se define una vez y se
importa.

---

## 5. Rendimiento: cómo conviven "Excel en vivo" y velocidad

`CacheArchivo` guarda en memoria lo ya parseado y lo descarta en cuanto cambia
la fecha de modificación del archivo (y, para orígenes que leen un directorio
completo, cuando aparece o desaparece un `.xlsx`). El resultado: los datos son
siempre los del Excel —editarlo se ve en la siguiente petición, sin
reiniciar— pero en estado estable una página no hace **ninguna** lectura de
disco. Al tocar esta capa hay que mantener ambas propiedades.

---

## 6. Despliegue: dos destinos, un mismo build

| Destino | Cómo | Notas |
|---|---|---|
| **Vercel** | Push a `main` → deploy automático | Producción serverless (Linux). `DATABASE_URL` y demás en *Project Settings ▸ Environment Variables*. El *Root Directory* es la raíz del repo. |
| **Ejecutable portable** | `Compilar-Portable.bat` (raíz) | Genera `PlaneacionEstrategica2027-2037.exe`, autocontenido y sin instalación. El `.exe` compilado y `launcher-src/portal.zip` no se versionan; el código del lanzador (`launcher-src/Program.cs`) sí. |

`pnpm build` debe pasar limpio. `output: "standalone"` **solo** se activa con
`BUILD_STANDALONE=1` para el `.exe`; nunca debe alterar el build normal que usa
Vercel.

Gestor de paquetes: **pnpm, obligatorio**. Nunca `npm`, `yarn` ni `bun`, en
ningún contexto.

---

## 7. Receta para un módulo nuevo

1. Deja el `.xlsx` en `data/source-<modulo>/` y regístralo en
   `outputFileTracingIncludes` (`next.config.ts`).
2. Declara los tipos en `types/<modulo>.ts` — nunca dentro del datasource.
3. Declara el contrato (`<Modulo>DataSource`) en `datasource/types.ts`.
4. Escribe `datasource/excel-<modulo>-source.ts`: lee con
   `infrastructure/excel`, cachea con `CacheArchivo`, sin lógica de vista.
5. Regístralo en `datasource/index.ts` con `crearSingleton`.
6. Crea `repositories/<modulo>Repository.ts` como única puerta de entrada.
7. La página consume el repositorio; el componente recibe los datos por props.

Si un umbral o criterio lo necesitan servidor y vista, ponlo en `lib/reglas/`
desde el principio.

---

## 8. Cómo se generan los diagramas

Los diagramas se autoran como una especificación JSON tipada y `archify` los
compila a HTML interactivo autocontenido (temas claro/oscuro, zoom, búsqueda,
exportar a PNG/SVG).

```bash
# Instalar la skill una vez (usa pnpm dlx, no npx)
pnpm dlx skills add tt-a1i/archify -g

# Regenerar tras editar un .json  (desde la carpeta de la skill)
node bin/archify.mjs validate architecture <ruta>/arquitectura.architecture.json \
  --quality showcase --repo-root <raíz-del-repo>
node bin/archify.mjs deliver  architecture <ruta>/arquitectura.architecture.json \
  <ruta>/arquitectura.html --quality showcase --repo-root <raíz-del-repo>
```

- `arquitectura.architecture.json` fija `meta.repository.revision` al commit
  con el que se verificaron las rutas de `sources`. Al mover archivos
  referenciados, actualizar ese SHA y volver a `deliver`.
- Los ficheros `*.visual-check.*` que produce `visual-check` son evidencia de
  QA y no se versionan.
