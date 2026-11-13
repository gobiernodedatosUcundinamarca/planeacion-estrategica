(async () => {
  const { default: assert } = await import('node:assert/strict');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { chromium, webkit } = await import('playwright');

  const resultados = [];
  for (const [nombre, motor, opciones] of [
    ['escritorio', chromium, { viewport: { width: 1600, height: 1000 } }],
    ['webkit', webkit, { viewport: { width: 1440, height: 1000 } }],
    ['telefono', webkit, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ]) {
    const navegador = await motor.launch();
    try {
      const pagina = await navegador.newPage(opciones);
      const errores = [];
      pagina.on('pageerror', error => errores.push(error.message));
      for (const ruta of ['/transformaciones-participacion', '/valoracion-territorio']) {
        const respuesta = await pagina.goto('http://127.0.0.1:3217' + ruta, { waitUntil: 'networkidle' });
        assert.equal(respuesta.status(), 200);
        assert.equal(await pagina.locator('aside').count(), 1);
        assert.equal(await pagina.locator('.lapiz-editorial').count(), 0);
        assert.equal(await pagina.locator('a[href*="127.0.0.1:322"]').count(), 0);
        assert.equal(await pagina.locator('aside .herramientas-pie button').count(), 2);
        assert.equal(await pagina.locator('header .control-edicion').count(), 0);
        await pagina.waitForFunction(() => {
          const menu = document.querySelector('[data-scroll-navegacion]');
          const activo = menu?.querySelector('[aria-current="page"]');
          if (!menu || !activo) return false;
          const limite = menu.getBoundingClientRect(), tarjeta = activo.getBoundingClientRect();
          return tarjeta.top >= limite.top - 1 && tarjeta.bottom <= limite.bottom + 1;
        });
        if (ruta.includes('participacion')) {
          assert.equal(await pagina.locator('.jornada').count(), 7);
          const totales = await pagina.locator('.jornada').evaluateAll(es => es.map(e => Number(e.dataset.total)));
          assert.equal(totales.reduce((a, b) => a + b, 0), Number(process.env.PARTICIPACION_TOTAL_ESPERADO || 3872));
          assert.equal(await pagina.locator('#cortes').count(), 0);
          assert.equal(await pagina.getByText('Aspectos pendientes de conciliación', { exact: true }).count(), 0);
        } else {
          assert.equal(await pagina.locator('.contexto strong').innerText(), '515');
          assert.deepEqual(await pagina.locator('.preguntas .porcentaje').allInnerTexts(), ['95,9%', '95,5%', '93,4%']);
          await pagina.locator('#dificultades .contador-consulta').first().click();
          assert.equal(await pagina.locator('.ventana-lista li').count(), 7);
          await pagina.keyboard.press('Escape');
        }
        const original = await pagina.locator('main h1').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
        await pagina.getByRole('button', { name: 'Configurar tamaño de los textos', exact: true }).click();
        const dialogo = pagina.getByRole('dialog', { name: 'Tamaño de los textos', exact: true });
        assert.equal(await dialogo.locator('input[type=number]').count(), 5);
        await dialogo.getByLabel('Títulos', { exact: true }).fill('120');
        await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
        await pagina.waitForFunction(original => Math.abs(parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize) - original * 1.2) < 0.03, original);
        await pagina.reload({ waitUntil: 'networkidle' });
        await pagina.waitForFunction(original => Math.abs(parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize) - original * 1.2) < 0.03, original);
        await pagina.getByRole('button', { name: 'Configurar tamaño de los textos', exact: true }).click();
        await dialogo.getByRole('button', { name: 'Restablecer tamaños', exact: true }).click();
        await dialogo.getByRole('button', { name: 'Guardar', exact: true }).click();
        await pagina.waitForFunction(original => Math.abs(parseFloat(getComputedStyle(document.querySelector('main h1')).fontSize) - original) < 0.03, original);
        resultados.push({ nombre, ruta, datos: true, marcoOficial: true, tamanosProporcionales: true, persistencia: true, restablecer: true });
      }
      assert.deepEqual(errores, []);
    } finally { await navegador.close(); }
  }
  if (process.env.VERIFICACION_SALIDA) {
    fs.mkdirSync(process.env.VERIFICACION_SALIDA, { recursive: true });
    fs.writeFileSync(path.join(process.env.VERIFICACION_SALIDA, 'integracion.json'), JSON.stringify(resultados, null, 2));
  }
  console.log(resultados);
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
