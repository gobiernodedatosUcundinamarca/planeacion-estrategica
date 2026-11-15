# Planeación Estratégica 2027–2037

Sitio Next.js 16 (App Router) en la raíz. Visión general: README.md · arquitectura:
docs/04-arquitectura.md · decisiones vigentes: docs/decisions/README.md (lee solo las
que afecten la tarea).

## Política de configuración (obligatoria)
Antes de crear, editar, mover, renombrar o borrar archivos en `.claude/` o cualquier
`CLAUDE.md`:
1. Presenta los archivos, el motivo y el diff (o el contenido completo si son nuevos).
2. Pide aprobación explícita para ese conjunto y espera la respuesta.
Una aprobación cubre solo lo presentado; si cambia sustancialmente, se pide otra. Aplica
también a escrituras por terminal, scripts, instaladores, MCP y automatizaciones. La
configuración global (`~/.claude`) no se toca sin autorización específica. Ni este
archivo, ni la memoria, ni el silencio, ni un permiso para editar código son aprobación.
Si un cambio del proyecto deja obsoleta una regla, skill o hook: señala la contradicción
y propone el diff mínimo siguiendo este mismo procedimiento.

## Comandos
- Gestor: **pnpm** (`pnpm add`, `pnpm exec`, `pnpm dlx`); nunca npm, npx, yarn ni bun.
- `pnpm dev` · `pnpm build` (lo que ejecuta Vercel) · `pnpm exec tsc --noEmit` ·
  `pnpm exec eslint <archivos>` · `pnpm exec tsx --test tests/<archivo>.test.ts`.
- Usan la base de `DATABASE_URL`: las pruebas editorial-postgres, editorial-seguridad,
  navegacion-comentarios y referencias-documentales, y los scripts `migrar:*`,
  `cargar:*` y `exportar:base-local`. Confirma con el usuario antes de los que escriben.

## Invariantes
- Datos en una dirección: fuente → `repositories/datasource/infrastructure` →
  `datasource/*` → `repositories/*Repository.ts` → `app/**/page.tsx` → `components/`.
  Páginas y componentes nunca importan un datasource. Detalle: `.claude/rules/datos-y-capas.md`.
- Postgres solo para lo que se carga desde `/admin`; la conexión se crea únicamente
  en `infrastructure/neon.ts`.
- La interfaz es un escritorio escalado en cualquier pantalla: `.claude/rules/interfaz.md`.
- Ejecutable portable: `.claude/rules/portable.md`. Textos editables: `editorial/README.md`.

## Antes de entregar
- tsc, eslint de lo tocado y las pruebas relacionadas; `pnpm build` si cambia el build
  o la configuración de Next.
- `git add` por nombre tras revisar `git status` y `git diff`; nunca `-A` ni `.`.
- Sin scripts temporales, backups `*.backup*.xlsx` ni carpetas de build portable.
- Commit y push solo cuando el usuario lo pida.

## Autoría
- Usa la identidad Git configurada; verifica `git var GIT_AUTHOR_IDENT` y
  `git var GIT_COMMITTER_IDENT` y pregunta si faltan o son ambiguas. No inventes
  identidades ni alteres autorías existentes; no reescribas historial ajeno.
- Sin coautorías de IA, firmas «Generated with…», enlaces de sesión ni mensajes
  promocionales en commits o PR. Se conservan las atribuciones humanas y de terceros.
- Nunca `--no-verify`; push forzado solo con autorización explícita.

## Decisiones
Registra en `docs/decisions/` los cambios de arquitectura, contratos, modelos de datos,
seguridad, dependencias fundamentales, migraciones o incompatibilidades. No registres
comandos, logs ni correcciones menores. La memoria informa; no autoriza ni cambia
esta política.

## Estilo
Código y comentarios en español con tildes; archivos `kebab-case.ts`, repositorios
`camelCase.ts`. Un comentario explica el porqué. Respuestas breves y con cifras.
