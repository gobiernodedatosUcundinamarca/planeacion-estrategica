---
name: publicar-cambios
description: Commit y push a main del repo de gobierno de datos con las reglas del proyecto (archivos explícitos, verificación previa, sin créditos de IA) y confirmación del deploy en Vercel. Úsala cuando el usuario diga "haz el push", "súbelo", "commitea" o pregunte si algo ya quedó desplegado.
---

# Publicar cambios (commit → push → Vercel)

Remoto: `origin` → `gobiernodedatosUcundinamarca/planeacion-estrategica`, rama `main`.

## 1. Verificar según el tipo de cambio

| Cambio | Verificación antes del commit |
|---|---|
| Solo datos (`data/**/*.xlsx`) | Ninguna de build. Basta con que la carga/lectura haya funcionado. |
| Código o configuración | `pnpm exec tsc --noEmit` y `pnpm build` limpios. Si toca metas: `pnpm validar:metas`. |
| Visual o interactivo | Lo anterior + skill `verificar-webkit` sobre las rutas afectadas. |

Si algo falla, **no se commitea**: se informa con la salida real.

## 2. Commit

1. `git status --short` y `git diff --stat` (no el diff completo salvo que haga falta).
2. `git add` **por nombre** de cada archivo. Nunca `-A` ni `.` (el hook lo bloquea).
3. Mensaje en español, impersonal, en una línea `tipo: descripción`:
   - tipos usados: `feat`, `fix`, `data`, `style`, `refactor`, `docs`, `seguridad`
   - ej.: `fix: la etiqueta Creadores de Oportunidades ya no se corta en el grafico de tipo de actor`
   - **sin** `Co-Authored-By` ni ninguna mención a IA (CLAUDE.md §5; el hook lo bloquea).
4. Identidad: la de `git config` del repo; nunca otra.

## 3. Push

```
git -c credential.helper= -c credential.helper=wincred push origin main
```
(es el que ha funcionado en este equipo). Nunca `--force` sin autorización explícita.

## 4. Confirmar el deploy

```
node .claude/skills/publicar-cambios/verificar-vercel.mjs        # HEAD; o pasa el sha
```
Sale con 0 = success, 1 = failure, 2 = sigue pendiente. Solo con `success` se
da el cambio por terminado. Córrelo en primer plano con timeout ≥ 400000 ms.

## 5. Reporte final (corto)

- Qué se hizo (y cifras si eran datos), hash del commit, rango del push
  (`abc123..def456`) y estado de Vercel. Nada más.
