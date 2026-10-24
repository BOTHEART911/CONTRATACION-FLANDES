/* ============================================================
   CONTRATACION-FLANDES · ADAPTADOR DEL ASISTENTE DE AYUDA
   24/10/2026 · entrega 4 (la pieza es la misma de CONTRATISTA y SUPERVISIÓN)

   La pieza kit/asistente.js no sabe nada de esta app. Aquí se le dice:
     · a dónde puede llevar (destino), con qué rótulo y con qué filtro
       de la lista ya puesto (sin abrir, vuelven corregidas, accesos…),
     · qué está cerrado y por qué (puerta): el permiso de la vista
       (llave PERMISOS de CONFIG, igual que el menú y el enrutador),
     · lo más urgente al abrir (urgente): cuentas por aprobar, solicitudes
       de los contratistas (acceso, adición, cesión…) por responder,
     · los datos reales de las respuestas ({{clave}}).

   TODO sale de lo que la app ya trajo: el arranque (con el número de
   solicitudes), la lista de cuentas por revisar que el inicio pide para su
   burbuja, la lista de contratistas que llega de fondo y, si la persona ya
   abrió SOLICITUDES, su bandeja. Ningún dato viaja al servidor para responder.

   La base embebida (js/asistente-base.js) es el respaldo para la primera
   apertura y la pantalla de entrada; la del CORE la reemplaza en cuanto
   llega con el arranque (solo cuando cambia su sello).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  if (!K || !K.piezas.asistente) return;

  function APP() { return window.CONTRATACION_APP || {}; }
  function ar() { try { return (APP().arranque && APP().arranque()) || {}; } catch (e) { return {}; } }
  function yo() { try { return (APP().yo && APP().yo()) || {}; } catch (e) { return {}; } }
  function RV() { return window.REVISION || null; }
  function SB() { return window.SOLICITUDES || null; }
  function CT() { return window.CONTRATISTAS || null; }
  function listaLista() { var r = RV(); return !!(r && r.pendientes && r.pendientes() !== null); }
  function cuentas() { var r = RV(); try { return r && r._cuentas ? r._cuentas() : []; } catch (e) { return []; } }
  function contratos() { var c = CT(); try { return c && c.todas ? c.todas() : []; } catch (e) { return []; } }
  function activos() { return contratos().filter(function (f) { return f.estado === 'ACTIVO'; }); }
  function solDatos() { var s = SB(); try { return s && s._datos ? s._datos() : null; } catch (e) { return null; } }
  function rol() { return K.norm(yo().rol || ''); }

  function nombre(s) {
    var t = K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || '');
    return t.replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
            .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }
  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function fecha(f) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(f || ''));
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }
  function hoy() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function diasDe(f) { var d = fecha(f); return d ? Math.round((hoy() - d) / 864e5) : null; }
  function lista(filas, fmt, max) {
    max = max || 5;
    var t = filas.slice(0, max).map(fmt).join('\n');
    if (filas.length > max) t += '\n… y ' + (filas.length - max) + ' más.';
    return t;
  }
  var CARGANDO = 'Las cuentas todavía están llegando: pregúntame de nuevo en un momento.';
  var CARGANDO_CT = 'La lista de contratos todavía está llegando: pregúntame de nuevo en un momento.';

  /* ---------- permisos ---------- */

  function puede(perm) { try { return APP().puede ? APP().puede(perm) : true; } catch (e) { return true; } }

  /* ---------- solicitudes ---------- */

  function nSolicitudes() {
    var d = solDatos();
    if (d && typeof d.pendientes === 'number') return d.pendientes;
    var n = ar().solicitudes;
    return typeof n === 'number' ? n : 0;
  }
  function solPendientes() {
    var d = solDatos(), s = SB();
    if (!d || !d.lista) return null;
    return d.lista.filter(function (r) { return s && s._grupo ? s._grupo(r) === 'PENDIENTE' : r.estado !== 'RESPONDIDA'; });
  }
  /** "1 de acceso y 2 de adición": lo que hay pendiente por tipo (solo si la bandeja ya llegó). */
  function porTipo(p) {
    var m = {};
    p.forEach(function (r) { var k = r.origen === 'LOGIN' ? 'de acceso' : 'de ' + String(r.tipoTexto || r.tipo || 'otro').toLowerCase(); m[k] = (m[k] || 0) + 1; });
    var ks = Object.keys(m);
    return ks.map(function (k, i) { return m[k] + ' ' + k; }).join(', ').replace(/, ([^,]*)$/, ' y $1');
  }

  /* ---------- lo más urgente al abrir ---------- */

  function masAntigua() {
    var c = cuentas().slice().sort(function (a, b) { return (diasDe(b.radicada) || 0) - (diasDe(a.radicada) || 0); });
    return c[0] || null;
  }

  function urgente() {
    if (puede('revisarCuentas') && listaLista() && cuentas().length) {
      var n = cuentas().length, v = masAntigua(), d = v ? diasDe(v.radicada) : null;
      var vuelven = cuentas().filter(function (c) { return c.devoluciones; }).length;
      return { texto: 'Tienes **' + plural(n, 'cuenta por revisar', 'cuentas por revisar') + '**' +
        (vuelven ? ' (' + plural(vuelven, 'vuelve corregida', 'vuelven corregidas') + ')' : '') +
        (v && d !== null && d > 0 ? '; la de **' + nombre(v.nombre) + '** se radicó hace ' + plural(d, 'día', 'días') + '.' : '.'), accion: 'ir:revisar' };
    }
    if (puede('solicitudes') && nSolicitudes() > 0) {
      var p = solPendientes(), ns = nSolicitudes();
      return { texto: 'Hay **' + plural(ns, 'solicitud de contratista', 'solicitudes de contratistas') + '** por responder' +
        (p && p.length ? ' (' + porTipo(p) + ').' : '.'), accion: 'ir:solicitudes' };
    }
    return null;
  }

  /* ---------- a dónde puede llevar ---------- */

  /* [rótulo, ruta, filtro de REVISAR CUENTAS | ruta con atajo] */
  var DESTINOS = {
    inicio:         ['Ir al inicio', 'inicio'],
    revisar:        ['Ver las cuentas por revisar', 'revisar', { rev: '' }],
    revNuevas:      ['Ver las que nadie ha abierto', 'revisar', { rev: 'nueva' }],
    revCurso:       ['Ver las que están en revisión', 'revisar', { rev: 'curso' }],
    revVuelven:     ['Ver las que vuelven corregidas', 'revisar', { rev: 'vuelve' }],
    contratistas:   ['Ir a CONTRATISTAS', 'contratistas'],
    activos:        ['Ver los contratos activos', 'contratistas', null, 'contratistas/activos'],
    agregar:        ['Ir a AGREGAR CONTRATISTA', 'agregar'],
    masiva:         ['Ir a CARGA MASIVA', 'masiva'],
    solicitudes:    ['Ver las SOLICITUDES por responder', 'solicitudes', { estado: 'PENDIENTE', origen: '' }],
    accesos:        ['Ver quién pide acceso', 'solicitudes', { estado: 'PENDIENTE', origen: 'LOGIN' }],
    requerimientos: ['Ir a REQUERIMIENTOS', 'requerimientos'],
    comunicados:    ['Ir a COMUNICADOS', 'comunicados'],
    reporte:        ['Ir al REPORTE', 'reporte'],
    agenda:         ['Ir a la AGENDA DE REVISIÓN', 'agenda'],
    misregistros:   ['Ir a MIS REGISTROS', 'misregistros']
  };
  var NOMBRES = { revisar: 'revisar cuentas', revNuevas: 'revisar cuentas', revCurso: 'revisar cuentas', revVuelven: 'revisar cuentas',
    contratistas: 'CONTRATISTAS', activos: 'CONTRATISTAS', agregar: 'agregar contratistas', masiva: 'la carga masiva',
    solicitudes: 'SOLICITUDES', accesos: 'SOLICITUDES', requerimientos: 'REQUERIMIENTOS', comunicados: 'COMUNICADOS', reporte: 'el REPORTE' };

  function rutaActual() { return String(location.hash || '').replace(/^#\/?/, ''); }

  function destino(id) {
    var d = DESTINOS[id];
    if (!d) return null;
    return { etiqueta: d[0], ir: function () {
      if (d[2]) {
        if (d[1] === 'revisar' && RV() && RV().filtrar) RV().filtrar(d[2]);
        if (d[1] === 'solicitudes' && SB() && SB().filtrar) SB().filtrar(d[2]);
      }
      var r = d[3] || d[1];
      if (rutaActual() === r) { window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
      location.hash = '#/' + r;
    } };
  }

  /** Lo cerrado se explica con el permiso que falta y se ofrece soporte. */
  function puerta(id) {
    var d = DESTINOS[id];
    if (!d || !d[1] || d[1] === 'inicio' || d[1] === 'misregistros' || d[1] === 'agenda') return null;
    var perm = APP().permiso ? APP().permiso(d[1]) : d[1];
    if (!puede(perm)) {
      return { texto: 'Tu usuario no tiene permiso para **' + (NOMBRES[id] || id) + '**. Si lo necesitas, pídeselo al administrador.', accion: 'soporte' };
    }
    return null;
  }

  /* ---------- acciones que no son ir a una vista ---------- */

  function vistaTitulo() { try { return (APP().vistaActual && APP().vistaActual()) || ''; } catch (e) { return ''; } }

  function accion(a) {
    switch (a) {
      case 'guia': return { etiqueta: 'Descargar la guía rápida', icono: 'descargar', cierra: false, hacer: function () { if (K.piezas.guia) K.piezas.guia.descargar('CONTRATACION'); } };
      case 'soporte': return { etiqueta: 'Contarle a soporte', icono: 'salvavidas', hacer: function (p) {
        if (K.piezas.soporte) K.piezas.soporte.abrir({ vista: vistaTitulo(), texto: p ? 'Le pregunté al asistente: «' + p + '»\n' : '' });
      } };
      case 'foto': return { etiqueta: 'Cambiar mi foto', icono: 'camara', hacer: function () { if (APP().abrirFoto) APP().abrirFoto(); } };
      case 'clave': return { etiqueta: 'Actualizar contraseña', icono: 'llave', hacer: function () { K.piezas.sesion.cambiarClave(); } };
      case 'instalar': return { etiqueta: 'Instalar la app', icono: 'descargar', hacer: function () { if (K.piezas.instalar) K.piezas.instalar.abrir(); } };
      default: return null;
    }
  }

  /* ---------- los datos de las respuestas ---------- */

  function porVencer() {
    var h = hoy(), en30 = new Date(h.getTime() + 30 * 864e5);
    return activos().filter(function (f) { var d = fecha(f.fin); return d && d >= h && d <= en30; })
      .sort(function (a, b) { return fecha(a.fin) - fecha(b.fin); });
  }

  function textoPermisos() {
    var r = String(yo().rol || '').split(/[,+\/]/).map(function (x) { return K.norm(x); }).filter(Boolean);
    if (r.indexOf('DEV') >= 0) return 'Tu usuario es **DEV**: entra a todo.';
    var si = [], no = [];
    [['revisarCuentas', 'revisar cuentas'], ['tomarDecision', 'aprobar o devolver'], ['agregarContratista', 'agregar contratistas'],
     ['adicion', 'adiciones'], ['cesion', 'cesiones'], ['suspension', 'suspensiones'], ['editarContratista', 'editar contratos'],
     ['solicitudes', 'responder solicitudes'], ['requerimientos', 'requerimientos'], ['comunicados', 'comunicados'], ['reporte', 'el reporte']]
      .forEach(function (p) { (puede(p[0]) ? si : no).push(p[1]); });
    return 'Tu usuario es **' + (r.join(' y ') || 'de Contratación') + '**. Puede: ' + (si.join(', ') || 'consultar') + '.' +
      (no.length ? ' No tiene: ' + no.join(', ') + '. Los permisos los da el administrador.' : '');
  }

  function dato(k) {
    switch (k) {
      case 'queMeToca':
        var u = urgente();
        if (u) return u.texto;
        if (puede('revisarCuentas') && !listaLista()) return CARGANDO;
        return 'Por ahora **nada urgente**: no hay cuentas esperando a Contratación ni solicitudes por responder. ✓';
      case 'porRevisar':
        if (!puede('revisarCuentas')) return 'Tu usuario no revisa cuentas. Si lo necesitas, pídeselo al administrador.';
        if (!listaLista()) return CARGANDO;
        var n = cuentas().length;
        if (!n) return '**Ninguna**: estás al día, no hay cuentas esperando a Contratación. ✓';
        var cur = cuentas().filter(function (c) { return c.revision; }).length;
        return 'Tienes **' + plural(n, 'cuenta por revisar', 'cuentas por revisar') + '**' + (cur ? ', ' + plural(cur, 'ya en revisión', 'ya en revisión') : '') + '. Te llevo a la lista.';
      case 'masAntigua':
        if (!listaLista()) return CARGANDO;
        var o = cuentas().slice().sort(function (a, b) { return (diasDe(b.radicada) || 0) - (diasDe(a.radicada) || 0); });
        if (!o.length) return '¡Ninguna! No hay cuentas por revisar. ✓';
        return 'Las que más llevan esperando:\n' + lista(o, function (x) {
          var d = diasDe(x.radicada);
          return '· **' + nombre(x.nombre) + '** — cuenta ' + x.informe + ' de ' + (x.total || '?') + (d !== null && d >= 0 ? ', radicada hace ' + plural(d, 'día', 'días') : '');
        });
      case 'vuelven':
        if (!listaLista()) return CARGANDO;
        var v = cuentas().filter(function (x) { return x.devoluciones; });
        if (!v.length) return 'Ninguna: todas llegan por primera vez.';
        return lista(v, function (x) { return '· **' + nombre(x.nombre) + '** (cuenta ' + x.informe + ')' + (x.ultimaDevolucion && x.ultimaDevolucion.motivo ? ': «' + x.ultimaDevolucion.motivo + '»' : ''); });
      case 'quienRevisa':
        if (!listaLista()) return CARGANDO;
        var rv = cuentas().filter(function (x) { return x.revision; });
        if (!rv.length) return 'Nadie tiene revisiones a medias ahora mismo.';
        return lista(rv, function (x) { return '· **' + nombre(x.revision.por) + '** con ' + nombre(x.nombre) + ' (desde ' + x.revision.desde + ')'; }, 6);
      case 'cobroPorRevisar':
        if (!listaLista()) return CARGANDO;
        var s = 0;
        cuentas().forEach(function (x) { s += Number(x.cobro) || 0; });
        return cuentas().length ? 'Las ' + plural(cuentas().length, 'cuenta', 'cuentas') + ' por revisar cobran **' + pesos(s) + '** en total.' : 'No hay cuentas por revisar.';
      case 'puedoDecidir':
        return puede('tomarDecision') ? 'Tu usuario **sí puede decidir**.' : 'Tu usuario **no tiene** el permiso de decidir: revisa y deja notas; la decisión la toma quien lo tenga.';
      case 'activos':
        if (!contratos().length) return CARGANDO_CT;
        var a = activos(), sa = 0;
        a.forEach(function (f) { sa += Number(f.valor) || 0; });
        return 'Hay **' + plural(a.length, 'contrato activo', 'contratos activos') + '** de ' + contratos().length + ' registrados; suman **' + pesos(sa) + '** (valor final con adiciones).';
      case 'porSecretaria':
        if (!contratos().length) return CARGANDO_CT;
        var m = {};
        activos().forEach(function (f) { var k = f.sec || 'SIN SECRETARÍA'; m[k] = (m[k] || 0) + 1; });
        var ks = Object.keys(m).sort(function (x, y) { return m[y] - m[x]; });
        if (!ks.length) return 'Todavía no hay contratos activos.';
        return 'Contratos **activos** por secretaría:\n' + ks.slice(0, 8).map(function (x) { return '· ' + nombre(x) + ': **' + m[x] + '**'; }).join('\n');
      case 'porVencer':
        if (!contratos().length) return CARGANDO_CT;
        var pv = porVencer();
        if (!pv.length) return 'Ningún contrato activo termina en los próximos 30 días.';
        return '**' + plural(pv.length, 'contrato termina', 'contratos terminan') + '** en los próximos 30 días:\n' +
          lista(pv, function (f) { return '· **' + nombre(f.nombre) + '** — contrato ' + f.contrato + ', el ' + f.fin; }, 6);
      case 'sinFechas':
        if (!contratos().length) return CARGANDO_CT;
        var sf = activos().filter(function (f) { return !f.inicio || !f.fin; });
        if (!sf.length) return 'Todos los contratos activos tienen fecha de inicio y de terminación. Lo demás que le falte a uno lo ves en su ficha (aviso amarillo).';
        return '**' + plural(sf.length, 'contrato activo no tiene', 'contratos activos no tienen') + '** fecha de inicio o de terminación (sin ellas no salen sus formatos):\n' +
          lista(sf, function (f) { return '· **' + nombre(f.nombre) + '** — contrato ' + f.contrato; }, 6);
      case 'solicitudesPend':
        if (!puede('solicitudes')) return 'Tu usuario no responde solicitudes. Si lo necesitas, pídeselo al administrador.';
        var ns = nSolicitudes(), p = solPendientes();
        if (!ns) return 'Ninguna: no hay solicitudes de contratistas por responder. ✓';
        return 'Hay **' + plural(ns, 'solicitud', 'solicitudes') + '** por responder' + (p && p.length ? ' (' + porTipo(p) + ')' : '') + '. Te llevo a la bandeja.';
      case 'accesoPendiente':
        var pa = solPendientes();
        if (!pa) return nSolicitudes() ? 'Hay solicitudes por responder; ábrelas para ver quién pide acceso.' : 'Nadie está esperando acceso. ✓';
        pa = pa.filter(function (r) { return r.origen === 'LOGIN'; });
        if (!pa.length) return 'Nadie está esperando acceso. ✓';
        return lista(pa, function (r) { return '· **' + nombre(r.nombre) + '**' + (r.secretaria ? ' — ' + nombre(r.secretaria) : '') + (r.activoAhora ? ' · ya tiene contrato ACTIVO' : ' · sin contrato activo: se registra con **Agregar contratista**'); }, 6);
      case 'permisos': return textoPermisos();
      case 'avisosTelefono':
        var e = K.piezas.avisos ? K.piezas.avisos.estado() : '';
        if (e === 'listo') return 'Este teléfono **ya recibe avisos**: te llegan cuando el supervisor pasa una cuenta a Contratación o un contratista hace una solicitud, aunque tengas la app cerrada.';
        if (e === 'ios-sin-instalar') return 'En iPhone los avisos solo llegan con la app **instalada** en la pantalla de inicio: menú de tu perfil → Instalar la app.';
        if (e === 'bloqueado') return 'Los avisos están **bloqueados** en este navegador: actívalos en los permisos del sitio (el candado junto a la dirección) y vuelve a abrir la app.';
        return 'Los avisos se activan solos al entrar: acepta el permiso de notificaciones cuando el teléfono lo pida.';
      case 'nombre': return nombre(String(yo().nombre || '').split(/\s+/)[0] || '');
      default: return '';
    }
  }

  function vista() {
    try { var cl = (K.piezas.insights.configuracion() || {}).clave; if (cl) return cl; } catch (e) {}
    return rutaActual().split('/')[0] || 'inicio';
  }

  var ADAPTADOR = {
    vista: vista,
    estado: function () { return 'ACTIVO'; },
    dato: dato, urgente: urgente, destino: destino, puerta: puerta, accion: accion
  };

  /* ══════════════ la pantalla de entrada ══════════════ */

  function campo(n) { return document.querySelector('.kit-sesion [name="' + n + '"]'); }
  function resaltar(el) {
    if (!el) return;
    el.classList.add('kit-as-resalta');
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    setTimeout(function () { el.classList.remove('kit-as-resalta'); }, 3600);
  }

  var ENTRADA = {
    vista: function () { return 'entrada'; },
    estado: function () { return ''; },
    dato: function () { return ''; },
    urgente: function () { return null; },
    destino: function () { return null; },
    puerta: function () { return null; },
    accion: function (a) {
      if (a === 'olvide') return { etiqueta: 'Mostrarme el botón', icono: 'llave', hacer: function () {
        var d = campo('documento');
        if (d && !String(d.value || '').trim()) { d.focus(); resaltar(d); }
        /* NO se toca: pedir la contraseña lo decide la persona */
        resaltar(document.querySelector('.kit-sesion__olvide'));
      } };
      if (a === 'documento') return { etiqueta: 'Ir a la entrada', icono: 'persona', hacer: function () {
        var d = campo('documento'), cl = campo('clave');
        var el = d && !String(d.value || '').trim() ? d : (cl || d);
        if (el) { el.focus(); resaltar(el); }
      } };
      if (a === 'instalar') return { etiqueta: 'Cómo instalarla', icono: 'descargar', hacer: function () { if (K.piezas.instalar) K.piezas.instalar.abrir(); } };
      return null;
    }
  };

  K.piezas.asistente.configurar({
    app: 'CONTRATACION',
    base: window.ASISTENTE_BASE || [],
    adaptador: ADAPTADOR
  });

  window.CONTRATACION_ASISTENTE = {
    adaptador: ADAPTADOR,
    entrada: ENTRADA,
    /* para las pruebas */
    _urgente: urgente, _dato: dato
  };
}());
