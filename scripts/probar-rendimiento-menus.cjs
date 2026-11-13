// Regresión: abrir un portal no debe volver a medir la tipografía de toda la página.
const BASE = process.env.PORTAL_PRUEBAS_URL || 'http://127.0.0.1:3217';
const CLAVE = 'planeacion-tamanos-generales-v3';

(async () => {
  const { default: assert } = await import('node:assert/strict');
  const { chromium, webkit } = await import('playwright');
  for (const [nombre, motor, opciones] of [
    ['chromium', chromium, { viewport: { width: 1440, height: 1000 } }],
    ['webkit', webkit, { viewport: { width: 1440, height: 1000 } }],
    ['webkit-movil', webkit, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ]) {
    const navegador = await motor.launch();
    try {
      const pagina = await navegador.newPage(opciones);
      const errores = [];
      const menus = pagina.locator('section[aria-labelledby=titulo-indicadores-encuestas] [data-slot=select-trigger]');
      const popup = pagina.locator('[data-slot=select-content][data-open]');
      // Base UI puede conservar un portal oculto para registrar sus opciones.
      const esperarCierre = () => pagina.locator('[data-slot=select-content]:visible').waitFor({ state: 'hidden' });
      await pagina.goto(BASE + '/transformaciones', { waitUntil: 'networkidle' });
      await menus.nth(1).click();
      const original = await popup.locator('[data-slot=select-item]').first()
        .evaluate(e => parseFloat(getComputedStyle(e).fontSize));
      await pagina.keyboard.press('Escape');
      await pagina.evaluate(clave => localStorage.setItem(clave, JSON.stringify({ controles: 115, textos: 110 })), CLAVE);
      await pagina.reload({ waitUntil: 'networkidle' });
      pagina.on('pageerror', error => errores.push(error.message));
      await pagina.waitForFunction(() => document.querySelector('[data-slot=select-trigger][data-tamano-texto-base]'));
      await pagina.locator('[data-testid=lista-comentarios][data-lista-completa=true]').waitFor();
      const totalComentarios = Number((await pagina.locator('[data-testid=conteo-comentarios] strong').innerText()).replace(/\D/g, ''));
      assert.ok(totalComentarios > 0);
      assert.equal(await pagina.locator('[data-comentario-id]').count(), totalComentarios, 'Todos los comentarios deben seguir disponibles');
      const primero = pagina.locator('[data-comentario-id]').first();
      const escritorioEscalado = await pagina.evaluate(() => document.documentElement.classList.contains('forzar-escritorio'));
      assert.equal(await primero.evaluate(e => getComputedStyle(e).contentVisibility), escritorioEscalado ? 'visible' : 'auto');
      const idsOriginales = await pagina.locator('[data-comentario-id]').evaluateAll(es => es.map(e => e.dataset.comentarioId));
      const desbordamientoOriginal = await pagina.locator('body').evaluate(e => e.style.overflow);
      await pagina.evaluate(() => {
        window.medicionMenus = { lecturas: 0, cambiosHoja: 0 };
        const leer = window.getComputedStyle;
        window.getComputedStyle = function (...args) {
          window.medicionMenus.lecturas++;
          return leer.apply(this, args);
        };
        const descriptor = Object.getOwnPropertyDescriptor(HTMLStyleElement.prototype, 'disabled');
        Object.defineProperty(HTMLStyleElement.prototype, 'disabled', {
          ...descriptor,
          set(valor) {
            window.medicionMenus.cambiosHoja++;
            return descriptor.set.call(this, valor);
          },
        });
      });
      const resultados = [];
      for (let menu = 0; menu < await menus.count(); menu++) {
        for (let repeticion = 0; repeticion < 3; repeticion++) {
          await pagina.evaluate(() => { window.medicionMenus = { lecturas: 0, cambiosHoja: 0 }; });
          await menus.nth(menu).click();
          await popup.waitFor();
          assert.equal(await pagina.locator('body').evaluate(e => e.style.overflow), desbordamientoOriginal,
            'Un filtro no debe bloquear el desplazamiento de toda la página');
          await pagina.waitForFunction(() => [...document.querySelectorAll('[data-slot=select-item]')]
            .every(e => e.hasAttribute('data-tamano-texto-base')));
          await pagina.waitForTimeout(200);
          const medicion = await pagina.evaluate(() => window.medicionMenus);
          assert.equal(medicion.cambiosHoja, 0, 'Abrir el menú no debe desactivar la escala de toda la página');
          assert.ok(medicion.lecturas < 2000, `Mediciones excesivas al abrir el menú: ${medicion.lecturas}`);
          const tamano = await popup.locator('[data-slot=select-item]').first()
            .evaluate(e => parseFloat(getComputedStyle(e).fontSize));
          assert.ok(Math.abs(tamano - original * 1.15) < 0.03, 'Las opciones nuevas deben conservar la escala elegida');
          resultados.push(medicion.lecturas);
          await pagina.keyboard.press('End');
          await pagina.keyboard.press('Home');
          await pagina.keyboard.press('Escape');
          await esperarCierre();
          assert.equal(await menus.nth(menu).evaluate(e => e === document.activeElement), true,
            'Escape debe devolver el foco al filtro');
        }
      }
      // El filtro de fecha conserva su selección múltiple y sus opciones completas.
      await menus.nth(1).click();
      await popup.waitFor();
      const fechas = popup.locator('[data-slot=select-item]');
      const cantidad = await fechas.count();
      await fechas.nth(1).click();
      await fechas.nth(2).click();
      assert.equal(await popup.locator('[aria-selected=true]').count(), 2);
      assert.equal(await fechas.count(), cantidad);
      await pagina.keyboard.press('Escape');
      await esperarCierre();
      await menus.nth(0).click();
      await pagina.locator('#titulo-indicadores-encuestas').click();
      await esperarCierre();
      await menus.nth(1).click();
      await popup.waitFor();
      assert.equal(await popup.locator('[aria-selected=true]').count(), 2);
      await pagina.keyboard.press('Escape');
      await esperarCierre();
      // Las fechas se pueden quitar y restablecer los resultados sin perder opciones.
      await pagina.locator('section[aria-labelledby=titulo-indicadores-encuestas]').getByRole('button', { name: 'Limpiar', exact: true }).click();
      assert.deepEqual(await pagina.locator('[data-comentario-id]').evaluateAll(es => es.map(e => e.dataset.comentarioId)), idsOriginales);
      const ultimo = pagina.locator('[data-comentario-id]').last();
      await ultimo.scrollIntoViewIfNeeded();
      await pagina.waitForFunction(() => document.querySelector('[data-comentario-id]:last-child [data-texto-original]')?.innerText.length > 0);
      assert.ok(await ultimo.locator('[data-texto-original]').innerText());
      assert.ok(await ultimo.evaluate(e => e.getBoundingClientRect().height > 0));
      await pagina.emulateMedia({ media: 'print' });
      assert.equal(await primero.evaluate(e => getComputedStyle(e).contentVisibility), 'visible',
        'La impresión debe incluir todos los comentarios sin diferirlos');
      await pagina.emulateMedia({ media: 'screen' });
      assert.deepEqual(errores, []);
      console.log({ nombre, aperturas: resultados.length, maxLecturas: Math.max(...resultados),
        sinRemedirPagina: true, escalaOpciones: true, seleccionMultiple: true,
        comentariosCompletos: idsOriginales.length, ultimoComentarioVisible: true, impresionCompleta: true, sinErrores: true });
    } finally {
      await navegador.close();
    }
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
