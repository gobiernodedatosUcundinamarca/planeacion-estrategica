---
paths:
  - "repositories/**"
  - "lib/**"
  - "types/**"
  - "constants/**"
  - "app/**/page.tsx"
  - "app/api/**"
  - "next.config.ts"
  - "data/**"
  - "scripts/**"
---
# Datos y capas

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Infraestructura | `repositories/datasource/infrastructure/` | Leer hojas de cálculo (`excel.ts`), cachear (`cache-archivo.ts`), instanciar (`singleton.ts`), conectar (`neon.ts`). Sin negocio. |
| Origen | `repositories/datasource/*-source.ts`, `*-almacen.ts` | Interpretar una fuente y tiparla |
| Contratos | `repositories/datasource/types.ts` | Interfaz de cada origen |
| Repositorio | `repositories/*Repository.ts` | Única puerta a los datos |
| Reglas | `lib/reglas/` | Criterios que comparten servidor y vista (sin `server-only` ni `"use client"`) |
| Tipos | `types/` | Forma de los datos; nunca dentro de un datasource |

- Los datasources se construyen solo en `datasource/index.ts` con `crearSingleton`; el
  repositorio depende del contrato, no de la clase.
- .xlsx y .csv se leen con `infrastructure/excel.ts`; la caché de archivos usa
  `CacheArchivo` (invalida por mtime: editar el archivo se ve en la siguiente petición).
- Rutas relativas a `process.cwd()`; nunca rutas de un equipo concreto.
- Cada `data/source-*/` nuevo se registra en `outputFileTracingIncludes` (`next.config.ts`).
- Los datos de negocio viven en sus fuentes, no en componentes ni constantes.
- Toda consulta SQL pasa por `conexionSql()`, que en el ejecutable devuelve la base
  local (docs/decisions/0001).
- `pnpm migrar:*` son idempotentes y se ejecutan expresamente por entorno, nunca al
  visitar una página. Antes de borrar o sustituir datos de la base: muestra anomalías
  y el plan (antes → después) y espera la decisión del usuario.
