const BASE = process.env.PORTAL_PRUEBAS_URL || 'http://127.0.0.1:3217';
const CLAVE = 'planeacion-tamanos-generales-v3';
const RUTAS = ['/valoracion-territorio', '/transformaciones-participacion'];
const CATEGORIAS = [
  ['Títulos', 'main h1'], ['Subtítulos y encabezados', 'main h2'],
  ['Textos generales', 'main p'], ['Etiquetas y notas', 'main label'],
  ['Botones y menús', 'main button:not(.control-edicion):not(.lapiz-editorial)'],
];
const tamano = localizador => localizador.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
async function comprobarTamano(pagina, selector, esperado) {
  await pagina.waitForFunction(({ selector, esperado }) => {
    const elemento = document.querySelector(selector);
    return elemento && Math.abs(parseFloat(getComputedStyle(elemento).fontSize) - esperado) < 0.03;
  }, { selector, esperado });
}
(async () => {
  const { default: assert } = await import('node:assert/strict');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { chromium, webkit } = await import('playwright');

  const resultados = [];
  for (const [nombre, motor, opciones] of [
    ['chromium', chromium, { viewport: { width: 1440, height: 1000 } }],
    ['webkit', webkit, { viewport: { width: 1440, height: 1000 } }],
    ['webkit-movil', webkit, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ]) {
    const navegador = await motor.launch();
    try {
      const pagina = await navegador.newPage(opciones);
      const errores = [];
      let comprobarErrores = false;
      pagina.on('pageerror', error => { if (comprobarErrores) errores.push(error.message); });
      async function cargarDocumento(ruta, recargar = false) {
        // El documento saliente cancela sus precargas; se valida la página activa tras hidratarse.
        comprobarErrores = false;
        if (recargar) await pagina.reload({ waitUntil: 'networkidle' });
        else await pagina.goto(BASE + ruta, { waitUntil: 'networkidle' });
        await pagina.waitForFunction(() => document.querySelector('aside a[href="/transformaciones-participacion"]')
          && document.querySelector('.herramientas-pie button')?.disabled === false);
        comprobarErrores = true;
      }
      const originales = {};
      const fuentesOriginales = {};
      for (const ruta of RUTAS) {
        await cargarDocumento(ruta);
        originales[ruta] = await tamano(pagina.locator('main h1').first());
        fuentesOriginales[ruta] = await pagina.locator('main h1').evaluate(e => ({ familia: getComputedStyle(e).fontFamily, peso: getComputedStyle(e).fontWeight }));
      }
      await cargarDocumento(RUTAS[0]);
      const abrir = pagina.getByRole('button', { name: 'Configurar tamaño de los textos', exact: true });
      const dialogo = pagina.getByRole('dialog', { name: 'Tamaño de los textos', exact: true });
      const almacenado = () => pagina.evaluate(clave => localStorage.getItem(clave), CLAVE);
      assert.equal(await pagina.locator('aside .herramientas-pie .control-edicion').count(), 2);
      assert.equal(await pagina.locator('header .control-edicion').count(), 0);
      const ubicacion = await pagina.locator('.acciones-pie-lateral').evaluate(e => {
        const enlace = e.querySelector('.enlace-inicio').getBoundingClientRect();
        const herramientas = e.querySelector('.herramientas-pie').getBoundingClientRect();
        const lateral = e.closest('aside').getBoundingClientRect();
        return { separadas: enlace.right <= herramientas.left + 1,
          dentro: herramientas.right <= lateral.right && herramientas.left >= lateral.left,
          alineadas: Math.abs((enlace.top + enlace.bottom) / 2 - (herramientas.top + herramientas.bottom) / 2) < 2 };
      });
      assert.deepEqual(ubicacion, { separadas: true, dentro: true, alineadas: true });
      await abrir.click();
      assert.equal(await dialogo.locator('input[type=number]').count(), 5);
      assert.equal(await dialogo.locator('input[type=range]').count(), 5);
      assert.equal(await dialogo.locator('select').count(), 0);
      let valoresComprobados = 0;
      for (const [etiqueta, selector] of CATEGORIAS) {
        await dialogo.getByRole('button', { name: 'Restablecer tamaños', exact: true }).click();
        const original = await tamano(pagina.locator(selector).first());
        const valores = nombre === 'chromium' || etiqueta === 'Títulos'
          ? Array.from({ length: 226 }, (_, i) => i + 25) : [25, 48, 49, 99, 100, 101, 249, 250];
        for (const valor of valores) {
          await dialogo.getByLabel(etiqueta, { exact: true }).fill(String(valor));
          await comprobarTamano(pagina, selector, original * valor / 100);
          valoresComprobados++;
        }
        assert.equal(await almacenado(), null, 'La previsualización no debe escribir preferencias');
      }
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[0]]);
      assert.equal(await almacenado(), null);
      await abrir.click();
      await dialogo.getByLabel('Títulos', { exact: true }).fill('101');
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[0]] * 1.01);
      const deslizador = dialogo.getByRole('slider', { name: 'Tamaño de títulos', exact: true });
      await deslizador.focus();
      await pagina.keyboard.press('ArrowRight');
      assert.equal(await dialogo.getByLabel('Títulos', { exact: true }).inputValue(), '102');
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[0]] * 1.02);
      await pagina.keyboard.press('Escape');
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[0]]);
      assert.equal(await almacenado(), null);
      await abrir.click();
      await dialogo.getByLabel('Títulos', { exact: true }).fill('999');
      assert.equal(await dialogo.getByRole('button', { name: 'Guardar', exact: true }).isDisabled(), true);
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await abrir.click();
      await dialogo.getByLabel('Títulos', { exact: true }).fill('120');
      await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
      assert.deepEqual(JSON.parse(await almacenado()), { titulos: 120 });
      await cargarDocumento(RUTAS[0], true);
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[0]] * 1.2);
      await pagina.locator('aside a[href="/transformaciones-participacion"]').click();
      await pagina.waitForURL('**/transformaciones-participacion');
      await pagina.locator('.participacion-integrada').waitFor();
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[1]] * 1.2);
      assert.deepEqual(await pagina.locator('main h1').evaluate(e => ({ familia: getComputedStyle(e).fontFamily, peso: getComputedStyle(e).fontWeight })), fuentesOriginales[RUTAS[1]]);
      // Una nueva medición no debe volver a multiplicar el tamaño ya ajustado.
      await pagina.setViewportSize({ width: opciones.viewport.width - 30, height: opciones.viewport.height });
      await pagina.setViewportSize(opciones.viewport);
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[1]] * 1.2);
      await abrir.click();
      await dialogo.getByRole('button', { name: 'Restablecer tamaños', exact: true }).click();
      await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[1]] * 1.2);
      assert.deepEqual(JSON.parse(await almacenado()), { titulos: 120 });
      await abrir.click();
      await dialogo.getByRole('button', { name: 'Restablecer tamaños', exact: true }).click();
      await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[1]]);
      assert.deepEqual(JSON.parse(await almacenado()), {});
      await abrir.click();
      await dialogo.getByLabel('Títulos', { exact: true }).fill('130');
      await pagina.evaluate(() => {
        window.guardarAlmacenamientoPrueba = Storage.prototype.setItem;
        Storage.prototype.setItem = () => { throw new DOMException('Almacenamiento bloqueado', 'SecurityError'); };
      });
      try {
        await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
        await dialogo.getByRole('alert').filter({ hasText: 'no permite guardar' }).waitFor();
        assert.deepEqual(JSON.parse(await almacenado()), {});
        await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await comprobarTamano(pagina, 'main h1', originales[RUTAS[1]]);
      } finally {
        await pagina.evaluate(() => {
          Storage.prototype.setItem = window.guardarAlmacenamientoPrueba;
          delete window.guardarAlmacenamientoPrueba;
        });
      }
      if (process.env.TEST_EDITORIAL_PASSWORD) {
        const antes = await (await pagina.request.get(BASE + '/api/editorial')).json();
        await pagina.getByRole('button', { name: 'Activar modo de edición', exact: true }).click();
        const editor = pagina.locator('dialog[aria-labelledby=titulo-editorial]');
        await editor.getByLabel('Contraseña').fill(process.env.TEST_EDITORIAL_PASSWORD);
        await editor.getByRole('button', { name: 'Ingresar', exact: true }).click();
        await editor.waitFor({ state: 'hidden' });
        assert.ok(await pagina.locator('.lapiz-editorial').count() > 0);
        const objetivo = pagina.locator('main h1 [data-editorial-id]').first();
        const contenido = await objetivo.innerText();
        await objetivo.getByRole('button').click();
        await editor.locator('textarea').fill('Borrador que no debe guardarse');
        await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
        assert.equal(await objetivo.innerText(), contenido);
        const despues = await (await pagina.request.get(BASE + '/api/editorial')).json();
        assert.deepEqual(despues.textos, antes.textos);
        await pagina.getByRole('button', { name: 'Salir del modo de edición', exact: true }).click();
        assert.equal(await pagina.locator('.lapiz-editorial').count(), 0);
      }
      await pagina.locator('aside a[href="/valoracion-territorio"]').click();
      await pagina.waitForURL('**/valoracion-territorio');
      await pagina.locator('#dificultades .contador-consulta').first().click();
      const textoDetalleOriginal = await tamano(pagina.locator('.ventana-respuestas p').first());
      await pagina.keyboard.press('Escape');
      await abrir.click();
      await dialogo.getByLabel('Textos generales', { exact: true }).fill('110');
      await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
      await pagina.locator('#dificultades .contador-consulta').first().click();
      await comprobarTamano(pagina, '.ventana-respuestas p', textoDetalleOriginal * 1.1);
      assert.equal(await pagina.locator('.ventana-lista li').count(), 7);
      await pagina.keyboard.press('Escape');
      await abrir.click();
      await dialogo.getByRole('button', { name: 'Restablecer tamaños', exact: true }).click();
      await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
      assert.equal(await pagina.locator('[data-tamano-texto-base]').count(), 0);
      await pagina.locator('aside a[href="/transformaciones-participacion"]').click();
      await pagina.waitForURL('**/transformaciones-participacion');
      await comprobarTamano(pagina, 'main h1', originales[RUTAS[1]]);
      if (process.env.VERIFICACION_SALIDA) {
        fs.mkdirSync(process.env.VERIFICACION_SALIDA, { recursive: true });
        await pagina.screenshot({ path: path.join(process.env.VERIFICACION_SALIDA, nombre + '-controles.png') });
        await abrir.click();
        await pagina.screenshot({ path: path.join(process.env.VERIFICACION_SALIDA, nombre + '-dialogo.png') });
        await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click();
      }
      assert.deepEqual(errores, []);
      const resultado = { nombre, valoresComprobados, guardarCancelarEscape: true, persistencia: true,
        jerarquiaOriginal: true, fuenteYPesoIntactos: true, controlesAlPie: true, sinErroresDePagina: true };
      resultados.push(resultado);
      console.log(resultado);
      // Las preferencias v2 se leen sin alterar su almacenamiento al cancelar.
      const anterior = await navegador.newContext(opciones);
      await anterior.addInitScript(() => localStorage.setItem('planeacion-tamanos-generales-v2', '{"titulos":49}'));
      const legado = await anterior.newPage();
      await legado.goto(BASE + RUTAS[1], { waitUntil: 'networkidle' });
      await comprobarTamano(legado, 'main h1', originales[RUTAS[1]] * 1.02);
      await legado.getByRole('button', { name: 'Configurar tamaño de los textos', exact: true }).click();
      const d = legado.getByRole('dialog', { name: 'Tamaño de los textos', exact: true });
      assert.equal(await d.getByLabel('Títulos', { exact: true }).inputValue(), '102');
      await d.getByRole('button', { name: 'Cancelar', exact: true }).click();
      assert.equal(await legado.evaluate(clave => localStorage.getItem(clave), CLAVE), null);
      assert.equal(await legado.evaluate(() => localStorage.getItem('planeacion-tamanos-generales-v2')), '{"titulos":49}');
      await anterior.close();
    } finally { await navegador.close(); }
  }
  if (process.env.VERIFICACION_SALIDA) fs.writeFileSync(path.join(process.env.VERIFICACION_SALIDA, 'resultado-tamanos.json'), JSON.stringify(resultados, null, 2));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
