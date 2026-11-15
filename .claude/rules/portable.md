---
paths:
  - "Compilar-Portable.bat"
  - "iniciar-portal.bat"
  - "launcher-src/**"
  - "next.config.ts"
  - "pnpm-workspace.yaml"
  - "scripts/exportar-base-local.ts"
  - "repositories/datasource/infrastructure/neon.ts"
  - "repositories/datasource/infrastructure/base-local.ts"
---
# Ejecutable portable
- `Compilar-Portable.bat` genera `PlaneacionEstrategica2027-2037.exe` desde una copia
  aislada. No se versionan el `.exe`, `launcher-src/portal.zip`, `portal-build-portable/`,
  `portal-portable/` ni `base-local/`; `launcher-src/Program.cs` sí.
- `output: "standalone"` solo con `BUILD_STANDALONE=1`; el build normal (Vercel) no cambia.
  El build portable usa `nodeLinker: hoisted`.
- Funciona sin internet con la base embebida (docs/decisions/0001): cualquier cambio
  en `conexionSql()` debe seguir funcionando con `base-local.ts`. El `.env` del
  paquete excluye `DATABASE_URL*`.
- Si se anida el proyecto, actualiza a la vez el Root Directory en Vercel y el `.bat`.
