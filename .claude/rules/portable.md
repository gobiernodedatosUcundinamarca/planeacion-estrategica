---
paths:
  - "Compilar-Portable.bat"
  - "iniciar-portal.bat"
  - "launcher-src/**"
  - "next.config.ts"
  - "pnpm-workspace.yaml"
---

# Ejecutable portable

`Compilar-Portable.bat` (raíz del repo) genera un `.exe` autocontenido y sin
instalación (`PlaneacionEstrategica2027-2037.exe`) a partir del proyecto.
Se regenera con ese script cada vez que el sitio cambie; el `.exe` compilado y
`launcher-src/portal.zip` nunca se versionan (ver `.gitignore`). El código
fuente del lanzador (`launcher-src/Program.cs`, compilado con el `csc.exe` que
ya trae Windows — sin instalar el SDK de .NET) sí se versiona.

- `output: "standalone"` solo se activa con `BUILD_STANDALONE=1` (lo pone el
  `.bat`); nunca debe alterar el build normal que usa Vercel.
- El build portable usa `node-linker: hoisted` en `pnpm-workspace.yaml`.
- Si alguna vez se anida el proyecto en otra carpeta, hay que actualizar a la
  vez el *Root Directory* del proyecto en Vercel y `Compilar-Portable.bat`.
