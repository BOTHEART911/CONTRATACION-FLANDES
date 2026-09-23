/* ============================================================
   CONTRATACION-FLANDES · APP
   Ecosistema Flandes · Fase 5, entregas 5.1 a 5.3

   Lo que entra en esta entrega
     · La entrada con documento y contraseña (roles CREADOR y REVISOR;
       el DEV entra a todo).
     · El inicio con la misma cara de CONTRATISTA-FLANDES: franja con
       cielo, tu foto, un resumen vivo de los contratos y los accesos
       por bloques.
     · La vista CONTRATISTAS (vive en contratistas.js).
     · 5.2: agregar contratista, adición, cesión y suspensión (gestion.js),
       cada una con su ruta y su permiso (CREADOR; el REVISOR solo mira).

     · 5.3: REVISAR CUENTAS (revision.js): la lista de lo que el
       supervisor ya revisó, el detalle en pestañas con el visor y el
       carrusel del kit, la bitácora que se guarda sin decidir y la
       decisión (aprobar o devolver) a nombre del supervisor.

   Lo que NO entra todavía
     5.4 requerimientos, comunicados y reporte.
     (Soporte entró en la 5.1.1, en el menú del perfil.) Sus tarjetas no se pintan hasta que existan: una tarjeta
     que no hace nada es peor que no tenerla.

   Reglas que se respetan aquí (las mismas de Contratista)
     · Todo dato de la hoja pasa por K.esc antes de entrar al HTML.
     · La app no conoce ninguna URL: todo sale de marca.js.
     · Modo oscuro de serie (el botón vive en el banner).
     · Abrir la app es UNA llamada al CORE ('inicio').
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var M = window.MARCA || {};
  var app = K.id('app');

  var YO = null;          /* quién entró */
  var ARRANQUE = null;    /* lo que trajo 'inicio' */

  /* ══════════════ el arranque, en UNA sola llamada ══════════════ */

  function arranque() {
    var quitar = (K.piezas.esqueletos && app)
      ? K.piezas.esqueletos.poner(app, { forma: 'ficha', cuantos: 1, sitio: 'reemplaza', espera: 'Cargando los contratos' })
      : function () {};

    return K.pedir('inicio', {}).then(function (d) {
      ARRANQUE = d;
      YO = d.yo || YO;
      if (d.personas && K.piezas.personas) K.piezas.personas.cargar(d.personas);
      if (d.push && K.piezas.avisos && K.piezas.avisos.configurar) K.piezas.avisos.configurar(d.push);
      if (d.config && K.piezas.creditos && K.piezas.creditos.configurar) K.piezas.creditos.configurar(d.config);
      /* la lista entera llega aquí: la vista CONTRATISTAS abre sin esperar */
      if (d.contratistas && window.CONTRATISTAS) window.CONTRATISTAS.recibir(d.contratistas);
      quitar();
      return d;
    }, function (e) {
      quitar();
      throw e;
    });
  }

  K.listo(function () {
    registrarSW();
    if (K.piezas.instalar) K.piezas.instalar.vigilar();
    if (K.piezas.version) K.piezas.version.vigilar();

    var puerta = K.piezas.bienvenida
      ? K.piezas.bienvenida.abrir({
          titulo: 'Contratación',
          sub: M.MUNICIPIO || 'Alcaldía de Flandes',
          imagen: M.APP_ICON || 'img/icono-512.png'
        })
      : Promise.resolve('saltada');

    puerta.then(function () {
      K.piezas.sesion.entrar({
        titulo: 'CONTRATACIÓN',
        sub: 'Ingresa con tu documento y contraseña',
        imagen: M.APP_ICON || 'img/icono-512.png',
        comprobar: function () { return arranque().then(function (d) { return d.yo; }); },
        alEntrar: arrancar
      });
    });
  });

  function registrarSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js')['catch'](function () {});
  }

  function arrancar(yo) {
    YO = yo || {};
    montarBanner();

    if (K.piezas.avisos) {
      K.piezas.avisos.autoActivar();
      K.piezas.avisos.alLlegar(function (a) {
        K.aviso(a.titulo ? (a.titulo + ': ' + a.cuerpo) : a.cuerpo, 'info', 6000);
      });
    }

    if (window.AYUDA) {
      window.AYUDA.configurar(function () {
        return { yo: YO, arranque: ARRANQUE, lista: window.CONTRATISTAS ? window.CONTRATISTAS.todas() : [], revision: window.REVISION || null };
      });
    }

    if (window.GESTION) {
      window.GESTION.configurar({ app: app, puede: puede, irA: irA, errorCaja: errorCaja });
    }

    if (window.REVISION) {
      window.REVISION.configurar({
        app: app, puede: puede, irA: irA, errorCaja: errorCaja,
        /* el número del inicio sigue a la lista sin otro viaje */
        alCambiar: function (n) { if (ARRANQUE) ARRANQUE.porRevisar = n; }
      });
    }

    if (window.CONTRATISTAS) {
      window.CONTRATISTAS.configurar({
        app: app,
        puede: puede,
        irA: irA,
        errorCaja: errorCaja,
        recargarTodo: function () { return arranque(); }
      });
    }

    K.cuando('kit:foto', function (r) {
      YO.imagen = r.url || '';
      K.piezas.banner.perfil({ foto: r.foto || '' });
      var cara = document.querySelector('.saludo .kit-perfil-cara');
      if (cara && K.piezas.perfil) cara.parentNode.replaceChild(caraPerfil(), cara);
    });

    window.addEventListener('hashchange', enrutar);
    enrutar();
  }

  /* ══════════════ permisos ══════════════
   * Lo que se pinta sale de las vistas que el CORE dice que este rol puede
   * abrir (llave PERMISOS de CONFIG). El CORE vuelve a comprobarlo en cada
   * llamada: esconder un botón no es la seguridad, es la cortesía. */
  function puede(vista) {
    var r = K.norm((YO && YO.rol) || '');
    if (r === 'DEV') return true;
    var v = (YO && YO.vistas) || [];
    for (var i = 0; i < v.length; i++) if (K.norm(v[i]) === K.norm(vista)) return true;
    return false;
  }

  function miFoto(ancho) {
    return K.miniDrive ? K.miniDrive(YO.imagen || '', ancho || 200) : (YO.imagen || '');
  }

  function abrirFoto() {
    if (!K.piezas.perfil) return;
    K.piezas.perfil.abrir({ nombre: YO.nombre || '', foto: miFoto(512) });
  }

  function caraPerfil() {
    return K.piezas.perfil.cara(YO.nombre || '', miFoto(200), {
      tam: 66, fotoActual: function () { return miFoto(512); }
    });
  }

  function montarBanner() {
    K.piezas.banner.montar({
      titulo: 'Contratación',
      nombre: YO.nombre || '',
      rol: rolLegible(YO.rol),
      foto: miFoto(200),
      menu: [
        { texto: 'Foto de perfil', al: abrirFoto },
        { texto: 'Actualizar contraseña', al: function () { K.piezas.sesion.cambiarClave(); } },
        { texto: 'Instalar la app', al: function () { K.piezas.instalar.abrir(); } },
        /* 5.1.1 · soporte en TODAS las apps: se guarda en la hoja SOPORTE
           (la responde ADMIN) y avisa al grupo de desarrollo por WhatsApp */
        { texto: 'Soporte', al: function () { if (K.piezas.soporte) K.piezas.soporte.abrir({ vista: vistaActual() }); } },
        { texto: 'Cerrar sesión', al: salir, peligro: true }
      ]
    });
    if (K.piezas.cielo) K.piezas.cielo.soloFondo(document.querySelector('.kit-banner'));
  }

  function rolLegible(r) {
    var n = K.norm(r || '');
    if (n === 'CREADOR') return 'CREADOR · Contratación';
    if (n === 'REVISOR') return 'REVISOR · Contratación';
    if (n === 'DEV') return 'DEV · Desarrollo';
    return r || 'Contratación';
  }

  function salir() {
    if (K.piezas.avisos) K.piezas.avisos.olvidar();
    if (K.piezas.insights) K.piezas.insights.quitar();
    if (window.CONTRATISTAS) window.CONTRATISTAS.olvidar();
    if (window.REVISION) window.REVISION.olvidar();
    K.piezas.sesion.salir();
    location.hash = '';
  }

  /* ══════════════ vistas ══════════════ */

  var VISTAS = {
    inicio: vistaInicio,
    contratistas: function (sub) { window.CONTRATISTAS.lista(sub); },
    contratista: function (sub) { window.CONTRATISTAS.detalle(sub); },
    /* 5.2 */
    agregar: function () { window.GESTION.agregar(); },
    adicion: function (sub) { window.GESTION.adicion(sub); },
    cesion: function (sub) { window.GESTION.cesion(sub); },
    suspension: function (sub) { window.GESTION.suspension(sub); },
    /* 5.3 */
    revisar: function () { window.REVISION.lista(); },
    cuenta: function (sub) { window.REVISION.detalle(sub); }
  };

  var titulos = {
    inicio: 'Contratación',
    contratistas: 'CONTRATISTAS',
    contratista: 'DETALLES DEL CONTRATISTA',
    agregar: 'AGREGAR CONTRATISTA',
    adicion: 'ADICIÓN',
    cesion: 'CESIÓN',
    suspension: 'SUSPENSIÓN',
    revisar: 'REVISAR CUENTAS',
    cuenta: 'REVISIÓN DE CUENTA'
  };

  /* El permiso de cada vista (llave PERMISOS de CONFIG). El CORE lo vuelve
     a exigir en cada llamada: esto solo evita pintar lo que no se puede. */
  var PERMISO = {
    contratistas: 'contratistas', contratista: 'contratistas',
    agregar: 'agregarContratista', adicion: 'adicion', cesion: 'cesion', suspension: 'suspension',
    revisar: 'revisarCuentas', cuenta: 'revisarCuentas'
  };

  function irA(v) { location.hash = '#/' + v; }

  /** El nombre de la vista donde está la persona: va en la solicitud de soporte. */
  function vistaActual() {
    var v = String(location.hash || '').replace(/^#\/?/, '').split('/')[0] || 'inicio';
    return titulos[v] || v;
  }

  function enrutar() {
    var partes = String(location.hash || '').replace(/^#\/?/, '').split('/');
    var v = partes[0] || 'inicio';
    if (!VISTAS[v]) v = 'inicio';
    if (v !== 'inicio' && !puede(PERMISO[v] || v)) v = 'inicio';

    K.piezas.banner.vista(titulos[v]);
    /* la ficha vuelve a la lista (con sus filtros), la lista al inicio y
       adición/cesión/suspensión a la ficha de la que salieron */
    var resto = partes.slice(1).join('/');
    K.piezas.banner.atras(v === 'inicio' ? null : function () {
      if (v === 'adicion' || v === 'cesion' || v === 'suspension') irA('contratista/' + resto);
      else if (v === 'contratista' || v === 'agregar') irA('contratistas');
      else if (v === 'cuenta') irA('revisar');
      else irA('inicio');
    });

    app.innerHTML = '';
    if (window.AYUDA) window.AYUDA.montar(v);
    window.scrollTo(0, 0);
    VISTAS[v](resto);
  }

  /* ---------- inicio ---------- */

  function vistaInicio() {
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    var saludo = K.nodo(
      '<section class="saludo">' +
      '  <div class="saludo__txt">' +
      '    <p class="saludo__hola">' + K.esc(saludoDelDia()) + ',</p>' +
      '    <h2 class="saludo__nombre">' + K.esc(nombreCorto(YO.nombre)) + '</h2>' +
      '    <p class="saludo__doc">' + K.esc(rolLegible(YO.rol)) + ' · ' + K.esc(fechaHumana(new Date())) + '</p>' +
      '  </div>' +
      '</section>'
    );
    if (K.piezas.perfil && K.piezas.personas) saludo.appendChild(caraPerfil());
    if (K.piezas.cielo) K.piezas.cielo.poner(saludo, { burbujas: 3 });
    caja.appendChild(saludo);

    var destino = K.nodo('<section class="resumen"></section>');
    caja.appendChild(destino);

    var primero = null;
    function bloque(titulo, tarjetas) {
      var s = K.nodo('<section class="bloque" aria-label="' + K.esc(titulo) + '">' +
        '<h3 class="bloque__t">' + K.esc(titulo) + '</h3></section>');
      var r = K.nodo('<div class="kit-rejilla kit-rejilla--auto accesos"></div>');
      tarjetas.forEach(function (t) { r.appendChild(t); });
      s.appendChild(r);
      caja.appendChild(s);
      if (!primero) primero = s;
      return s;
    }

    if (puede('contratistas')) {
      bloque('CONTRATOS', [
        acceso('CONTRATISTAS', 'Todos los contratos: busca, filtra por secretaría o supervisor y abre la ficha',
          'img/contratista.webp', function () { irA('contratistas'); })
      ].concat(puede('agregarContratista') ? [
        /* 5.3: la imagen era un código QR (contratista_2.webp); esta es una
           ficha de persona con lápiz y visto bueno: registrar a alguien */
        acceso('AGREGAR CONTRATISTA', 'Registra un contrato: primero se valida el documento, después lo demás',
          'img/datos_de_procesos.webp', function () { irA('agregar'); })
      ] : []));
    }

    if (puede('revisarCuentas')) {
      var n = ARRANQUE && typeof ARRANQUE.porRevisar === 'number' ? ARRANQUE.porRevisar : null;
      bloque('CUENTAS', [
        acceso('REVISAR CUENTAS', n === 0 ? 'Estás al día: no hay cuentas esperando revisión'
          : 'Las cuentas que el supervisor ya revisó: documentos, evidencias, notas y decisión',
          'img/procesos_de_cuenta.webp', function () { irA('revisar'); }, n)
      ]);
    }

    app.appendChild(caja);
    K.piezas.creditos.montar(caja);

    var espera = (window.CONTRATISTAS && window.CONTRATISTAS.cargar)
      ? window.CONTRATISTAS.cargar() : Promise.resolve([]);
    K.piezas.esqueletos.mientras(destino, espera, { forma: 'ficha', cuantos: 1 })
      .then(function () { pintarResumen(destino); })
      ['catch'](function (e) { destino.appendChild(errorCaja(e)); });
  }

  /* El resumen del inicio: cuatro cifras que se tocan y llevan a la lista
     ya filtrada. Se cuentan en el teléfono sobre la lista que trajo el
     arranque; no cuestan un viaje. */
  function pintarResumen(destino) {
    var L = window.CONTRATISTAS ? window.CONTRATISTAS.todas() : [];
    var act = L.filter(function (f) { return f.estado === 'ACTIVO'; });
    var adic = act.filter(function (f) { return f.adic; }).length;
    var ced = act.filter(function (f) { return f.cedido; }).length;
    var porSec = {};
    act.forEach(function (f) { var s = f.sec || 'SIN SECRETARÍA'; porSec[s] = (porSec[s] || 0) + 1; });
    var secs = Object.keys(porSec).sort(function (a, b) { return porSec[b] - porSec[a]; });

    destino.innerHTML = '';
    var caja = K.nodo('<div class="kit-tarjeta resumen__caja ct-resumen"></div>');
    /* 5.2 · Refrescar también aquí: las cifras salen de la misma lista */
    var ref = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-recargar ct-recargar--mini" aria-label="Refrescar las cifras">' +
      K.icono('recargar', 16) + '<span>Refrescar</span></button>');
    ref.addEventListener('click', function () {
      ref.disabled = true; ref.classList.add('kit-ocupado');
      window.CONTRATISTAS.cargar(true).then(function () { pintarResumen(destino); K.aviso('Cifras al día.', 'ok', 2000); },
        function (e) { K.aviso((e && e.message) || 'No se pudo refrescar.', 'malo', 5000); ref.disabled = false; ref.classList.remove('kit-ocupado'); });
    });
    caja.appendChild(ref);
    var cifras = K.nodo('<div class="ct-cifras"></div>');
    [
      [act.length, 'Activos', 'activos'],
      [adic, 'Adicionados', 'adicionados'],
      [ced, 'Cedidos', 'cedidos'],
      [L.length, 'En total', 'todos']
    ].forEach(function (c) {
      var b = K.nodo('<button type="button" class="ct-cifra"><b>' + K.numero(c[0]) + '</b><span>' + K.esc(c[1]) + '</span></button>');
      b.addEventListener('click', function () { K.vibrar(6); irA('contratistas/' + c[2]); });
      cifras.appendChild(b);
    });
    caja.appendChild(cifras);

    if (secs.length) {
      caja.appendChild(K.nodo('<p class="ct-resumen__t">Activos por secretaría</p>'));
      var barras = K.nodo('<div class="ct-barras"></div>');
      var max = porSec[secs[0]] || 1;
      secs.forEach(function (s) {
        var b = K.nodo(
          '<button type="button" class="ct-barra">' +
          '  <span class="ct-barra__n">' + K.esc(nombrePropio(s)) + '</span>' +
          '  <span class="ct-barra__v"><i style="width:' + Math.max(4, Math.round(porSec[s] * 100 / max)) + '%"></i></span>' +
          '  <b>' + porSec[s] + '</b>' +
          '</button>'
        );
        b.addEventListener('click', function () { K.vibrar(6); irA('contratistas/sec/' + encodeURIComponent(s)); });
        barras.appendChild(b);
      });
      caja.appendChild(barras);
    }
    destino.appendChild(caja);
  }

  function acceso(titulo, texto, medio, al, cuenta) {
    var b = K.nodo(
      '<button type="button" class="kit-tarjeta acceso">' +
      '  <img class="acceso__img" src="' + K.esc(K.medio(medio)) + '" alt="" loading="lazy">' +
      (cuenta ? '  <b class="acceso__burbuja rv-burbuja" aria-label="' + cuenta + ' por revisar">' + (cuenta > 99 ? '99+' : cuenta) + '</b>' : '') +
      '  <span class="acceso__txt">' +
      '    <span class="acceso__t">' + K.esc(titulo) + '</span>' +
      '    <span class="acceso__p">' + K.esc(texto) + '</span>' +
      '  </span>' +
      '</button>'
    );
    b.addEventListener('click', function () { K.vibrar(8); al(); });
    return b;
  }

  /* ══════════════ auxiliares ══════════════ */

  function saludoDelDia() {
    var h = new Date().getHours();
    return h < 12 ? 'Buenos días' : (h < 19 ? 'Buenas tardes' : 'Buenas noches');
  }

  function fechaHumana(d) {
    var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()];
  }

  function nombreCorto(n) {
    var p = String(n || '').trim().split(/\s+/);
    if (!p[0]) return '';
    return p.length > 1 ? (p[0] + ' ' + p[1]) : p[0];
  }

  function nombrePropio(s) {
    var t = K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || '');
    /* SECRETARÍA DE HACIENDA → Secretaría de Hacienda */
    return t.replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
            .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }

  function errorCaja(e, alReintentar) {
    var msg = (e && e.message) ? e.message : 'No se pudo cargar.';
    var c = K.nodo(
      '<section class="kit-tarjeta error">' +
      '  <p class="error__t">' + K.esc(msg) + '</p>' +
      '  <button type="button" class="kit-btn kit-btn--plano">Reintentar</button>' +
      '</section>'
    );
    c.querySelector('button').addEventListener('click', function () {
      if (alReintentar) alReintentar(); else enrutar();
    });
    return c;
  }
}());
