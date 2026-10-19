---
name: refactorizar
description: Procedimiento obligatorio del proyecto para refactorizar o eliminar código/archivos sin cambiar cifras, interfaz ni flujo (red de seguridad con snapshot JSON, medición, stash para distinguir errores preexistentes). Úsala antes de cualquier refactor, reestructuración o borrado de archivos.
---

# Cómo refactorizar sin romper nada

El comportamiento observable es el contrato: mismas cifras, misma interfaz,
mismo flujo. Procedimiento que ya se usó y funcionó:

1. **Captura una red de seguridad antes de tocar código**: un script temporal
   que llame a todos los puntos de entrada de datos (los repositorios) y vuelque
   el resultado a un JSON. Incluye casos con filtros que devuelvan cifras
   distintas entre sí — un snapshot donde todo da 0 no prueba nada.
2. **Refactoriza en pasos pequeños** y vuelve a generar el JSON después de cada
   uno: si el `diff` contra el baseline es vacío, no hubo regresión.
3. **Mide, no supongas**: instrumenta `readFileSync` para contar lecturas reales
   antes y después. "Parece más rápido" no es un criterio.
4. **Distingue lo que rompiste de lo que ya estaba roto**: `git stash` + build +
   prueba te dice si un warning o un error de consola es tuyo o preexistente.
   Nunca lo declares preexistente sin comprobarlo.
5. Verifica al final: `pnpm build` limpio, `pnpm exec tsc --noEmit` sin errores,
   `pnpm validar:metas` en verde y la prueba en WebKit real (skill `verificar-webkit`).
6. Borra todo script temporal (`__*.ts`, `__*.mjs`) antes de terminar (el hook
   de cierre lo recuerda).

Antes de eliminar un archivo o carpeta, confirma que nada lo referencia — y
búscalo también fuera de `.ts`/`.tsx`: `shadcn` parecía una dependencia sin uso
hasta que se vio que `app/globals.css` la importa. Un `grep` que solo mira el
código de la aplicación no basta para declarar algo muerto.

Un cambio estructural solo se justifica si aporta un beneficio comprobable
(menos duplicación, menos acoplamiento, menos trabajo repetido). Refactorizar
por gusto estético no es motivo suficiente.
