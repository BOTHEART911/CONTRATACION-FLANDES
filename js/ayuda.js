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

  /* ══════════════ 5.2 · agregar, adición, cesión y suspensión ══════════════ */
  function ULT() { return (window.GESTION && window.GESTION._ultima()) || {}; }
  function pesos52(v) { return '$ ' + Math.round(Number(v) || 0).toLocaleString('es-CO'); }

  GUIAS.agregar = function () {
    return {
      guia: 'Primero **el documento**: la app te dice si es una persona nueva, alguien que ya trabajó con la Alcaldía (se traen sus datos y su contraseña) o alguien con contrato **activo** (solo se deja en otra secretaría). Después llenas el contrato; el valor en letras y el conteo de obligaciones salen solos.',
      botones: [
        { texto: '¿Cómo pego las obligaciones?', responde: function () {
            return 'Cópialas del clausulado **con su numeración** (1. 2. 3. …). La app las separa por el número, no por los saltos de línea, y te muestra cuántas contó antes de guardar. Máximo 26.';
          } },
        { texto: '¿Qué valida el CDP?', responde: function () {
            return 'Que tenga **10 dígitos**, que empiece por el año de la vigencia y que **no esté usado** en ningún otro contrato (ni como CDP inicial ni de adición). Escribes solo el final: el año lo pone la app.';
          } },
        { texto: '¿Qué le llega al contratista?', responde: function () {
            return 'Si es nuevo, su **contraseña** por WhatsApp (se guarda cifrada) y el aviso del contrato. Si ya había trabajado, solo el aviso: conserva la contraseña que tenía.';
          } }
      ]
    };
  };

  GUIAS.adicion = function () {
    return {
      guia: 'La app decide si es la **1ª o la 2ª** adición. La 2ª va en su propia columna y ya no pisa el valor de la 1ª. Los informes del contrato inicial se **congelan** y se guarda el **total acumulado** (como ya lo tenía la hoja).',
      botones: [
        { texto: '¿Cuánto se puede adicionar?', responde: function () {
            var c = ULT().contrato || {}, inf = c.informes || {};
            if (!c.valorInicial) return 'Hasta el **50 %** del valor inicial, sumando las dos adiciones.';
            return 'Hasta el **50 %** del valor inicial (' + pesos52(c.valorInicial) + '): el tope total es **' + pesos52(c.valorInicial / 2) + '**' +
              (c.adicion1 ? ' y ya tiene ' + pesos52(c.adicion1) + ' en la 1ª' : '') + '.';
          } },
        { texto: '¿Cuántos informes quedan?', responde: function () {
            var c = ULT().contrato || {}, inf = c.informes || {};
            if (!inf.primario) return 'Todavía no hay informes congelados: los pones tú en el formulario.';
            return 'Primario **' + inf.primario + '**' + (inf.adicion1 ? ' + 1ª adición **' + inf.adicion1 + '**' : '') +
              (inf.adicion2 ? ' + 2ª **' + inf.adicion2 + '**' : '') + ' = **' + inf.total + '** informes.';
          } },
        { texto: '¿Y si me equivoqué?', responde: function () {
            var c = ULT().contrato || {}, inf = c.informes || {};
            return 'Usa **Corregir la última adición**: reescribe esa misma adición (no crea otra) y vuelve a avisar al contratista.';
          } }
      ]
    };
  };

  GUIAS.cesion = function () {
    return {
      guia: 'La cesión cambia **quién** ejecuta el contrato, no el contrato: número, CDP, RP, obligaciones y tramo se quedan. Queda escrito quién cedió y desde cuándo empieza el cesionario, para las certificaciones.',
      botones: [
        { texto: '¿Qué pasa con las cuentas del cedente?', responde: function () {
            var c = ULT().contrato || {}, inf = c.informes || {};
            return 'Se quedan **con su nombre y su documento**. El cesionario sigue la numeración' +
              (c.ultimaCuenta ? ' desde el informe **' + (c.ultimaCuenta.informe + 1) + '**' : '') + ' y el saldo del contrato.';
          } },
        { texto: '¿Y el RP de la cesión?', responde: function () {
            var c = ULT().contrato || {}, inf = c.informes || {};
            return 'Lo pone el **cesionario en su cuenta** (campo obligatorio en su app) hasta que Contabilidad lo use en una orden de pago. El RP original del contrato **no se toca**.';
          } },
        { texto: '¿Por qué no me deja ceder?', responde: function () {
            var c = ULT().contrato || {}, inf = c.informes || {};
            var ab = c.abiertas || [];
            if (!ab.length) return 'Sí se puede: no tiene cuentas a medio camino.';
            return 'Tiene ' + ab.map(function (x) { return 'la cuenta ' + x.informe + ' en ' + x.estado; }).join(', ') +
              '. Hasta que llegue al plan de pagos (**CERRADA**) quedaría entre dos personas.';
          } }
      ]
    };
  };

  GUIAS.suspension = function () {
    return {
      guia: 'Escribe el **tiempo total** que el contrato estuvo suspendido. La fecha final se corre lo mismo y el tiempo de ejecución queda en lo **realmente ejecutado**. Con 0 y 0 se quita.',
      botones: [
        { texto: '¿Por qué el total y no lo nuevo?', responde: function () {
            return 'Porque así no se suma dos veces si alguien guarda lo mismo otra vez: la app compara con lo que ya tenía y mueve la fecha solo la diferencia.';
          } }
      ]
    };
  };

  /* 5.5 · editar: corrección u OTROSÍ */
  GUIAS.editar = function () {
    return {
      guia: 'Cambia lo que haga falta y guarda. **Sin marcar la casilla** es una corrección: queda registrado quién cambió qué y cuándo. **Con la casilla OTROSÍ** además le llega un aviso al contratista para que adjunte el OTROSÍ (del SECOP II) en su próxima cuenta.',
      botones: [
        { texto: '¿Por qué no puedo cambiar el nombre o el número?', responde: function () {
            return 'Cambiar de persona es una CESIÓN (tiene su propio botón). El N° de contrato y el documento forman la llave con la que el contrato se une a sus cuentas: si cambian, las cuentas quedarían huérfanas.';
          } },
        { texto: '¿Qué pasa si cambio el supervisor?', responde: function () {
            return 'Queda el nuevo con su grupo de WhatsApp, y las cuentas que todavía no llegan al plan de pagos pasan a él. Las cerradas se quedan con quien las revisó.';
          } },
        { texto: '¿Y si otra persona lo está editando?', responde: function () {
            return 'Si alguien guarda antes que tú, la app no deja pisar su cambio: te pide volver a abrir el contrato para ver lo que hay ahora.';
          } }
      ]
    };
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

  var TITULOS = { inicio: 'Tu inicio', contratistas: 'CONTRATISTAS', contratista: 'Ficha del contratista',
                  agregar: 'Agregar contratista', adicion: 'Adición', cesion: 'Cesión', suspension: 'Suspensión',
                  revisar: 'Revisar cuentas', cuenta: 'Revisión de cuenta',
                  requerimientos: 'Requerimientos', comunicados: 'Comunicados', reporte: 'Reporte de Contratación' };

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
