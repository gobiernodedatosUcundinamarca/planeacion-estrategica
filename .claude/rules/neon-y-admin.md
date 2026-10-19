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
  - "lib/reglas/**"
  - "types/momento4.ts"
  - "types/participacion.ts"
  - "types/aportes.ts"
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
  `pnpm migrar:participacion` (asistencia en territorio) y
  `pnpm migrar:aportes` (formulario general del Plan).
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
    muestra. Cualquier nuevo dato personal que deba conservarse sin publicarse
    sigue este mismo patrón: se escribe en la tabla, se deja fuera del SELECT
    público y fuera del tipo que llega al navegador.
  · **`lugar_desarrollo`** es la ciudad donde se desarrolló el evento (Ubaté,
    Zipaquirá, Girardot, Soacha…), distinta de la unidad regional —esa es la
    sede de origen del asistente—. Se asigna al cargar la tanda (no viene del
    Excel) y alimenta el filtro "Lugar de desarrollo" del dashboard; queda
    `null` ("Sin especificar") en los cargues que no la definan.
  · Cargar una jornada desde el repo: skill `cargar-participacion` (no scripts
    `__*.ts` sueltos).
- **Clasificación de comentarios**: los aportes abiertos se agrupan por tema con
  TF-IDF + K-Means (`lib/reglas/clasificacion.ts`), sin servicios externos ni
  modelos descargados — el `.exe` portable debe seguir siendo autocontenido y
  los comentarios son de personas identificables. Se recalcula entera en cada
  cargue y en cada borrado, porque los grupos salen del conjunto.
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
