/* ============================================================
   CONTRATACION-FLANDES · REPORTE DE CONTRATACIÓN (entrega 5.4)

   Las cuentas que Contratación APROBÓ o DEVOLVIÓ en un rango de fechas,
   con QUIÉN LAS REVISÓ DE VERDAD. Nunca el nombre del supervisor: desde
   la 5.3 los mensajes y la columna RESPONSABLE salen a nombre del
   supervisor, así que el reporte no puede salir de ahí.

   De dónde sale el revisor (lo decide el CORE, en este orden)
     R  columna REVISOR de APROBADAS (la escribe la 5.3 al decidir)
     T  la traza de estados de la cuenta
     B  la bitácora de revisión
     H  registro histórico: lo que escribía la app anterior, SOLO si ese
        nombre es un usuario de Contratación y no un supervisor
     —  sin registro (no se inventa)

   Qué cambia frente a la app vieja
     · Antes: dos listas de fechas, GENERAR, y un PDF armado en el
       servidor con lo que dijera RESPONSABLE; solo tus propias cuentas.
     · Ahora: todo llega en UNA llamada y se filtra en el teléfono
       (rango, estado, revisor, secretaría, búsqueda), con resumen y
       gráfica por revisor, y se descarga en PDF membretado o en Excel
       con el exportador del kit.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var FILTRO_K = 'reporte.filtro.v1';

  var DATA = null;     /* {filas:[obj], origenes, sinFecha} */
  var HORA = null;
  var CARGANDO = null;
  var F = leerFiltro();

  var ORIGEN = { R: 'registrado al decidir', T: 'traza de la cuenta', B: 'bitácora de revisión', H: 'registro histórico', '': 'sin registro' };

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    var r = rango(g.atajo || 'mes');
    return { atajo: g.atajo || 'mes', desde: g.atajo === 'otro' ? g.desde : r.desde, hasta: g.atajo === 'otro' ? g.hasta : r.hasta,
             estado: g.estado || '', rev: g.rev || '', sec: g.sec || '', busca: '' };
  }
  function guardarFiltro() {
    K.guardar.escribir(FILTRO_K, { atajo: F.atajo, desde: F.desde, hasta: F.hasta, estado: F.estado, rev: F.rev, sec: F.sec });
  }

  /** Los atajos de rango, siempre sobre la fecha de HOY del teléfono. */
  function rango(atajo) {
    var hoy = new Date(); hoy.setHours(12, 0, 0, 0);
    var d = new Date(hoy), h = new Date(hoy);
    if (atajo === 'semana') { var dia = (hoy.getDay() + 6) % 7; d.setDate(hoy.getDate() - dia); }
    else if (atajo === 'mes') { d.setDate(1); }
    else if (atajo === 'mesPasado') { d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1, 12); h = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 12); }
    else if (atajo === 'anio') { d = new Date(hoy.getFullYear(), 0, 1, 12); }
    else if (atajo === 'todo') { return { desde: '', hasta: '' }; }
    return { desde: O.isoDe(d), hasta: O.isoDe(h) };
  }

  function recibir(d) {
    var campos = d.campos || [];
    DATA = {
      origenes: d.origenes || {}, sinFecha: d.sinFecha || 0,
      filas: (d.filas || []).map(function (a) {
        var o = {};
        campos.forEach(function (c, i) { o[c] = a[i]; });
        o.hora = o.hora === '00:00' ? '' : (o.hora || '');
        o.revisor = o.revisor || '';
        o._t = K.norm([o.nombre, o.contrato, o.revisor, o.sup, o.sec, o.motivo, o.id].join(' '));
        return o;
      })
    };
    HORA = new Date();
  }

  function cargar(fresco) {
    if (DATA && !fresco) return Promise.resolve(DATA);
    if (CARGANDO && !fresco) return CARGANDO;
    CARGANDO = O.leer('reporte').then(function (d) { CARGANDO = null; recibir(d); return DATA; },
      function (e) { CARGANDO = null; throw e; });
    return CARGANDO;
  }

  function coincide(t, q) {
    q = K.norm(q || '');
    if (!q) return true;
    var p = q.split(' ').filter(Boolean);
    for (var i = 0; i < p.length; i++) if (t.indexOf(p[i]) < 0) return false;
    return true;
  }

  function pasa(f, sin) {
    sin = sin || {};
    if (F.desde && f.fecha < F.desde) return false;
    if (F.hasta && f.fecha > F.hasta) return false;
    if (!sin.estado && F.estado && f.estado !== F.estado) return false;
    if (!sin.rev && F.rev && (F.rev === '—' ? f.revisor : f.revisor !== F.rev)) return false;
    if (!sin.sec && F.sec && f.sec !== F.sec) return false;
    return coincide(f._t, F.busca);
  }

  function filtradas() { return DATA ? DATA.filas.filter(function (f) { return pasa(f); }) : []; }

  function textoRango() {
    if (!F.desde && !F.hasta) return 'Todo el historial';
    if (F.desde === F.hasta) return 'El ' + O.fecha(F.desde);
    return 'Del ' + (F.desde ? O.fecha(F.desde) : 'inicio') + ' al ' + (F.hasta ? O.fecha(F.hasta) : 'hoy');
  }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct of rp"></div>');
    C.app.appendChild(caja);
    O.cabecera(caja, 'hoja', 'REPORTE DE CONTRATACIÓN',
      'Las cuentas que Contratación aprobó o devolvió, con quién las revisó de verdad. Elige el rango, filtra y descárgalo en PDF o Excel.');

    /* rango */
    var zR = K.nodo('<section class="kit-tarjeta rp-rango"></section>');
    var zAt = K.nodo('<div></div>');
    zR.appendChild(zAt);
    var fechas = K.nodo('<div class="rp-fechas">' +
      '<label><span>Desde</span><input type="date" data-kit-fecha data-desde="2025" data-titulo="Desde"></label>' +
      '<label><span>Hasta</span><input type="date" data-kit-fecha data-desde="2025" data-titulo="Hasta"></label></div>');
    zR.appendChild(fechas);
    caja.appendChild(zR);
    var iD = fechas.querySelectorAll('input')[0], iH = fechas.querySelectorAll('input')[1];

    var b = O.barra({
      placeholder: 'Contratista, contrato, revisor, secretaría o motivo', valor: F.busca,
      alBuscar: function (q) { F.busca = q; pintar(); },
      alRefrescar: function () { return cargar(true).then(pintar); }
    });
    caja.appendChild(b.caja);
    var zE = K.nodo('<div></div>'), zV = K.nodo('<div></div>'), zS = K.nodo('<div></div>');
    caja.appendChild(zE); caja.appendChild(zV); caja.appendChild(zS);

    var resumen = K.nodo('<section class="kit-tarjeta rp-resumen"></section>');
    caja.appendChild(resumen);
    var descargas = K.nodo('<div class="rp-bajar">' +
      '<button type="button" class="kit-btn kit-btn--marca" data-f="pdf">' + K.icono('pdf', 16) + ' Descargar PDF</button>' +
      '<button type="button" class="kit-btn kit-btn--plano" data-f="xlsx">' + K.icono('hoja', 16) + ' Descargar Excel</button></div>');
    caja.appendChild(descargas);
    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var lista = K.nodo('<div class="rp-lista"></div>');
    caja.appendChild(lista);
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-mas" hidden>Ver más</button>');
    caja.appendChild(mas);
    var VER = 50;
    mas.addEventListener('click', function () { VER += 100; pintarLista(); });

    var pAt = K.piezas.pastillas.montar(zAt, {
      etiqueta: 'Rango', valor: F.atajo,
      opciones: [
        { valor: 'semana', texto: 'Esta semana' }, { valor: 'mes', texto: 'Este mes' }, { valor: 'mesPasado', texto: 'Mes pasado' },
        { valor: 'anio', texto: 'Este año' }, { valor: 'todo', texto: 'Todo' }, { valor: 'otro', texto: 'Otro rango' }
      ],
      alCambiar: function (v) {
        F.atajo = v;
        if (v !== 'otro') { var r = rango(v); F.desde = r.desde; F.hasta = r.hasta; ponerFechas(); }
        guardarFiltro(); VER = 50; pintar();
      }
    });
    function ponerFechas() { iD.value = F.desde || ''; iH.value = F.hasta || ''; }
    if (K.piezas.fechas) K.piezas.fechas.montar(fechas);
    ponerFechas();
    [iD, iH].forEach(function (inp) {
      inp.addEventListener('change', function () {
        F.desde = iD.value || ''; F.hasta = iH.value || '';
        if (F.desde && F.hasta && F.desde > F.hasta) { var x = F.desde; F.desde = F.hasta; F.hasta = x; ponerFechas(); }
        F.atajo = 'otro'; pAt.poner('otro'); guardarFiltro(); VER = 50; pintar();
      });
    });

    var pE = K.piezas.pastillas.montar(zE, {
      etiqueta: 'Estado', valor: F.estado,
      opciones: [{ valor: '', texto: 'Aprobadas y devueltas' }, { valor: 'A', texto: 'Aprobadas', tono: 'ok' }, { valor: 'D', texto: 'Devueltas', tono: 'malo' }],
      alCambiar: function (v) { F.estado = v; guardarFiltro(); VER = 50; pintar(); }
    });
    var pV = K.piezas.pastillas.montar(zV, { etiqueta: 'Revisó', valor: F.rev, opciones: [{ valor: '', texto: 'Todos los revisores' }],
      alCambiar: function (v) { F.rev = v; guardarFiltro(); VER = 50; pintar(); } });
    var pS = K.piezas.pastillas.montar(zS, { etiqueta: 'Secretaría', valor: F.sec, opciones: [{ valor: '', texto: 'Todas las secretarías' }],
      alCambiar: function (v) { F.sec = v; guardarFiltro(); VER = 50; pintar(); } });

    function repintarPastillas() {
      var L = DATA.filas;
      var bE = L.filter(function (f) { return pasa(f, { estado: true }); });
      pE.conteos({ '': bE.length, A: bE.filter(function (f) { return f.estado === 'A'; }).length, D: bE.filter(function (f) { return f.estado === 'D'; }).length });
      O.marcar(zE, F.estado);
      var bV = L.filter(function (f) { return pasa(f, { rev: true }); });
      var mv = {}, sin = 0;
      bV.forEach(function (f) { if (f.revisor) mv[f.revisor] = (mv[f.revisor] || 0) + 1; else sin++; });
      var rs = Object.keys(mv).sort(function (a, b2) { return mv[b2] - mv[a]; });
      var cV = { '': bV.length };
      rs.forEach(function (r) { cV[r] = mv[r]; });
      var opV = [{ valor: '', texto: 'Todos los revisores' }].concat(rs.map(function (r) { return { valor: r, texto: O.nombre(r) }; }));
      if (sin) { opV.push({ valor: '—', texto: 'Sin registro', tono: 'aviso' }); cV['—'] = sin; }
      if (F.rev && cV[F.rev] === undefined) { opV.push({ valor: F.rev, texto: F.rev === '—' ? 'Sin registro' : O.nombre(F.rev) }); cV[F.rev] = 0; }
      pV.opciones(opV); pV.conteos(cV); O.marcar(zV, F.rev);
      var bS = L.filter(function (f) { return pasa(f, { sec: true }); });
      var ms = {};
      bS.forEach(function (f) { if (f.sec) ms[f.sec] = (ms[f.sec] || 0) + 1; });
      var ss = Object.keys(ms).sort(function (a, b2) { return a.localeCompare(b2, 'es'); });
      var cS = { '': bS.length };
      ss.forEach(function (s) { cS[s] = ms[s]; });
      var opS = [{ valor: '', texto: 'Todas las secretarías' }].concat(ss.map(function (s) { return { valor: s, texto: O.titulo(s) }; }));
      if (F.sec && cS[F.sec] === undefined) { opS.push({ valor: F.sec, texto: O.titulo(F.sec) }); cS[F.sec] = 0; }
      pS.opciones(opS); pS.conteos(cS); O.marcar(zS, F.sec);
    }

    function pintarResumen(filas) {
      var a = filas.filter(function (f) { return f.estado === 'A'; }).length, d = filas.length - a;
      var pct = filas.length ? Math.round(d * 100 / filas.length) : 0;
      resumen.innerHTML = '';
      resumen.appendChild(K.nodo('<p class="rp-resumen__rango">' + K.icono('reloj', 14) + ' ' + K.esc(textoRango()) + '</p>'));
      resumen.appendChild(K.nodo('<div class="ct-cifras">' +
        '<div class="ct-cifra"><b>' + K.numero(filas.length) + '</b><span>Decididas</span></div>' +
        '<div class="ct-cifra rp-cifra--ok"><b>' + K.numero(a) + '</b><span>Aprobadas</span></div>' +
        '<div class="ct-cifra rp-cifra--malo"><b>' + K.numero(d) + '</b><span>Devueltas</span></div>' +
        '<div class="ct-cifra"><b>' + pct + '%</b><span>Se devuelven</span></div></div>'));
      /* por revisor: barra partida aprobadas / devueltas */
      var m = {};
      filas.forEach(function (f) { var k = f.revisor || '—'; var x = m[k] || (m[k] = { a: 0, d: 0 }); if (f.estado === 'A') x.a++; else x.d++; });
      var ks = Object.keys(m).sort(function (x, y) { return (m[y].a + m[y].d) - (m[x].a + m[x].d); });
      if (ks.length) {
        resumen.appendChild(K.nodo('<p class="ct-resumen__t">Por quién revisó</p>'));
        var max = m[ks[0]].a + m[ks[0]].d || 1;
        var z = K.nodo('<div class="ct-barras"></div>');
        ks.forEach(function (k) {
          var x = m[k], tot = x.a + x.d;
          var fila = K.nodo('<button type="button" class="ct-barra rp-barra">' +
            '<span class="ct-barra__n">' + K.esc(k === '—' ? 'Sin registro' : O.nombre(k)) + '</span>' +
            '<span class="ct-barra__v rp-barra__v" style="--rp-w:' + Math.max(4, Math.round(tot * 100 / max)) + '%">' +
            '<i class="rp-a" style="width:' + (tot ? x.a * 100 / tot : 0) + '%"></i><i class="rp-d" style="width:' + (tot ? x.d * 100 / tot : 0) + '%"></i></span>' +
            '<b>' + tot + '</b></button>');
          fila.title = x.a + ' aprobadas · ' + x.d + ' devueltas';
          fila.addEventListener('click', function () { F.rev = k; guardarFiltro(); VER = 50; pintar(); });
          z.appendChild(fila);
        });
        resumen.appendChild(z);
        resumen.appendChild(K.nodo('<p class="rp-leyenda"><i class="rp-a"></i> aprobadas <i class="rp-d"></i> devueltas</p>'));
      }
      /* de dónde salió el revisor */
      var o = {};
      filas.forEach(function (f) { o[f.origen || ''] = (o[f.origen || ''] || 0) + 1; });
      var partes = Object.keys(o).map(function (k) { return K.numero(o[k]) + ' ' + ORIGEN[k]; });
      if (partes.length) {
        resumen.appendChild(K.nodo('<p class="formulario__nota rp-origen">' + K.icono('info', 13) + ' Quién revisó sale de: ' + K.esc(partes.join(' · ')) +
          (o.H ? '. El registro histórico es lo que anotaba la app anterior: solo se usa si ese nombre es de Contratación, nunca el del supervisor.' : '.') + '</p>'));
      }
    }

    function pintarLista() {
      var filas = filtradas();
      lista.innerHTML = '';
      mas.hidden = true;
      if (!DATA.filas.length) { lista.appendChild(O.vacio('No hay cuentas decididas todavía.')); return; }
      if (!filas.length) {
        lista.appendChild(O.vacio('No hay cuentas con estos filtros en ' + textoRango().toLowerCase() + '.', function () {
          F.estado = ''; F.rev = ''; F.sec = ''; F.busca = ''; b.inp.value = ''; guardarFiltro(); pintar();
        }));
        return;
      }
      filas.slice(0, VER).forEach(function (f) { lista.appendChild(fila(f)); });
      if (filas.length > VER) { mas.hidden = false; mas.textContent = 'Ver ' + Math.min(100, filas.length - VER) + ' más de ' + K.numero(filas.length - VER); }
    }

    function fila(f) {
      var dev = f.estado === 'D';
      var x = K.nodo('<article class="rp-fila' + (dev ? ' rp-fila--dev' : '') + '"></article>');
      x.appendChild(K.nodo('<div class="rp-fila__f"><b>' + K.esc(O.fecha(f.fecha).slice(0, 5)) + '</b><small>' + K.esc(f.fecha.slice(0, 4)) + '</small></div>'));
      var c = K.nodo('<div class="rp-fila__c"></div>');
      c.appendChild(K.nodo('<p class="rp-fila__n">' + K.esc(O.nombre(f.nombre)) + '</p>'));
      c.appendChild(K.nodo('<p class="rp-fila__d">Contrato ' + K.esc(f.contrato || '—') + ' · cuenta ' + K.esc(f.informe || '?') + ' de ' + K.esc(f.total || '?') +
        (f.sec ? ' · ' + K.esc(O.titulo(f.sec)) : '') + '</p>'));
      c.appendChild(K.nodo('<p class="rp-fila__r">' + K.icono('persona', 12) + ' ' + (f.revisor ? K.esc(O.nombre(f.revisor)) : '<i>Sin registro</i>') +
        (f.sup ? ' · <span>supervisor ' + K.esc(O.nombre(f.sup)) + '</span>' : '') + '</p>'));
      if (dev && f.motivo) {
        var mo = K.nodo('<p class="rp-fila__m"></p>');
        mo.textContent = f.motivo;
        c.appendChild(mo);
      }
      x.appendChild(c);
      x.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado ' + (dev ? 'of-estado--malo' : 'of-estado--ok') + '">' + (dev ? 'DEVUELTA' : 'APROBADA') + '</span>'));
      return x;
    }

    function pintar() {
      if (!DATA) return;
      repintarPastillas();
      var filas = filtradas();
      pintarResumen(filas);
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'cuenta' : 'cuentas') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(O.horaCorta(HORA)) + '</span>' : '');
      descargas.querySelectorAll('button').forEach(function (x) { x.disabled = !filas.length; });
      pintarLista();
    }

    descargas.querySelectorAll('button').forEach(function (x) {
      x.addEventListener('click', function () { bajar(x.getAttribute('data-f'), x); });
    });

    K.piezas.esqueletos.mientras(lista, cargar(false), { forma: 'tarjetas', cuantos: 4 })
      .then(pintar)['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(caja);
  }

  /* ══════════════ descargar ══════════════ */

  var COLS = [
    { campo: function (f) { return O.fecha(f.fecha) + (f.hora ? ' ' + f.hora : ''); }, titulo: 'Fecha' },
    { campo: function (f) { return f.estado === 'D' ? 'DEVUELTA' : 'APROBADA'; }, titulo: 'Estado' },
    { campo: 'nombre', titulo: 'Contratista' },
    { campo: 'contrato', titulo: 'Contrato' },
    { campo: function (f) { return (f.informe || '?') + ' de ' + (f.total || '?'); }, titulo: 'Cuenta' },
    { campo: function (f) { return f.revisor || 'Sin registro'; }, titulo: 'Revisó' },
    { campo: 'sup', titulo: 'Supervisor' },
    { campo: 'sec', titulo: 'Secretaría' },
    { campo: 'motivo', titulo: 'Motivo de la devolución' }
  ];
  var COLS_XLS = COLS.concat([
    { campo: function (f) { return ORIGEN[f.origen || '']; }, titulo: 'De dónde sale quién revisó' },
    { campo: 'id', titulo: 'ID contrato' },
    { campo: 'aprob', titulo: 'Registro' }
  ]);

  function subtitulo(filas) {
    var a = filas.filter(function (f) { return f.estado === 'A'; }).length;
    var t = [textoRango(), K.numero(filas.length) + ' cuentas: ' + K.numero(a) + ' aprobadas, ' + K.numero(filas.length - a) + ' devueltas'];
    if (F.rev) t.push('Revisó: ' + (F.rev === '—' ? 'sin registro' : O.nombre(F.rev)));
    if (F.sec) t.push(O.titulo(F.sec));
    if (F.estado) t.push(F.estado === 'A' ? 'Solo aprobadas' : 'Solo devueltas');
    return t.join(' · ');
  }

  function bajar(formato, boton) {
    if (!K.piezas.exportar) { K.aviso('La descarga no está disponible en esta versión.', 'aviso'); return; }
    var filas = filtradas();
    if (!filas.length) return;
    var nombre = 'Reporte de Contratación ' + (F.desde ? O.fecha(F.desde).replace(/\//g, '-') : '') + (F.hasta && F.hasta !== F.desde ? ' a ' + O.fecha(F.hasta).replace(/\//g, '-') : '');
    boton.disabled = true; boton.classList.add('kit-ocupado');
    var p = formato === 'pdf'
      ? K.piezas.exportar.aPDF(nombre.trim(), COLS, filas, { orientacion: 'landscape', subtitulo: subtitulo(filas) })
      : K.piezas.exportar.aExcel(nombre.trim(), COLS_XLS, filas);
    Promise.resolve(p).then(function (r) {
      K.aviso(r === 'csv' ? 'No cargó Excel: se descargó en CSV (Excel lo abre).' : (r === 'impresion' ? 'Guárdalo como PDF desde la ventana de impresión.' : 'Descargado.'), 'ok', 3500);
    }, function (e) { K.aviso((e && e.message) || 'No se pudo descargar.', 'malo', 6000); })
      .then(function () { boton.disabled = false; boton.classList.remove('kit-ocupado'); });
  }

  window.REPORTE = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    olvidar: function () { DATA = null; K.guardar.borrar(FILTRO_K); F = leerFiltro(); },
    _datos: function () { return DATA; },
    _filtradas: filtradas,
    _rango: textoRango
  };
}());
