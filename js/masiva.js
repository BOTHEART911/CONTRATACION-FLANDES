/* ============================================================
   CARGA MASIVA DE CONTRATISTAS · archivo compartido
   Ecosistema Flandes · Fase 10, entrega 10.2
   El MISMO archivo va en ADMIN-FLANDES y en CONTRATACION-FLANDES.

   #/masiva
     1. Descargas la plantilla de Excel (plantillas/…xlsx), la llenas y
        la cargas aquí (tocar, arrastrar o soltar el archivo).
     2. El teléfono lee el Excel (SheetJS, se baja del CDN solo aquí) y
        manda las filas en UNA llamada a 'masivaRevisar': el CORE dice
        fila por fila si entra o por qué no, con las MISMAS reglas del
        alta de uno (documento, contrato, CDP, secretaría, supervisor,
        obligaciones) y sin escribir nada.
     3. "Registrar" manda las que pasan a 'masivaGuardar' (hasta 40 por
        llamada; si son más, va por tandas y lo dice). Con la casilla de
        avisos apagada se registra EN SILENCIO: a nadie le llega nada.
     4. El resultado se descarga en Excel.

   La plantilla se reconoce por los ENCABEZADOS, no por la posición: se
   puede mover o esconder una columna sin romper la carga.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};
  var CDN_XLSX = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  var PLANTILLA = 'plantillas/PLANTILLA_CARGA_MASIVA_CONTRATISTAS.xlsx';
  var TANDA = 40;
  var ULTIMO = { filas: [], revision: null, resultado: null, archivo: '' };

  /* encabezado de la plantilla (sin tildes ni signos) -> campo */
  var CAMPOS = [
    [/^DOCUMENTO/, 'documento'], [/^NOMBRE/, 'nombre'], [/^(N|NO|NRO|NUMERO)( DE)? CONTRATO$|^CONTRATO$/, 'contrato'],
    [/^TIPO/, 'tipo'], [/^FECHA/, 'fechaContrato'], [/^VALOR/, 'valor'], [/^CDP/, 'cdp'], [/^OBJETO/, 'objeto'],
    [/^SECRETARIA/, 'secretaria'], [/^SUPERVISOR/, 'supervisor'], [/^CELULAR|^TELEFONO/, 'telefono'], [/^CORREO/, 'correo'],
    [/^OBLIGACIONES/, 'obligaciones']
  ];

  function configurar(o) { C = o || {}; }

  /** 'N° CONTRATO', 'Secretaría *' o 'OBLIGACIONES (numeradas)' -> solo letras, números y espacios. */
  function sinTilde(s) {
    return (K.norm ? K.norm(s) : String(s || '').toUpperCase()).replace(/[^A-ZÑ0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function guion(url) {
    return new Promise(function (ok, mal) {
      if (window.XLSX) { ok(); return; }
      var s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { mal(new Error('No se pudo cargar el lector de Excel. Revisa el internet e intenta de nuevo.')); };
      document.head.appendChild(s);
    });
  }

  function dmy(d) { return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear(); }

  function texto(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return isNaN(v.getTime()) ? '' : dmy(v);
    if (typeof v === 'number') return String(Math.round(v * 100) / 100);
    return String(v).replace(/\s+/g, ' ').trim();
  }

  /** Fecha de Excel (número de serie, texto dd/mm/aaaa o Date) -> dd/mm/aaaa. */
  function fechaExcel(v) {
    if (typeof v === 'number' && window.XLSX && window.XLSX.SSF) {
      var p = window.XLSX.SSF.parse_date_code(v);
      if (p && p.y) return ('0' + p.d).slice(-2) + '/' + ('0' + p.m).slice(-2) + '/' + p.y;
    }
    var t = texto(v);
    var m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(t);
    if (m) return ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + m[3];
    var i = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    return i ? i[3] + '/' + i[2] + '/' + i[1] : t;
  }

  /** "1. Hacer esto 2. Hacer aquello" -> ['Hacer esto', 'Hacer aquello'] (el mismo corte del alta de uno). */
  function partir(t) {
    if (window.GESTION && window.GESTION._partir) return window.GESTION._partir(t);
    return String(t || '').split(/(?:^|\s)\d{1,2}[.)-]\s+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /**
   * Lee el libro: la hoja CONTRATISTAS (o la primera), busca la fila de
   * encabezados (la que dice DOCUMENTO) y arma una fila por contrato.
   * Devuelve { filas, avisos }.
   */
  function leerLibro(buf) {
    /* sin cellDates: las fechas llegan como número de serie de Excel y se
       leen con SSF (día, mes y año tal cual), sin pasar por la zona horaria
       del teléfono, que corría las fechas un día hacia atrás */
    var lib = window.XLSX.read(buf, { type: 'array' });
    var nombre = lib.SheetNames.filter(function (n) { return sinTilde(n) === 'CONTRATISTAS'; })[0] || lib.SheetNames[0];
    var aoa = window.XLSX.utils.sheet_to_json(lib.Sheets[nombre], { header: 1, raw: true, defval: '' });
    var iCab = -1;
    for (var i = 0; i < Math.min(aoa.length, 15); i++) {
      if (aoa[i].some(function (c) { return /^DOCUMENTO/.test(sinTilde(c)); })) { iCab = i; break; }
    }
    if (iCab < 0) throw new Error('No encontré la fila de encabezados (la que dice DOCUMENTO). Usa la plantilla sin cambiarle los títulos.');
    var cab = aoa[iCab].map(function (c) { return sinTilde(c); });
    var mapa = {}, obl = {};
    cab.forEach(function (h, j) {
      var m = /^OBLIGACION (\d{1,2})$/.exec(h);
      if (m) { obl[j] = +m[1]; return; }
      for (var k = 0; k < CAMPOS.length; k++) if (CAMPOS[k][0].test(h) && mapa[CAMPOS[k][1]] === undefined) { mapa[CAMPOS[k][1]] = j; break; }
    });
    var faltan = ['documento', 'nombre', 'contrato', 'valor', 'cdp', 'secretaria', 'supervisor'].filter(function (k) { return mapa[k] === undefined; });
    if (faltan.length) throw new Error('A la plantilla le faltan columnas: ' + faltan.join(', ') + '.');
    var filas = [];
    for (var r = iCab + 1; r < aoa.length; r++) {
      var f = aoa[r];
      if (!f.some(function (c) { return texto(c); })) continue;
      var x = { fila: r + 1 };
      Object.keys(mapa).forEach(function (k) { x[k] = f[mapa[k]]; });
      /* los números se mandan como texto sin puntos: 12.000.000 o 12000000 */
      x.documento = texto(x.documento).replace(/\D/g, '');
      x.contrato = texto(x.contrato).replace(/\D/g, '');
      x.cdp = texto(x.cdp).replace(/\D/g, '');
      x.valor = typeof x.valor === 'number' ? Math.round(x.valor) : texto(x.valor).replace(/[^\d]/g, '');
      x.telefono = texto(x.telefono).replace(/\D/g, '');
      x.fechaContrato = fechaExcel(x.fechaContrato);
      ['nombre', 'tipo', 'objeto', 'secretaria', 'supervisor', 'correo'].forEach(function (k) { x[k] = texto(x[k]); });
      var lista = [];
      if (mapa.obligaciones !== undefined) lista = partir(texto(f[mapa.obligaciones]).replace(/\s*\n\s*/g, ' '));
      Object.keys(obl).sort(function (a, b) { return obl[a] - obl[b]; }).forEach(function (j) { var o = texto(f[j]); if (o) lista.push(o); });
      x.obligaciones = lista;
      /* la fila de ejemplo de la plantilla no se carga */
      if (/^EJEMPLO/i.test(x.nombre) || x.documento === '1234567890') continue;
      filas.push(x);
    }
    if (!filas.length) throw new Error('La plantilla no trae filas llenas debajo de los encabezados.');
    return { filas: filas, hoja: nombre };
  }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista gs ms"></div>');
    C.app.appendChild(caja);
    caja.appendChild(K.nodo(
      '<header class="ct-cab"><span class="ct-cab__ico">' + K.icono('hoja', 22) + '</span>' +
      '<div><h2 class="ct-cab__t">CARGA MASIVA</h2><p class="ct-cab__p">Registra varios contratos de una vez con la plantilla de Excel. ' +
      'Primero se <b>revisa</b> todo (no se escribe nada) y después registras solo lo que pasó.</p></div></header>'));

    var p1 = K.nodo('<section class="kit-tarjeta formulario ms-paso"><h3 class="grupo__t">1 · La plantilla</h3>' +
      '<p class="formulario__nota">Una fila por contrato. Las <b>obligaciones</b> van en una sola celda, numeradas (1. 2. 3. …), o en las columnas OBLIGACIÓN 1 a 26. ' +
      'La hoja LISTAS trae las secretarías, supervisores y tipos tal como deben ir.</p>' +
      '<a class="kit-btn kit-btn--plano ms-plantilla" download>' + K.icono('descargar', 16) + ' Descargar la plantilla</a></section>');
    p1.querySelector('a').href = PLANTILLA;
    caja.appendChild(p1);

    var p2 = K.nodo('<section class="kit-tarjeta formulario ms-paso"><h3 class="grupo__t">2 · Carga el archivo</h3>' +
      '<label class="ms-zona" tabindex="0"><input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden>' +
      '<span class="ms-zona__ico">' + K.icono('hoja', 30) + '</span><b>Toca para elegir el Excel</b><small>o arrástralo aquí</small></label>' +
      '<p class="ms-archivo" aria-live="polite"></p></section>');
    caja.appendChild(p2);
    var zona = p2.querySelector('.ms-zona'), inp = p2.querySelector('input'), rot = p2.querySelector('.ms-archivo');

    var p3 = K.nodo('<section class="ms-res" aria-live="polite"></section>');
    caja.appendChild(p3);
    K.piezas.creditos.montar(caja);

    function tomar(archivo) {
      if (!archivo) return;
      if (!/\.xlsx?$/i.test(archivo.name)) { K.aviso('Carga el archivo de Excel (.xlsx) de la plantilla.', 'aviso', 5000); return; }
      rot.textContent = archivo.name;
      ULTIMO = { filas: [], revision: null, resultado: null, archivo: archivo.name };
      p3.innerHTML = '';
      var quitar = K.piezas.esqueletos ? K.piezas.esqueletos.poner(p3, { forma: 'tarjetas', cuantos: 3, espera: 'Leyendo y revisando el archivo' }) : function () {};
      guion(CDN_XLSX).then(function () {
        return archivo.arrayBuffer ? archivo.arrayBuffer() : new Promise(function (ok) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.readAsArrayBuffer(archivo); });
      }).then(function (buf) {
        var l = leerLibro(buf);
        ULTIMO.filas = l.filas;
        if (l.filas.length > 300) throw new Error('El archivo trae ' + l.filas.length + ' filas: máximo 300 por archivo.');
        return K.pedir('masivaRevisar', { filas: l.filas }, { ms: 120000 });
      }).then(function (r) {
        quitar();
        ULTIMO.revision = r;
        pintarRevision(p3, r);
      }, function (e) {
        quitar();
        p3.innerHTML = '';
        p3.appendChild(C.errorCaja ? C.errorCaja(e, function () { tomar(archivo); }) : K.nodo('<p class="kit-tarjeta">' + K.esc(e.message) + '</p>'));
      });
    }
    inp.addEventListener('change', function () { tomar(inp.files && inp.files[0]); inp.value = ''; });
    zona.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
    ['dragenter', 'dragover'].forEach(function (t) { zona.addEventListener(t, function (e) { e.preventDefault(); zona.classList.add('ms-zona--sobre'); }); });
    ['dragleave', 'drop'].forEach(function (t) { zona.addEventListener(t, function (e) { e.preventDefault(); zona.classList.remove('ms-zona--sobre'); }); });
    zona.addEventListener('drop', function (e) { tomar(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
  }

  function pesos(v) { return '$ ' + (K.pesos ? K.pesos(v || 0).replace(/^\$\s*/, '') : Number(v || 0).toLocaleString('es-CO')); }
  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }

  function tarjetaFila(r, conEnlace) {
    var t = K.nodo('<article class="kit-tarjeta ms-f ' + (r.ok ? 'ms-f--ok' : 'ms-f--mal') + '">' +
      '<span class="ms-f__ico">' + K.icono(r.ok ? 'check' : 'aviso', 18) + '</span>' +
      '<div class="ms-f__txt"><b></b><small></small><p></p></div></article>');
    t.querySelector('b').textContent = (r.nombre ? nombre(r.nombre) : 'Sin nombre') + (r.contrato ? ' · contrato ' + r.contrato : '');
    t.querySelector('small').textContent = 'Fila ' + r.fila + (r.documento ? ' · CC ' + r.documento : '') + (r.secretaria ? ' · ' + nombre(r.secretaria) : '');
    t.querySelector('p').textContent = r.ok
      ? (r.idContrato ? 'Registrado' + (r.nuevo === false ? ' (ya había estado: conserva sus datos y su contraseña)' : '') : (r.tipo || 'Listo para registrar') + (r.valor ? ' · ' + pesos(r.valor) : ''))
      : (r.error || 'No pasa');
    if (conEnlace && r.idContrato && C.irA) {
      var b = K.nodo('<button type="button" class="kit-btn kit-btn--plano ms-f__ver">' + K.icono('documento', 14) + ' Ver ficha</button>');
      b.addEventListener('click', function () { C.irA('contratista/' + encodeURIComponent(r.idContrato)); });
      t.querySelector('.ms-f__txt').appendChild(b);
    }
    return t;
  }

  function pintarRevision(z, r) {
    z.innerHTML = '';
    var buenas = r.filas.filter(function (x) { return x.ok; }), malas = r.filas.filter(function (x) { return !x.ok; });
    var s = K.nodo('<section class="kit-tarjeta formulario ms-paso"><h3 class="grupo__t">3 · Revisión</h3>' +
      '<div class="ct-cifras ms-cifras"><div class="ct-cifra"><b>' + r.filas.length + '</b><span>Filas</span></div>' +
      '<div class="ct-cifra ms-ok"><b>' + buenas.length + '</b><span>Pasan</span></div>' +
      '<div class="ct-cifra ms-mal"><b>' + malas.length + '</b><span>No pasan</span></div></div></section>');
    z.appendChild(s);
    if (malas.length) s.appendChild(K.nodo('<p class="formulario__nota formulario__nota--fuerte">Las que no pasan no se registran. Corrígelas en el Excel y vuelve a cargarlo: las que ya estén registradas saldrán como "ya está registrado".</p>'));
    if (buenas.length) {
      var av = K.nodo('<label class="op-check cf-sw"><input type="checkbox" checked><span>Avisar a cada contratista (su contraseña si es nuevo y el aviso del contrato). Sin marcar se registra <b>en silencio</b>.</span></label>');
      s.appendChild(av);
      var bt = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('check', 16) + ' Registrar ' + buenas.length + (buenas.length === 1 ? ' contrato' : ' contratos') + '</button>');
      if (buenas.length > TANDA) s.appendChild(K.nodo('<p class="formulario__nota">Son más de ' + TANDA + ': se registran por tandas de ' + TANDA + ' (cada contrato crea su carpeta en Drive). No cierres la app.</p>'));
      s.appendChild(bt);
      bt.addEventListener('click', function () {
        K.piezas.confirmar.preguntar({
          titulo: '¿Registrar ' + buenas.length + (buenas.length === 1 ? ' contrato?' : ' contratos?'),
          texto: av.querySelector('input').checked ? 'A cada uno le llega el aviso (y su contraseña si es nuevo).' : 'En silencio: no le llega nada a nadie. Los nuevos tendrán que usar "Olvidé mi contraseña".',
          si: 'Registrar'
        }).then(function (si) { if (si) registrar(z, buenas, av.querySelector('input').checked); });
      });
    }
    var l = K.nodo('<div class="ms-lista"></div>');
    malas.concat(buenas).forEach(function (x) { l.appendChild(tarjetaFila(x, false)); });
    z.appendChild(l);
  }

  function registrar(z, buenas, avisar) {
    var porFila = {};
    ULTIMO.filas.forEach(function (f) { porFila[f.fila] = f; });
    var envio = buenas.map(function (b) { return porFila[b.fila]; }).filter(Boolean);
    var tandas = [];
    for (var i = 0; i < envio.length; i += TANDA) tandas.push(envio.slice(i, i + TANDA));
    var hechos = [], n = 0;
    K.ocupado = true;
    function siguiente() {
      if (n >= tandas.length) return Promise.resolve();
      var t = tandas[n++];
      return K.pedir('masivaGuardar', { filas: t, avisar: avisar }, { ms: 330000 }).then(function (r) {
        hechos = hechos.concat(r.filas || []);
        if (r.contratistas && window.CONTRATISTAS) window.CONTRATISTAS.recibir(r.contratistas);
        if (r.bitacora && C.bitacora) C.bitacora(r.bitacora);
        return siguiente();
      });
    }
    K.piezas.guardado.mientras(siguiente(), {
      titulo: 'Registrando ' + envio.length + (envio.length === 1 ? ' contrato' : ' contratos'),
      sub: tandas.length > 1 ? 'En ' + tandas.length + ' tandas. No cierres la app.' : 'No cierres la app.',
      pasos: ['Revisando otra vez contra la hoja', 'Creando las carpetas', avisar ? 'Avisando a cada contratista' : 'En silencio, sin avisos'],
      listo: { titulo: 'Carga terminada', paso: 'Mira el resultado' }
    }).then(function () {
      K.ocupado = false;
      ULTIMO.resultado = hechos;
      pintarResultado(z, hechos);
    }, function (e) {
      K.ocupado = false;
      ULTIMO.resultado = hechos;
      K.aviso((e && e.message) || 'Se cortó la carga.', 'malo', 9000);
      if (hechos.length) pintarResultado(z, hechos);
    });
  }

  function pintarResultado(z, filas) {
    z.innerHTML = '';
    var ok = filas.filter(function (x) { return x.ok; }), mal = filas.filter(function (x) { return !x.ok; });
    var s = K.nodo('<section class="kit-tarjeta formulario ms-paso"><h3 class="grupo__t">Resultado</h3>' +
      '<div class="ct-cifras ms-cifras"><div class="ct-cifra ms-ok"><b>' + ok.length + '</b><span>Registrados</span></div>' +
      '<div class="ct-cifra ms-mal"><b>' + mal.length + '</b><span>Sin registrar</span></div></div></section>');
    var bx = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('descargar', 16) + ' Descargar el resultado (Excel)</button>');
    bx.addEventListener('click', function () {
      K.piezas.exportar.aExcel('Carga masiva ' + new Date().toISOString().slice(0, 10), [
        { campo: 'fila', titulo: 'Fila del Excel' }, { campo: 'estado', titulo: 'Resultado' }, { campo: 'documento', titulo: 'Documento' },
        { campo: 'nombre', titulo: 'Nombre' }, { campo: 'contrato', titulo: 'Contrato' }, { campo: 'idContrato', titulo: 'ID contrato' },
        { campo: 'error', titulo: 'Motivo' }
      ], filas.map(function (x) { return { fila: x.fila, estado: x.ok ? 'REGISTRADO' : 'SIN REGISTRAR', documento: x.documento, nombre: x.nombre, contrato: x.contrato, idContrato: x.idContrato || '', error: x.error || '' }; }));
    });
    s.appendChild(bx);
    z.appendChild(s);
    var l = K.nodo('<div class="ms-lista"></div>');
    mal.concat(ok).forEach(function (x) { l.appendChild(tarjetaFila(x, true)); });
    z.appendChild(l);
  }

  window.MASIVA = {
    configurar: configurar, vista: vista,
    _leer: leerLibro, _ultimo: function () { return ULTIMO; }, _partir: partir
  };
}());
