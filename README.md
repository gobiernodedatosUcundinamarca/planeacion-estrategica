# Planeación Estratégica 2027–2037

Portal de analítica y visualización estratégica institucional de la Universidad de
Cundinamarca — "Participación, tu voz es fundamental". Consolida los resultados del
diagnóstico de participación, la valoración de momentos, los ciclos de diálogo
estratégico, las metas por categoría, los accesos al CAI, la analítica de
actividades y los módulos participativos del Momento 4 (Transformaciones que nos
conectan, su seguimiento de Participación en territorio y los aportes generales al
Plan).

## Estructura

El sitio (Next.js 16, App Router) vive en la raíz del repositorio:

```
app/              Rutas y páginas (Server Components); app/admin/ para el cargue
components/       Interfaz
repositories/     Única puerta de entrada a los datos
  datasource/     Lectura e interpretación de cada origen (Excel y Postgres)
    infrastructure/  excel.ts (única puerta a los .xlsx) y neon.ts (a Postgres)
data/source-*/    Los .xlsx que se leen en vivo: fuente de verdad de la mayoría
lib/reglas/       Reglas de negocio que comparten servidor y vista
lib/              Utilidades sin estado
types/            Tipos de dominio
scripts/          Migraciones y validaciones (tsx)
docs/             Análisis, decisiones y diagramas de arquitectura
launcher-src/     Código del lanzador del .exe portable
```

## Requisitos

- Node.js 24+
- **pnpm 11+** (obligatorio — ver [.claude/CLAUDE.md](.claude/CLAUDE.md))
- `DATABASE_URL` en el entorno para los módulos del Momento 4 (ver
  [`.env.example`](.env.example))

## Desarrollo

```bash
pnpm install
pnpm dev
```

O bien, con doble clic: `iniciar-portal.bat` (instala dependencias si hace falta,
levanta el servidor y abre el navegador).

## Datos

Hay dos orígenes, y el flujo va siempre en una dirección: origen → infraestructura
→ datasource → repositorio → página → componente.

### 1. Excel en vivo (por defecto)

Los `.xlsx` de `data/source-*/` son la fuente de verdad de la mayoría de los
módulos y se leen en vivo: editar un archivo se refleja en la siguiente petición,
sin regenerar nada ni reiniciar el servidor. No hay JSON intermedios ni scripts
ETL. Todo `data/source-*/` nuevo debe registrarse en `outputFileTracingIncludes`
(`next.config.ts`).

```bash
pnpm validar:metas   # verifica la consistencia de los Excel del módulo Metas
```

### 2. Postgres (Neon) — solo lo que se sube desde `/admin`

Momento 4 (Transformaciones que nos conectan), su sección de Participación y los
aportes generales al Plan se actualizan desde el sitio publicado (`/admin`), donde
el sistema de archivos es de solo lectura, así que sus filas viven en Postgres. El
`.xlsx` sigue siendo el formato de entrada: se valida columna por columna contra
`lib/reglas/` y se anonimiza (solo se guardan los campos de la lista) antes de
persistir.

```bash
pnpm migrar:momento4      # esquema de Transformaciones que nos conectan
pnpm migrar:clusters      # clasificación temática de comentarios
pnpm migrar:participacion # asistencia en territorio
pnpm migrar:aportes       # formulario abierto de UCUNDINAMARCA
pnpm migrar:secciones     # qué secciones están publicadas
pnpm migrar:metricas      # tablero de uso
```

Todas las migraciones son idempotentes. La conexión se construye solo en
`repositories/datasource/infrastructure/neon.ts`.

## Ejecutable portable

`Compilar-Portable.bat` genera `PlaneacionEstrategica2027-2037.exe`,
autocontenido y sin instalación. El .exe no se versiona: se regenera con ese
script cuando el sitio cambia. El mismo build corre en Vercel y en el `.exe`;
`output: "standalone"` solo se activa con `BUILD_STANDALONE=1`.

## Documentación

- [`docs/04-arquitectura.md`](docs/04-arquitectura.md) — capas, los dos orígenes
  de datos, el cargue desde `/admin`, rendimiento y despliegue.
- [`docs/diagramas/arquitectura.html`](docs/diagramas/arquitectura.html) y
  [`docs/diagramas/cargue.html`](docs/diagramas/cargue.html) — diagramas
  interactivos autocontenidos (se regeneran con `archify`).
- [`docs/01-analisis-funcional.md`](docs/01-analisis-funcional.md),
  [`docs/02-investigacion-arquitectura.md`](docs/02-investigacion-arquitectura.md),
  [`docs/03-design-system-dashboards.md`](docs/03-design-system-dashboards.md).

## Reglas del proyecto

Antes de contribuir, lee [.claude/CLAUDE.md](.claude/CLAUDE.md): gestor de paquetes, arquitectura de
datos, capas y quién puede llamar a quién, la regla de "sin diseño responsivo
móvil", y las buenas prácticas obligatorias antes de subir cambios.
