/* ============================================================
   CONTRATACION-FLANDES · AYUDA POR VISTA (Insights)
   Ecosistema Flandes · Fase 5, entrega 5.1

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
    },

    contratistas: function () {
      return {
        guia: 'Aquí están todos los contratos. Empiezas viendo los **activos**; con las pastillas cambias a inactivos o todos, ' +
              'sumas **adicionados** o **cedidos**, y eliges secretaría y supervisor. El número de cada pastilla es lo que verás al tocarla. ' +
              'El buscador encuentra por nombre, contrato, secretaría o supervisor, y por documento desde 6 cifras.',
        botones: [
          { texto: '¿Qué estoy viendo?', responde: function (f) {
              var c = CT();
              return 'Estás viendo **' + f.length + '** ' + (f.length === 1 ? 'contrato' : 'contratos') + ': ' + (c ? c._filtros() : '') + '.';
            } },
          { texto: '¿Por supervisor?', responde: function (f) {
              var s = top(f, 'sup', 12);
              if (!s.length) return 'No hay contratos en pantalla.';
              return 'De lo que tienes en pantalla, por supervisor(a):\n' + s.map(function (x) { return '· ' + nombre(x.k) + ': **' + x.n + '**'; }).join('\n');
            } },
          { texto: '¿A quién le faltan fechas?', responde: function (f) {
              var s = sinFecha(f);
              if (!s.length) return 'Todos los activos en pantalla tienen fecha de inicio y de terminación.';
              return 'Activos en pantalla sin fecha de inicio o de terminación (sin ellas no se generan sus formatos):\n' +
                listaCorta(s, function (x) { return '· **' + nombre(x.nombre) + '** — contrato ' + x.contrato; });
            } },
          { texto: '¿Los que tienen varios contratos?', responde: function () {
              var m = {};
              todas().forEach(function (x) { (m[x.doc] = m[x.doc] || []).push(x); });
              var varios = Object.keys(m).filter(function (d) { return m[d].length > 1; });
              if (!varios.length) return 'Nadie tiene más de un contrato.';
              return '**' + varios.length + '** contratistas tienen más de un contrato. Cada contrato es una tarjeta aparte y abre su propia ficha:\n' +
                listaCorta(varios, function (d) {
                  return '· **' + nombre(m[d][0].nombre) + '** — ' + m[d].map(function (x) { return x.contrato + ' (' + x.estado.toLowerCase() + ')'; }).join(', ');
                });
            } }
        ],
        filas: function () { return CT() ? CT()._visibles() : []; },
        filtros: function () { return CT() ? CT()._filtros() : ''; },
        medidas: [
          { titulo: 'Contratos', calcula: function (f) { return f.length; } },
          { titulo: 'Activos', calcula: function (f) { return f.filter(function (x) { return x.estado === 'ACTIVO'; }).length; } },
          { titulo: 'Adicionados', calcula: function (f) { return f.filter(function (x) { return x.adic; }).length; } }
        ]
      };
    },

    contratista: function () {
      return {
        guia: 'Es la ficha de un contrato: la misma información que el contratista ve en su app, más sus datos personales y de pago. ' +
              'Si arriba sale el aviso amarillo, al contratista le faltan datos del contrato y sus formatos no salen completos.',
        botones: [
          { texto: '¿Qué le falta a este contrato?', responde: function () {
              var d = CT() ? CT()._ficha() : null;
              if (!d) return 'La ficha todavía está cargando.';
              var c = d.contrato || {}, p = d.datos || {}, falta = [];
              if (!c.numProceso) falta.push('N° de proceso SECOP II');
              if (!c.fechaInicio) falta.push('fecha de inicio');
              if (!c.fechaTermino) falta.push('fecha de terminación');
              if (!c.rp) falta.push('RP');
              if (!c.regimen) falta.push('régimen simple');
              if (!c.factura) falta.push('factura electrónica');
              if (!c.costos) falta.push('costos y deducciones');
              if (!p.firma) falta.push('firma');
              if (!p.numeroCuenta || !p.banco) falta.push('cuenta bancaria');
              if (!p.eps || !p.arl) falta.push('EPS o ARL');
              if (!falta.length) return 'No le falta nada: el contrato y sus datos están completos.';
              return 'Le falta: **' + falta.join(', ') + '**. Lo diligencia el contratista desde su app (DATOS DEL CONTRATO y DATOS PERSONALES).';
            } },
          { texto: '¿Tiene otros contratos?', responde: function () {
              var d = CT() ? CT()._ficha() : null;
              if (!d || !d.datos) return 'La ficha todavía está cargando.';
              var doc = String(d.datos.documento || '').replace(/\D/g, '');
              var otros = todas().filter(function (x) { return x.doc === doc && x.id !== d.idContrato; });
              if (!otros.length) return 'No: este es su único contrato.';
              return 'Sí, tiene ' + otros.length + ' más:\n' + otros.map(function (x) {
                return '· Contrato **' + x.contrato + '** — ' + nombre(x.sec) + ' (' + x.estado.toLowerCase() + ')';
              }).join('\n');
            } }
        ]
      };
    }
  };

  var TITULOS = { inicio: 'Tu inicio', contratistas: 'CONTRATISTAS', contratista: 'Ficha del contratista' };

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
