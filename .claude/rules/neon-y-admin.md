---
paths:
  - "app/admin/**"
  - "components/admin/**"
  - "components/transformaciones/**"
  - "components/transformaciones-participacion/**"
  - "repositories/datasource/postgres-*"
  - "repositories/datasource/*-almacen.ts"
  - "repositories/datasource/*-formato.ts"
  - "repositories/datasource/infrastructure/neon.ts"
  - "repositories/momento4Repository.ts"
  - "repositories/participacionRepository.ts"
  - "repositories/aportesRepository.ts"
  - "repositories/seccionesRepository.ts"
  - "repositories/metricasRepository.ts"
  - "repositories/valoracionTerritorioRepository.ts"
  - "repositories/iaAdministrativosRepository.ts"
  - "repositories/datasource/formularios-definicion.ts"
  - "components/valoracion-territorio/**"
  - "components/ia-administrativos/**"
  - "lib/reglas/**"
  - "types/momento4.ts"
  - "types/participacion.ts"
  - "types/aportes.ts"
  - "types/formularios.ts"
  - "types/valoracion-territorio.ts"
  - "types/ia-administrativos.ts"
  - "types/descargas.ts"
  - "app/api/descargas/**"
  - "repositories/descargasRepository.ts"
  - "components/layout/descarga-excel.tsx"
  - "scripts/**"
  - "data/source-momento4-planeacion-territorial/**"
  - "data/source-participacon-momoento4-planeacion-teritorial/**"
---

# Única excepción a "Excel en vivo": lo que se sube desde `/admin` vive en Postgres (Neon)

Los dos módulos del Momento 4 —las respuestas de "Transformaciones que nos
conectan" y la asistencia de su sección de **Participación**— **no** se leen de
un Excel en vivo: se guardan en Postgres. El motivo es que ambos se actualizan
**desde el sitio publicado** (`/admin`), y en Vercel —como en cualquier entorno
serverless— el sistema de archivos es de solo lectura, así que un `.xlsx` en
disco no se podría reemplazar.

Lo que **no** cambia: el `.xlsx` sigue siendo el formato de entrada y se valida
columna por columna contra `lib/reglas/momento4.ts` antes de guardar nada; los
datos siguen sin estar hardcodeados en el código. Lo que cambia es dónde quedan
las filas.

- Esquema: `pnpm migrar:momento4` (idempotente). Carga inicial desde los Excel
  de `data/source-momento4-planeacion-territorial/`: `pnpm cargar:momento4`.
  Otras migraciones, todas idempotentes: `pnpm migrar:secciones` (publicar o
  retirar una sección), `pnpm migrar:metricas` (tablero de uso),
  `pnpm migrar:clusters` (clasificación temática de comentarios),
  `pnpm migrar:participacion` (asistencia en territorio),
  `pnpm migrar:aportes` (formulario general del Plan),
  `pnpm migrar:valoracion-territorio`, `pnpm migrar:ia-administrativos` y
  `pnpm migrar:descargas` (registro de descargas en Excel).
- **Aportes generales** (`aportes_documento` / `aportes_respuestas`) son las
  respuestas al formulario abierto de UCUNDINAMARCA. Tiene **tabla y módulo
  propios, no una sexta casilla del Momento 4**, porque es otro cuestionario:
  comparte las 17 primeras columnas y cambia las tres preguntas sobre la
  transformación —cuál es, si responde a lo que se necesita y qué ajustaría—
  por una sola abierta. Sus respuestas no pueden entrar en el respaldo ni en
  los porcentajes de las cinco transformaciones, porque nunca contestaron esa
  pregunta; por eso se muestran en su propia tarjeta dentro de la misma
  sección. Solo se guarda el último archivo: el export de Forms es acumulativo
  y anexarlo duplicaría lo anterior.
- **Participación** (`/transformaciones-participacion`) es la sección de
  asistencia a las actividades en territorio, y se diferencia del resto en dos
  cosas deliberadas:
  · **No hay casillas fijas**: al subir se elige entre *anexar* —el archivo se
    agrega a las tandas ya cargadas, que es lo normal cuando ocurre un evento
    nuevo— y *reemplazar todo*, que lo deja como único contenido y sirve para
    corregir un cargue sin duplicar registros. Lo decide quien sube, no el
    código; el modo viaja en el formulario y **se valida en la server action**,
    porque "reemplazar" borra datos y una server action es un endpoint público.
  · **El formato se reconoce por nombre de columna, no por posición ni orden**
    (`lib/reglas/participacion.ts`), y **solo se guardan los campos de esa
    lista**. Correo, nombres y apellidos por separado y creador de la sesión se
    descartan al leerlo y nunca llegan a la base: esa es la anonimización. Para
    admitir una columna nueva se agrega su variante ahí, no en el código que lee.
  · **La cédula es la excepción**: sí se conserva en la base (columna `cedula`,
    variante "Documento") para trazabilidad, pero **nunca se publica en el
    dashboard**. `consultarRegistros` no la selecciona y no está en
    `RegistroParticipacion`, así que no viaja al cliente; se guarda pero no se
    muestra. **Única salida**: el botón *Descargar Excel* de /admin
    (`app/admin/participacion/descargar/route.ts`), que comprueba la sesión en
    la propia ruta y arma el .xlsx en el servidor con
    `consultarRegistrosAdministracion` y el tipo aparte
    `RegistroParticipacionAdministracion`, que nunca se pasa a un componente.
    Cualquier nuevo dato personal que deba conservarse sin publicarse
    sigue este mismo patrón: se escribe en la tabla, se deja fuera del SELECT
    público y fuera del tipo que llega al navegador.
  · **`lugar_desarrollo`** es la ciudad donde se desarrolló el evento (Ubaté,
    Zipaquirá, Girardot, Soacha…), distinta de la unidad regional —esa es la
    sede de origen del asistente—. Se asigna al cargar la tanda (no viene del
    Excel) y alimenta el filtro "Lugar de desarrollo" del dashboard; queda
    `null` ("Sin especificar") en los cargues que no la definan.
  · Cargar una jornada desde el repo: skill `cargar-participacion` (no scripts
    `__*.ts` sueltos).
- **Formularios de un solo documento**: la *valoración de la experiencia en
  territorio* (`/valoracion-territorio`, tablas `valoracion_territorio_*`) y la
  *encuesta de IA a administrativos* (`/ia-administrativos`, tablas
  `ia_administrativos_*`). Cada una tiene sus dos tablas (documento + respuestas)
  pero comparten un solo ciclo de carga: `formularios-definicion.ts` dice qué
  pregunta va a qué columna, `formulario-formato.ts` lee el export (columnas por
  el **inicio** del encabezado, porque Forms recorta los largos) y
  `formulario-almacen.ts` hace Reemplazar / Actualizar / Borrar. Las tablas se
  crean desde esa misma definición (`pnpm migrar:valoracion-territorio`,
  `pnpm migrar:ia-administrativos`), así que una pregunta nueva se agrega ahí y
  se vuelve a migrar. Un formulario nuevo de este tipo es una definición más,
  no otra copia del almacén ni de la tarjeta de /admin (`cargue-formulario.tsx`).
  · Son **anónimos**: el export trae "anonymous" y sin nombre, y correo, nombre,
    puntos y comentarios no se leen.
  · **Unidad regional**: ninguno la pregunta. Se deduce de la **fecha** de la
    respuesta cruzándola con las jornadas de Participación
    (`unidadRegionalPorFecha`): se respondieron al cierre de cada jornada. Se
    calcula al consultar, no se guarda, así que corregir una jornada en
    Participación corrige también estas secciones. Sin jornada ese día →
    "Sin especificar". IA solo tiene dos fechas (28 sep Fusagasugá, 27 oct
    Facatativá); la valoración, diez (seis unidades).
  · **Filtros**: valoración por unidad regional y rol (tipo de actor, con los
    nombres visibles en plural); IA solo por unidad regional, porque todos son
    administrativos (el tipo de funciones va como gráfico, no como filtro).
  · **Temas de las respuestas abiertas**: la misma `clasificarComentarios`, pero
    calculada al consultar (milisegundos con cientos de textos) y sin tocar sus
    palabras vacías: cada formulario pasa su lista de palabras que repite el
    enunciado (`PALABRAS_SIN_TEMA_*`). Si la agrupación no separa de verdad
    (`sonTemasUtiles`: ≥ 3 temas y ninguno con más del 75 %), la sección lo dice
    y muestra solo nube y lista. Hoy pasa con las sugerencias de la valoración.
- **Descargas en Excel** (botón al final de cada sección del menú →
  `/api/descargas/<seccion>`, `descargasRepository.ts`). Son **públicas**, así
  que todo sale **anónimo**: sin nombres, correos, documentos, códigos de
  estudiante ni autores; donde hace falta distinguir personas (Seguimiento,
  Accesos CAI) va un seudónimo estable ("Participante 001") ordenado por hash,
  no por correo, y cualquier correo escrito en un texto libre se tapa
  ("[correo omitido]"). La única descarga con datos personales sigue siendo la
  de Participación en /admin. Una sección nueva del menú necesita su
  constructor en `CONSTRUCTORES` (si no, responde 404).
  · **Protección de recursos**: límite por visitante (10 cada 10 min) y global
    (300 por hora), contados en `descargas_registro` para que valgan entre
    todas las instancias de Vercel (el límite del PIN, en memoria, no lo haría);
    copia en memoria del último archivo de cada sección, válida mientras no
    cambie la huella de sus datos (en las de Neon, un md5 calculado en la base
    —`huellaTablas`— para no traer miles de filas: ~0,5 s en vez de 12-16 s);
    una sola generación a la vez por sección; tope de 4 MB por archivo
    (Vercel corta en ~4,5 MB). `no-store` a propósito: con caché de CDN las
    descargas no pasarían por el límite ni por el registro. Si el registro no
    responde, no se entrega (sin conteo no hay límite).
  · **Auditoría**: cada petición, entregada o rechazada, queda en
    `descargas_registro` (`pnpm migrar:descargas`) con un HMAC de la IP —nunca
    la dirección—, y /admin muestra el resumen por sección, los visitantes con
    más peticiones y las últimas 25. Se conserva 180 días (se poda al abrir
    /admin, no en la petición pública). Una sección inexistente se guarda como
    "(no existe)", no con el texto que mandó el visitante.
  · El Excel se escribe con `exceljs` (estilos) dentro de
    `infrastructure/excel.ts`, que sigue siendo la única puerta a las librerías
    de Excel; la de lectura (XLSX) no guarda estilos en su edición gratuita.
- **Actualizar vs. Reemplazar** (las 5 transformaciones y UCUNDINAMARCA): el
  export de Forms es acumulativo, así que se sube siempre el archivo completo.
  · *Reemplazar* deja el archivo como único contenido de esa casilla.
  · *Actualizar* agrega solo las respuestas cuyo ID de Forms no está guardado
    (`calcularActualizacion`, `lib/reglas/momento4.ts`): lo ya cargado no se
    modifica ni se borra, aunque falte en el archivo o lo hayan editado en Forms.
    Única excepción, la regla de repetidos: si una persona (correo + rol,
    `identidadRespuesta`) volvió a responder, queda la respuesta de ID mayor.
    Si el archivo no comparte ningún ID con lo cargado se rechaza (probable
    export de otra transformación) y se sugiere Reemplazar. Sin nada nuevo no
    escribe ni reclasifica.
  · Los dos pasan por la misma lectura y verificación; el modo viaja en el
    formulario y se valida en la server action.
- **Clasificación de comentarios**: los aportes abiertos se agrupan por tema con
  TF-IDF + K-Means (`lib/reglas/clasificacion.ts`), sin servicios externos ni
  modelos descargados — el `.exe` portable debe seguir siendo autocontenido y
  los comentarios son de personas identificables. Se recalcula entera en cada
  cargue y en cada borrado, porque los grupos salen del conjunto. La silueta
  (con la que se elige cuántos grupos hay) recorre solo los términos no nulos
  de cada comentario y calcula cada distancia una vez para todos los k; da el
  mismo resultado exacto que el cálculo directo en ~1,7 s en vez de 18 s con
  ~3.400 comentarios. Al tocarla, comparar el JSON de grupos antes/después.
- **Corte por fecha**: solo se guardan las respuestas a partir de
  `FECHA_MINIMA_RESPUESTA` (`lib/reglas/momento4.ts`). Los exports arrastran
  las respuestas de prueba de la puesta en marcha del formulario, y sumarlas a
  las reales distorsionaría las cifras. Los .xlsx de
  `data/source-momento4-planeacion-territorial/` son anteriores a ese corte, así
  que `pnpm cargar:momento4` ya no carga nada — quedan como muestra del formato,
  no como semilla.
- La conexión se construye solo en `datasource/infrastructure/neon.ts`, igual
  que `excel.ts` es la única puerta a los .xlsx.
- Requiere `DATABASE_URL` en el entorno (`.env` local y portable; variables de
  entorno en Vercel). Ver `.env.example`.
- **Esto no abre la puerta a migrar otros módulos**: el resto sigue leyendo su
  Excel en vivo, y esa sigue siendo la regla por defecto para un módulo nuevo.
