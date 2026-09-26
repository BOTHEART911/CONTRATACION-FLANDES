/* ============================================================
   CONTRATACION-FLANDES · AYUDA POR VISTA (Insights)
   Ecosistema Flandes · Fase 5, entrega 5.1 (5.4: requerimientos, comunicados y reporte)

   El mismo patrón de CONTRATISTA-FLANDES (4.9): cada vista tiene una
   GUÍA que habla de lo que hay en pantalla y PREGUNTAS RÁPIDAS con la
   respuesta calculada en el teléfono. Nada viaja al servidor ni pasa
   por una IA: los números salen de la lista que trajo el arranque.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var CTX = function () { return {}; };

  function ctx() { try { return CTX() || {}; } catch (e) { return {}; } }
  function nombre(s) {
    var t = K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || '');
    return t.replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
            .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }
  function primerNombre(s) { return nombre(String(s || '').trim().split(/\s+/)[0] || ''); }
  function hola() { var y = ctx().yo || {}; return y.nombre ? primerNombre(y.nombre) + ', ' : ''; }
  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }
  function CT() { return window.CONTRATISTAS || null; }
  function todas() { return CT() ? CT().todas() : []; }
  function activos() { return todas().filter(function (f) { return f.estado === 'ACTIVO'; }); }

  function top(filas, campo, n) {
    var m = {};
    filas.forEach(function (f) { var v = f[campo] || 'SIN DATO'; m[v] = (m[v] || 0) + 1; });
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, n || 99)
      .map(function (k) { return { k: k, n: m[k] }; });
  }

  function parseFecha(s) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || ''));
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }

  /** Los activos que terminan en los próximos 30 días (o ya se pasaron). */
  function porVencer(filas) {
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    var en30 = new Date(hoy.getTime() + 30 * 864e5);
    return filas.filter(function (f) {
      var d = parseFecha(f.fin);
      return f.estado === 'ACTIVO' && d && d <= en30;
    }).sort(function (a, b) { return parseFecha(a.fin) - parseFecha(b.fin); });
  }

  function sinFecha(filas) {
    return filas.filter(function (f) { return f.estado === 'ACTIVO' && (!f.inicio || !f.fin); });
  }

  function listaCorta(filas, fmt, max) {
    max = max || 8;
    var t = filas.slice(0, max).map(fmt).join('\n');
    if (filas.length > max) t += '\n… y ' + (filas.length - max) + ' más.';
    return t;
  }

  /* ══════════════ las guías ══════════════ */

  var GUIAS = {

    inicio: function () {
      var a = activos(), L = todas();
      var t = hola() + 'este es el inicio de Contratación. ';
      if (L.length) {
        t += 'Hay **' + a.length + ' contratos activos** de ' + L.length + ' registrados. ';
        var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        var v = porVencer(L).filter(function (f) { return parseFecha(f.fin) >= hoy; });
        if (v.length) t += '**' + v.length + '** ' + (v.length === 1 ? 'termina' : 'terminan') + ' en los próximos 30 días. ';
      }
      t += 'Toca una cifra o una secretaría del resumen y la lista se abre ya filtrada.';
      return {
        guia: t,
        botones: [
          { texto: '¿Qué secretaría tiene más contratos?', responde: function () {
              var s = top(activos(), 'sec', 5);
              if (!s.length) return 'Todavía no hay contratos activos.';
              return 'Contratos **activos** por secretaría:\n' + s.map(function (x) { return '· ' + nombre(x.k) + ': **' + x.n + '**'; }).join('\n');
            } },
          { texto: '¿Cuáles terminan pronto?', responde: function () {
              var v = porVencer(todas());
              var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
              var pasados = v.filter(function (f) { return parseFecha(f.fin) < hoy; });
              var pronto = v.filter(function (f) { return parseFecha(f.fin) >= hoy; });
              if (!v.length) return 'Ningún contrato activo termina en los próximos 30 días.';
              var t = '';
              if (pronto.length) t += 'Terminan en los próximos 30 días:\n' +
                listaCorta(pronto, function (f) { return '· **' + nombre(f.nombre) + '** — contrato ' + f.contrato + ', el ' + f.fin; }) + '\n\n';
              if (pasados.length) t += '**' + pasados.length + '** siguen ACTIVOS con la fecha de terminación ya pasada. ' +
                'Si tienen adición o prórroga, la fecha de la hoja puede ser la del contrato inicial; si no, conviene revisarlos:\n' +
                listaCorta(pasados, function (f) { return '· ' + nombre(f.nombre) + ' — contrato ' + f.contrato + ', terminó el ' + f.fin + (f.adic ? ' (adicionado)' : ''); }, 6);
              return t.trim();
            } },
          { texto: '¿Cuánto suman los contratos activos?', responde: function () {
              var a = activos(), s = 0;
              a.forEach(function (f) { s += Number(f.valor) || 0; });
              return 'Los ' + a.length + ' contratos activos suman **' + pesos(s) + '** (valor final: el inicial más sus adiciones).';
            } },
          { texto: '¿Cómo cambio mi foto?', responde: function () {
              return 'Toca tu foto (o tus iniciales) en el saludo, o el menú de tu perfil → **Foto de perfil**. Es la misma en todas las apps de la Alcaldía.';
            } }
        ]
      };
    }
  };


  /* ══════════════ 5.3 · revisar cuentas ══════════════ */
  function RV() { return window.REVISION || null; }
  function diasDe(f) {
    var d = parseFecha(f); if (!d) return null;
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.round((hoy - d) / 864e5);
  }

  GUIAS.revisar = function () {
    return {
      guia: 'Aquí están las cuentas que el **supervisor ya revisó** y esperan a Contratación, de la más antigua a la más nueva. ' +
            '**Sin abrir** nadie las ha tocado; **En revisión** alguien ya dejó notas (solo es un aviso, no bloquea); **Vuelven corregidas** ya se devolvieron antes.',
      botones: [
        { texto: '¿Cuál lleva más días esperando?', responde: function () {
            var c = RV() ? RV()._cuentas() : [];
            if (!c.length) return '¡Ninguna! Estás al día.';
            var o = c.slice().sort(function (a, b) { return (diasDe(b.radicada) || 0) - (diasDe(a.radicada) || 0); });
            return listaCorta(o, function (x) {
              var d = diasDe(x.radicada);
              return '· **' + nombre(x.nombre) + '** — cuenta ' + x.informe + ' de ' + x.total + (d !== null ? ', radicada hace ' + d + (d === 1 ? ' día' : ' días') : '');
            }, 6);
          } },
        { texto: '¿Cuáles vuelven corregidas?', responde: function () {
            var c = (RV() ? RV()._cuentas() : []).filter(function (x) { return x.devoluciones; });
            if (!c.length) return 'Ninguna: todas llegan por primera vez.';
            return listaCorta(c, function (x) {
              return '· **' + nombre(x.nombre) + '** (cuenta ' + x.informe + ')' + (x.ultimaDevolucion && x.ultimaDevolucion.motivo ? ': «' + x.ultimaDevolucion.motivo + '»' : '');
            }, 6);
          } },
        { texto: '¿Quién está revisando qué?', responde: function () {
            var c = (RV() ? RV()._cuentas() : []).filter(function (x) { return x.revision; });
            if (!c.length) return 'Nadie tiene revisiones a medias.';
            return listaCorta(c, function (x) {
              return '· **' + nombre(x.revision.por) + '** con ' + nombre(x.nombre) + ' (desde ' + x.revision.desde + ', ' + x.revision.notas + ' notas)';
            }, 8);
          } }
      ]
    };
  };

  GUIAS.cuenta = function () {
    return {
      guia: 'Revisa por pestañas: **Contrato**, **Pago**, **Planilla** y **Actividades**. Cada documento se abre en el visor (lo puedes encoger y mover) y cada evidencia en el carrusel con zoom. ' +
            'Marca con ✓ lo revisado y deja **notas internas** donde haga falta. **Guardar revisión** no cambia el estado: la retomas donde quedaste. ' +
            'Al **devolver**, tus notas pasan al motivo con un toque; el contratista solo lee el motivo.',
      botones: [
        { texto: '¿Qué me falta por mirar?', responde: function () {
            var r = RV(); if (!r || !r._detalle()) return 'La cuenta todavía está cargando.';
            var B = r._bitacora(), docs = r._docs(), d = r._detalle();
            var fd = docs.filter(function (x) { return !B.vistos['doc:' + x.id]; });
            var fo = d.obligaciones.filter(function (o) { return !B.vistos['obl:' + o.n]; });
            if (!fd.length && !fo.length) return 'Nada: ya marcaste todo como revisado.';
            var t = [];
            if (fo.length) t.push('**Obligaciones:** ' + fo.map(function (o) { return o.n; }).join(', '));
            if (fd.length) t.push('**Documentos:** ' + fd.map(function (x) { return x.titulo; }).join(', '));
            return t.join('\n');
          } },
        { texto: '¿Cuadran los saldos?', responde: function () {
            var r = RV(), d = r && r._detalle(); if (!d) return 'La cuenta todavía está cargando.';
            if (d.historialPendiente) return 'El historial del contrato todavía está llegando: pregunta de nuevo en un momento.';
            var k = d.cuenta.campos || {}, h = d.historial || [];
            var s = K.aNumero(k.saldo), c = K.aNumero(k.cobro), n = K.aNumero(k.nuevoSaldo);
            var t = 'Saldo **' + pesos(s) + '** − cobro **' + pesos(c) + '** = ' + pesos(s - c) + (Math.abs(s - c - n) > 1 ? ' ⚠ y declaró **' + pesos(n) + '**.' : ' ✓');
            var i = -1; h.forEach(function (x, j) { if (x.actual) i = j; });
            if (i > 0) {
              var a = h[i - 1];
              t += '\nLa cuenta ' + a.informe + ' dejó **' + pesos(a.nuevoSaldo) + '**' + (Math.abs(a.nuevoSaldo - s) > 1 ? ' ⚠ no coincide con el saldo actual.' : ' ✓ coincide.');
            }
            return t;
          } },
        { texto: '¿Por qué la devolvieron antes?', responde: function () {
            var r = RV(), d = r && r._detalle(); if (!d) return 'La cuenta todavía está cargando.';
            if (d.historialPendiente) return 'El historial del contrato todavía está llegando: pregunta de nuevo en un momento.';
            var dev = (d.traza.eventos || []).filter(function (e) { return e.estado === 'DEVUELTA'; });
            if (!dev.length) return 'Es la primera vez que llega: no la han devuelto.';
            return dev.map(function (e) { return '· **' + e.fecha + '**' + (e.quien ? ' (' + nombre(e.quien) + ')' : '') + ': «' + (e.motivo || 'sin motivo escrito') + '»'; }).join('\n');
          } },
        { texto: '¿A nombre de quién sale el aviso?', responde: function () {
            var r = RV(), d = r && r._detalle(); if (!d) return 'La cuenta todavía está cargando.';
            return 'De **' + nombre(d.cuenta.supervisor) + '**, el supervisor del contrato. Quién revisó de verdad queda en la historia de la cuenta (solo lo ve Contratación).';
          } }
      ]
    };
  };

  /* ══════════════ 5.4 · oficina ══════════════ */

  function RQ() { return window.REQS || null; }
  function CM() { return window.COMUS || null; }
  function RP() { return window.REPORTE || null; }

  GUIAS.requerimientos = function () {
    return {
      guia: 'En **Contratistas** eliges a quién pedirle algo: toca **Redactar** o marca varios y redacta una sola vez (máximo 20). ' +
            'Le llega como notificación y por WhatsApp, y queda en su buzón. En **Historial** ves todo lo pedido; márcalo **atendido** cuando lo resuelva.',
      botones: [
        { texto: '¿Cuántos siguen abiertos?', responde: function () {
            var d = RQ() && RQ()._datos(); if (!d) return 'Todavía está cargando.';
            var ab = d.lista.filter(function (r) { return r.estado !== 'ATENDIDO'; });
            if (!d.lista.length) return 'Todavía no se ha hecho ningún requerimiento desde la app nueva.';
            if (!ab.length) return 'Ninguno: los ' + d.lista.length + ' requerimientos están atendidos. ✓';
            return '**' + ab.length + '** abiertos de ' + d.lista.length + '. El más viejo es del **' + ab[ab.length - 1].fecha.split('-').reverse().join('/') + '** (' + nombre(ab[ab.length - 1].nombre) + ').';
          } },
        { texto: '¿Quién tiene más pendientes?', responde: function () {
            var d = RQ() && RQ()._datos(); if (!d) return 'Todavía está cargando.';
            var ab = d.lista.filter(function (r) { return r.estado !== 'ATENDIDO'; });
            if (!ab.length) return 'Nadie tiene requerimientos abiertos.';
            return listaCorta(top(ab, 'nombre', 99), function (x) { return '· **' + nombre(x.k) + '**: ' + x.n; }, 6);
          } },
        { texto: '¿A quién no le llegó el aviso?', responde: function () {
            var d = RQ() && RQ()._datos(); if (!d) return 'Todavía está cargando.';
            var m = d.lista.filter(function (r) { return /falló|SIN/.test(r.aviso || ''); });
            if (!m.length) return 'A todos les salió el aviso por algún canal. ✓';
            return listaCorta(m, function (r) { return '· **' + nombre(r.nombre) + '** (' + r.id + '): ' + r.aviso; }, 6) +
              '\nRevisa su teléfono en DATOS PERSONALES del contratista.';
          } }
      ]
    };
  };

  GUIAS.comunicados = function () {
    return {
      guia: 'Toca **Nuevo comunicado**: escribe, adjunta documentos (PDF, fotos, Word, Excel…) y publica. Llega como notificación a los teléfonos de los contratistas. ' +
            'Si te equivocaste, **Retirar** lo quita de su app sin borrarlo. Los documentos se abren en el visor.',
      botones: [
        { texto: '¿Cuántos teléfonos lo reciben?', responde: function () {
            var d = CM() && CM()._datos(); if (!d) return 'Todavía está cargando.';
            if (d.telefonos === null || d.telefonos === undefined) return 'No pude contar los teléfonos ahora.';
            return '**' + d.telefonos + '** teléfonos de contratistas tienen los avisos activados. Los demás lo ven cuando abren la app.';
          } },
        { texto: '¿Qué he publicado yo?', responde: function () {
            var d = CM() && CM()._datos(); if (!d) return 'Todavía está cargando.';
            var m = d.lista.filter(function (c) { return c.mio; });
            if (!m.length) return 'Todavía no has publicado comunicados desde la app nueva.';
            return listaCorta(m, function (c) { return '· ' + (c.fecha ? c.fecha.split('-').reverse().join('/') + ' · ' : '') + (c.estado === 'RETIRADO' ? '(retirado) ' : '') + '«' + String(c.texto || '').slice(0, 60) + '»'; }, 6);
          } }
      ]
    };
  };

  GUIAS.reporte = function () {
    return {
      guia: 'Elige el **rango** (o toca un atajo), filtra por **estado**, **quién revisó** o **secretaría**, y descarga en **PDF** o **Excel**. ' +
            'Quién revisó sale de lo que se registra al decidir; en las cuentas viejas, del registro histórico de Contratación, **nunca del supervisor**.',
      botones: [
        { texto: 'Resúmeme el rango', responde: function () {
            var r = RP(); var f = r ? r._filtradas() : []; if (!r || !r._datos()) return 'Todavía está cargando.';
            if (!f.length) return 'No hay cuentas decididas en ' + r._rango().toLowerCase() + '.';
            var a = f.filter(function (x) { return x.estado === 'A'; }).length;
            return '**' + r._rango() + '**: ' + f.length + ' cuentas, **' + a + '** aprobadas y **' + (f.length - a) + '** devueltas (' + Math.round((f.length - a) * 100 / f.length) + '% se devuelve).';
          } },
        { texto: '¿Por qué se devuelve más?', responde: function () {
            var r = RP(); var f = r ? r._filtradas().filter(function (x) { return x.estado === 'D' && x.motivo; }) : [];
            if (!f.length) return 'No hay devoluciones con motivo en este rango.';
            var temas = { 'Planilla / seguridad social': /planilla|pila|seguridad social|eps|arl|pension/i, 'Saldos y valores': /saldo|valor|cobro|\$/i,
                          'Firmas': /firma/i, 'RUT': /\brut\b/i, 'Evidencias / informe': /evidencia|informe|actividad|anexo/i, 'Fechas / periodo': /fecha|periodo|mes/i };
            var c = {};
            f.forEach(function (x) { Object.keys(temas).forEach(function (t) { if (temas[t].test(x.motivo)) c[t] = (c[t] || 0) + 1; }); });
            var ks = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
            if (!ks.length) return 'Los motivos no caen en un tema común. Mira la lista de devueltas.';
            return ks.map(function (k) { return '· **' + k + '**: ' + c[k]; }).join('\n') + '\n(de ' + f.length + ' devoluciones con motivo; una puede contar en varios temas)';
          } },
        { texto: '¿Quién revisó más?', responde: function () {
            var r = RP(); var f = r ? r._filtradas() : []; if (!f.length) return 'No hay cuentas en este rango.';
            return listaCorta(top(f.map(function (x) { return { k: x.revisor || 'Sin registro' }; }), 'k', 99), function (x) { return '· **' + nombre(x.k) + '**: ' + x.n; }, 6);
          } }
      ]
    };
  };

  /* 26/09 · SOLICITUDES de los contratistas */
  function SB() { return window.SOLICITUDES || null; }
  GUIAS.solicitudes = function () {
    return {
      guia: 'Aquí llega lo que piden los contratistas: **acceso** (desde la entrada de la app, cuando su contrato está inactivo o todavía no están registrados) y **adición, cesión, modificación o corrección y suspensión** (desde su app). ' +
            'Toca **Responder** (le llega por WhatsApp o en su app, sin evaluación), registra una **Gestión** con lo que hiciste, o **borra** las que sean basura. ' +
            'Si pidió acceso y aún no tiene contrato activo, **Agregar contratista** abre el registro con su documento ya validado.',
      botones: [
        { texto: '¿Cuántas faltan por responder?', responde: function () {
            var d = SB() && SB()._datos(); if (!d) return 'Todavía está cargando.';
            var p = d.lista.filter(function (r) { return SB()._grupo(r) === 'PENDIENTE'; });
            if (!p.length) return 'Ninguna: estás al día. ✓';
            var vieja = p[p.length - 1];
            return '**' + p.length + '** por responder. La que más espera es la **' + vieja.id + '** de ' + nombre(vieja.nombre) + ' (' + String(vieja.fecha).slice(0, 10) + ').';
          } },
        { texto: '¿Quiénes piden acceso?', responde: function () {
            var d = SB() && SB()._datos(); if (!d) return 'Todavía está cargando.';
            var p = d.lista.filter(function (r) { return r.origen === 'LOGIN' && SB()._grupo(r) === 'PENDIENTE'; });
            if (!p.length) return 'Nadie está esperando acceso.';
            return listaCorta(p, function (r) { return '· **' + nombre(r.nombre) + '** (' + r.documento + ')' + (r.activoAhora ? ' · ya tiene contrato ACTIVO' : ''); }, 8);
          } },
        { texto: '¿Qué es una gestión suelta?', responde: function () {
            return 'Lo que la oficina hizo por un contrato sin que el contratista lo pidiera (lo atendieron, se tramitó algo). Se registra con **Registrar gestión** y el contratista la ve en su panel.';
          } }
      ]
    };
  };

  var TITULOS = { inicio: 'Tu inicio',
                  revisar: 'Revisar cuentas', cuenta: 'Revisión de cuenta',
                  requerimientos: 'Requerimientos', comunicados: 'Comunicados', reporte: 'Reporte de Contratación', solicitudes: 'Solicitudes' };

  /* 10.2 · las guías de contratistas (lista, ficha, gestión y carga masiva) viven en
     js/ayuda-contratos.js, el mismo archivo de ADMIN-FLANDES */
  if (window.AYUDA_CONTRATOS) window.AYUDA_CONTRATOS.sumar(GUIAS, TITULOS);

  function montar(vista, extra) {
    if (!K.piezas.insights) return;
    var g = GUIAS[vista];
    if (!g) return;
    var base = g();
    var cfg = {
      vista: (extra && extra.vista) || TITULOS[vista] || vista,
      guia: function () { return g().guia; },
      botones: base.botones || [],
      alto: !!base.alto
    };
    if (base.filas) { cfg.filas = base.filas; cfg.medidas = base.medidas; cfg.filtros = base.filtros; }
    K.piezas.insights.montar(cfg);
  }

  window.AYUDA = {
    configurar: function (fn) { if (typeof fn === 'function') CTX = fn; },
    montar: montar,
    tiene: function (v) { return !!GUIAS[v]; },
    _guias: GUIAS
  };
}());
