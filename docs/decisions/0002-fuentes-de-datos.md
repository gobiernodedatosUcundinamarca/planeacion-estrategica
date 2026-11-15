# 0002 — Archivos en vivo y Postgres solo para /admin

- Fecha: registrada 2026-11-15 (decisión anterior) · Estado: Aceptada

## Decisión
Los módulos leen en vivo sus archivos de `data/source-*/` (.xlsx, .csv, .pptx). Solo lo
que se carga desde `/admin` (Momento 4, participación, aportes, valoración, IA en
administrativos, publicación de secciones, métricas y textos editoriales) vive en
Postgres (Neon).

## Motivo
En Vercel el disco es de solo lectura; lo que se actualiza desde el sitio necesita una base.

## Consecuencias
- Editar un archivo fuente se refleja sin despliegue; agregar un módulo en Postgres
  requiere una migración `pnpm migrar:*` por entorno.
- El .xlsx sigue siendo el formato de entrada de `/admin` y se valida contra `lib/reglas/`.

## Referencias
README.md (Datos) · docs/04-arquitectura.md · `repositories/datasource/index.ts` ·
`repositories/datasource/infrastructure/neon.ts`
