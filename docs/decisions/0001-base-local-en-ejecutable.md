# 0001 — Base de datos local en el ejecutable portable

- Fecha: 2026-11-15 · Estado: Aceptada

## Decisión
El `.exe` incluye una copia PGlite de la base publicada (`base-local/`) y no usa la red.
`conexionSql()` devuelve esa base cuando el lanzador define `BASE_LOCAL_DIR`.

## Motivo
El ejecutable debe funcionar sin internet, y los módulos de `/admin` viven en Postgres.

## Consecuencias
- Compilar requiere internet y `DATABASE_URL`; los datos quedan fijos al compilar.
- Lo que se carga desde `/admin` en el `.exe` queda solo en ese equipo.
- El paquete no lleva cadenas de conexión, pero contiene los datos de la base, incluidos
  datos personales de asistencia (nombre, código y cédula).
- `base-local.ts` emula el driver de Neon (plantilla, `query`, `transaction`; bigint y
  numeric como texto; `date` en hora local). Se verificaron las 23 tablas contra Neon.
- PGlite solo se empaqueta en el build portable; `next.config.ts` lo excluye de las
  funciones de Vercel.

## Referencias
Commit 8815116 · `repositories/datasource/infrastructure/base-local.ts` ·
`scripts/exportar-base-local.ts` · `Compilar-Portable.bat` · `launcher-src/Program.cs` ·
`next.config.ts`
