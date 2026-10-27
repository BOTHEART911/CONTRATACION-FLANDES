/* CONTRATACION-FLANDES · BASE SEMBRADA DEL ASISTENTE (24/10/2026)
   Respaldo embebido: la usa el asistente la primera vez y en la entrada.
   La de verdad vive en el CORE (hoja ASISTENTE_TEMAS) y se edita en ADMIN;
   cuando cambia, llega con el arranque y reemplaza esta en el teléfono.
   Generado desde la semilla: no se edita a mano. */
window.ASISTENTE_BASE = [
{
"id": "CN-INICIO",
"app": "CONTRATACION",
"vista": "",
"titulo": "Ir al inicio",
"frases": [
"ir al inicio",
"volver al inicio",
"pantalla principal",
"menu principal",
"regresar al menu"
],
"respuesta": "Te llevo a tu **inicio**: ahí están los bloques de la app y el resumen de contratos.",
"accion": "ir:inicio",
"estado": "",
"activo": true,
"orden": 1
},
{
"id": "CN-QUE-ME-TOCA",
"app": "CONTRATACION",
"vista": "inicio",
"titulo": "¿Qué tengo pendiente?",
"frases": [
"que tengo pendiente",
"que me toca hacer",
"que tengo que hacer hoy",
"que me falta",
"que hago primero",
"tengo algo pendiente",
"que es lo mas urgente",
"por donde empiezo hoy"
],
"respuesta": "{{queMeToca}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 2
},
{
"id": "CN-POR-REVISAR",
"app": "CONTRATACION",
"vista": "inicio,revisar",
"titulo": "¿Cuántas cuentas tengo por revisar?",
"frases": [
"cuantas cuentas tengo por revisar",
"cuantas cuentas tengo por aprobar",
"cuentas por revisar",
"cuentas por aprobar",
"que cuentas me llegaron",
"cuentas nuevas",
"me llegaron cuentas",
"revisar cuentas",
"aprobar cuentas",
"bandeja de cuentas"
],
"respuesta": "{{porRevisar}}",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 3
},
{
"id": "CN-MAS-ANTIGUA",
"app": "CONTRATACION",
"vista": "inicio,revisar",
"titulo": "¿Cuál lleva más días esperando?",
"frases": [
"cual lleva mas dias",
"la cuenta mas antigua",
"cual reviso primero",
"cual esta esperando mas",
"cuenta mas vieja por revisar",
"cual se radico primero"
],
"respuesta": "{{masAntigua}}",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 4
},
{
"id": "CN-VUELVEN",
"app": "CONTRATACION",
"vista": "revisar",
"titulo": "¿Cuáles vuelven corregidas?",
"frases": [
"cuales vuelven corregidas",
"cuentas corregidas",
"cuentas que ya devolvi",
"las que devolvimos antes",
"volvio la cuenta",
"reenviaron la cuenta"
],
"respuesta": "{{vuelven}}",
"accion": "ir:revVuelven",
"estado": "",
"activo": true,
"orden": 5
},
{
"id": "CN-QUIEN-REVISA",
"app": "CONTRATACION",
"vista": "revisar",
"titulo": "¿Quién está revisando qué?",
"frases": [
"quien esta revisando",
"quien tiene la cuenta",
"revisiones a medias",
"quien abrio la cuenta",
"en revision",
"otra persona esta revisando"
],
"respuesta": "{{quienRevisa}}",
"accion": "ir:revCurso",
"estado": "",
"activo": true,
"orden": 6
},
{
"id": "CN-COBRO",
"app": "CONTRATACION",
"vista": "revisar",
"titulo": "¿Cuánto suman las cuentas por revisar?",
"frases": [
"cuanto suman las cuentas",
"valor de las cuentas por revisar",
"cuanto se cobra",
"total a pagar",
"cuanta plata hay por aprobar"
],
"respuesta": "{{cobroPorRevisar}}",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 7
},
{
"id": "CN-REVISAR-COMO",
"app": "CONTRATACION",
"vista": "cuenta,revisar",
"titulo": "¿Cómo reviso una cuenta?",
"frases": [
"como reviso una cuenta",
"como reviso",
"pasos para revisar",
"revisar la cuenta de un contratista",
"como empiezo a revisar",
"abrir una cuenta para revisar",
"donde reviso los documentos"
],
"respuesta": "Abre la cuenta desde **REVISAR CUENTAS**: llegan solo las que el **supervisor ya revisó**. Revísala por pestañas: **Contrato**, **Pago**, **Planilla** y **Actividades**. Marca con ✓ cada documento y cada obligación que ya miraste, deja tus notas y toca **Guardar revisión** (no cambia el estado). Cuando termines, **Tomar decisión**.",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 8
},
{
"id": "CN-QUE-LLEGA",
"app": "CONTRATACION",
"vista": "inicio,revisar",
"titulo": "¿Qué cuentas llegan a Contratación?",
"frases": [
"que cuentas llegan",
"por que no me llega la cuenta",
"no veo la cuenta de un contratista",
"cuando me llega una cuenta",
"la cuenta no aparece",
"donde esta la cuenta de"
],
"respuesta": "A Contratación llegan las cuentas que el **supervisor ya revisó y aprobó** (estado REVISADA POR SUPERVISOR). Si una no aparece, todavía está con el contratista (ingresada, devuelta o incompleta) o con su supervisor. En **CONTRATISTAS** → la ficha del contrato ves en qué va cada cuenta.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 9
},
{
"id": "CN-VISOR",
"app": "CONTRATACION",
"vista": "cuenta",
"titulo": "¿Cómo veo los documentos y evidencias?",
"frases": [
"ver los documentos",
"abrir el pdf",
"el visor",
"ver las evidencias",
"ver las fotos",
"agrandar el documento",
"zoom al documento",
"adjuntos de evidencia",
"archivos de la obligacion"
],
"respuesta": "Cada documento se abre en el **visor** (lo puedes encoger, mover y hacer zoom). Las imágenes de cada obligación se ven en el **carrusel**. En **Actividades**, cada obligación trae también sus **adjuntos de evidencia** (hasta 5: PDF, Word o Excel), numerados **1.1**, **1.2**…; con las flechas pasas a los demás.",
"accion": "",
"estado": "",
"activo": true,
"orden": 10
},
{
"id": "CN-PENDIENTE-MIRAR",
"app": "CONTRATACION",
"vista": "cuenta",
"titulo": "¿Qué me falta por mirar?",
"frases": [
"que me falta por mirar",
"que me falta revisar",
"que no he revisado",
"falta algo por revisar"
],
"respuesta": "En la revisión, el asistente de la vista te lo cuenta: toca la pregunta **¿Qué me falta por mirar?** en las preguntas rápidas. Lo que ya marcaste con ✓ queda guardado en tu revisión, aunque salgas y vuelvas.",
"accion": "",
"estado": "",
"activo": true,
"orden": 11
},
{
"id": "CN-NOTAS",
"app": "CONTRATACION",
"vista": "cuenta",
"titulo": "Nota interna o para el contratista",
"frases": [
"nota interna",
"para el contratista",
"dejar una observacion",
"escribir una nota",
"observaciones al contratista",
"que ve el contratista de mis notas"
],
"respuesta": "En cada obligación y documento tienes dos cajas: **Nota interna** (solo el equipo la ve) y **Para el contratista**. Al **devolver**, el motivo sale ya escrito con tus observaciones para el contratista, en orden; lo editas y confirmas. Las notas internas nunca le llegan, y si apruebas, las observaciones no se envían.",
"accion": "",
"estado": "",
"activo": true,
"orden": 12
},
{
"id": "CN-GUARDAR-REV",
"app": "CONTRATACION",
"vista": "cuenta",
"titulo": "¿Guardar revisión cambia el estado?",
"frases": [
"guardar revision",
"guardar sin decidir",
"seguir despues",
"retomar la revision",
"dejar la revision a medias"
],
"respuesta": "**Guardar revisión** no cambia el estado de la cuenta: guarda tus ✓ y tus notas para que la retomes donde quedaste. Otra persona que la abra verá que está **En revisión** (solo es un aviso, no la bloquea).",
"accion": "",
"estado": "",
"activo": true,
"orden": 13
},
{
"id": "CN-DECIDIR",
"app": "CONTRATACION",
"vista": "cuenta",
"titulo": "¿Cómo apruebo o devuelvo una cuenta?",
"frases": [
"aprobar la cuenta",
"devolver la cuenta",
"tomar decision",
"como apruebo",
"como devuelvo",
"como devuelvo una cuenta",
"como apruebo una cuenta",
"rechazar la cuenta",
"dar el visto bueno de contratacion"
],
"respuesta": "Dentro de la cuenta toca **Tomar decisión**: **Aprobar** la pasa a plan de pagos (sigue Contabilidad) y **Devolver** se la regresa al contratista con el motivo. {{puedoDecidir}}",
"accion": "ir:revisar",
"estado": "",
"activo": true,
"orden": 14
},
{
"id": "CN-A-NOMBRE",
"app": "CONTRATACION",
"vista": "cuenta",
"titulo": "¿A nombre de quién sale el aviso?",
"frases": [
"a nombre de quien sale",
"quien firma el aviso",
"sale mi nombre",
"aviso al contratista",
"mensaje de whatsapp de la decision",
"usuario sin contrato"
],
"respuesta": "El aviso de aprobar o devolver lo firmas **tú** · Oficina de Contratación, y le llega al contratista y al grupo del supervisor. Si el administrador te marcó **SIN CONTRATO**, hacia afuera sale **Usuario Contratación** en vez de tu nombre. El texto se edita en ADMIN.",
"accion": "",
"estado": "",
"activo": true,
"orden": 15
},
{
"id": "CN-SALDOS",
"app": "CONTRATACION",
"vista": "cuenta",
"titulo": "¿Cuadran los saldos?",
"frases": [
"cuadran los saldos",
"el saldo no coincide",
"revisar el saldo",
"nuevo saldo",
"saldo de la cuenta anterior"
],
"respuesta": "En la revisión, la pregunta rápida **¿Cuadran los saldos?** compara el saldo, el cobro y el nuevo saldo declarado con la cuenta anterior del contrato. Si algo no coincide sale ⚠ y conviene devolverla con la observación.",
"accion": "",
"estado": "",
"activo": true,
"orden": 16
},
{
"id": "CN-REHACER",
"app": "CONTRATACION",
"vista": "cuenta",
"titulo": "Rehacer los documentos de una cuenta",
"frases": [
"rehacer documentos",
"volver a generar",
"el documento salio mal",
"regenerar la cuenta",
"historial de observaciones"
],
"respuesta": "Si un documento de la cuenta salió mal, en el detalle tienes **Rehacer** (vuelve a generar los formatos con los datos actuales) y el **historial de observaciones** de la cuenta.",
"accion": "",
"estado": "",
"activo": true,
"orden": 17
},
{
"id": "CN-CONTRATISTAS",
"app": "CONTRATACION",
"vista": "inicio,contratistas",
"titulo": "Buscar un contratista",
"frases": [
"buscar un contratista",
"ver los contratistas",
"lista de contratistas",
"buscar contrato",
"buscar por documento",
"ficha del contratista",
"datos de un contratista"
],
"respuesta": "En **CONTRATISTAS** buscas por nombre, contrato, secretaría o supervisor (y por documento desde 6 cifras). Toca la tarjeta y se abre la **ficha** del contrato con sus datos, cuentas y documentos.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 18
},
{
"id": "CN-ACTIVOS",
"app": "CONTRATACION",
"vista": "inicio,contratistas",
"titulo": "¿Cuántos contratos activos hay?",
"frases": [
"cuantos contratos activos",
"contratos activos",
"cuantos contratistas hay",
"numero de contratos",
"total de contratos"
],
"respuesta": "{{activos}}",
"accion": "ir:activos",
"estado": "",
"activo": true,
"orden": 19
},
{
"id": "CN-POR-SECRETARIA",
"app": "CONTRATACION",
"vista": "inicio,contratistas",
"titulo": "¿Qué secretaría tiene más contratos?",
"frases": [
"por secretaria",
"que secretaria tiene mas",
"contratos por secretaria",
"cuantos tiene cada secretaria"
],
"respuesta": "{{porSecretaria}}",
"accion": "ir:activos",
"estado": "",
"activo": true,
"orden": 20
},
{
"id": "CN-POR-VENCER",
"app": "CONTRATACION",
"vista": "inicio,contratistas",
"titulo": "¿Cuáles terminan pronto?",
"frases": [
"cuales terminan pronto",
"contratos por vencer",
"que contratos se vencen",
"fecha de terminacion",
"se acaba el contrato",
"vencen este mes"
],
"respuesta": "{{porVencer}}",
"accion": "ir:activos",
"estado": "",
"activo": true,
"orden": 21
},
{
"id": "CN-SIN-FECHAS",
"app": "CONTRATACION",
"vista": "contratistas,contratista",
"titulo": "¿A quién le faltan fechas o datos?",
"frases": [
"faltan fechas",
"sin fecha de inicio",
"contrato incompleto",
"que le falta al contrato",
"datos incompletos",
"aviso amarillo"
],
"respuesta": "{{sinFechas}}",
"accion": "ir:activos",
"estado": "",
"activo": true,
"orden": 22
},
{
"id": "CN-AGREGAR",
"app": "CONTRATACION",
"vista": "inicio,contratistas,agregar",
"titulo": "Agregar un contratista",
"frases": [
"agregar contratista",
"registrar un contrato",
"nuevo contratista",
"crear contratista",
"contrato nuevo",
"ingresar un contrato",
"dar de alta"
],
"respuesta": "En **AGREGAR CONTRATISTA** primero va **el documento**: la app dice si es nuevo, si ya trabajó con la Alcaldía (trae sus datos y su contraseña) o si tiene un contrato **activo**. Después llenas el contrato; el valor en letras y el conteo de obligaciones salen solos.",
"accion": "ir:agregar",
"estado": "",
"activo": true,
"orden": 23
},
{
"id": "CN-OBLIGACIONES",
"app": "CONTRATACION",
"vista": "agregar,editar,masiva",
"titulo": "¿Cómo pego las obligaciones?",
"frases": [
"pegar las obligaciones",
"obligaciones del contrato",
"cuantas obligaciones",
"numerar obligaciones",
"conteo de obligaciones"
],
"respuesta": "Cópialas del clausulado **con su numeración** (1. 2. 3. …). La app las separa por el número, no por los saltos de línea, y te muestra cuántas contó antes de guardar. Máximo 26.",
"accion": "",
"estado": "",
"activo": true,
"orden": 24
},
{
"id": "CN-CDP",
"app": "CONTRATACION",
"vista": "agregar,adicion,masiva",
"titulo": "¿Qué valida el CDP?",
"frases": [
"cdp",
"numero de cdp",
"el cdp no pasa",
"cdp usado",
"cdp repetido"
],
"respuesta": "Que tenga **10 dígitos**, que empiece por el año de la vigencia y que **no esté usado** en otro contrato (ni inicial ni de adición). Escribes solo el final: el año lo pone la app.",
"accion": "",
"estado": "",
"activo": true,
"orden": 25
},
{
"id": "CN-CLAVE-NUEVO",
"app": "CONTRATACION",
"vista": "agregar",
"titulo": "¿Qué le llega al contratista nuevo?",
"frases": [
"que le llega al contratista",
"contraseña del contratista",
"clave del contratista nuevo",
"aviso al contratista nuevo",
"contratista sin celular"
],
"respuesta": "Le llega **un solo mensaje** por WhatsApp con el aviso del contrato y su acceso. Si es nuevo, su **contraseña inicial es su documento** (luego la cambia); si ya había trabajado, conserva su contraseña. Sin celular no le llega el mensaje: díselo tú.",
"accion": "",
"estado": "",
"activo": true,
"orden": 26
},
{
"id": "CN-MASIVA",
"app": "CONTRATACION",
"vista": "agregar,masiva,contratistas",
"titulo": "Carga masiva de contratos",
"frases": [
"carga masiva",
"subir excel",
"subir un excel con contratos",
"cargar varios contratos de una vez",
"plantilla de excel",
"cargar muchos contratos"
],
"respuesta": "En **CARGA MASIVA** descargas la plantilla, la llenas (una fila por contrato) y la cargas. Primero **se revisa todo sin escribir nada**; después registras solo lo que pasó. Sin la casilla de avisos se registra **en silencio**.",
"accion": "ir:masiva",
"estado": "",
"activo": true,
"orden": 27
},
{
"id": "CN-ADICION",
"app": "CONTRATACION",
"vista": "contratistas,contratista,adicion",
"titulo": "¿Cómo hago una adición?",
"frases": [
"hacer una adicion",
"adicionar el contrato",
"adicion al contrato",
"agregar valor al contrato",
"prorroga",
"adicionar plata"
],
"respuesta": "Abre la **ficha** del contrato en CONTRATISTAS y toca **ADICIÓN**. La app decide si es la 1ª o la 2ª, propone el **total de pagos de la adición** y, al guardar, suma el valor al saldo de su última cuenta. Tope: **50 %** del valor inicial sumando las dos.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 28
},
{
"id": "CN-ADICION-CORREGIR",
"app": "CONTRATACION",
"vista": "adicion",
"titulo": "Me equivoqué en la adición",
"frases": [
"me equivoque en la adicion",
"corregir la adicion",
"adicion mal",
"borrar la adicion"
],
"respuesta": "Usa **Corregir la última adición**: reescribe esa misma adición (no crea otra) y vuelve a avisar al contratista.",
"accion": "",
"estado": "",
"activo": true,
"orden": 29
},
{
"id": "CN-CESION",
"app": "CONTRATACION",
"vista": "contratistas,contratista,cesion",
"titulo": "¿Cómo hago una cesión?",
"frases": [
"hacer una cesion",
"ceder el contrato",
"cesion del contrato",
"cambiar de contratista",
"cesionario",
"cedente"
],
"respuesta": "Abre la **ficha** del contrato y toca **CESIÓN**. El cesionario entra como **contratista nuevo** (su fila, su informe 1, su RUT y su banco); el plazo, el valor y los informes se parten entre los dos. No deja ceder si el cedente tiene una cuenta a medio camino.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 30
},
{
"id": "CN-CESION-RP",
"app": "CONTRATACION",
"vista": "cesion",
"titulo": "¿Y el RP de la cesión?",
"frases": [
"rp de la cesion",
"registro presupuestal cesion",
"rp del cesionario"
],
"respuesta": "Lo pone el **cesionario en su cuenta** (campo obligatorio en su app) hasta que Contabilidad lo use en una orden de pago. El RP original no se toca.",
"accion": "",
"estado": "",
"activo": true,
"orden": 31
},
{
"id": "CN-SUSPENSION",
"app": "CONTRATACION",
"vista": "contratistas,contratista,suspension",
"titulo": "¿Cómo registro una suspensión?",
"frases": [
"suspension",
"suspender el contrato",
"contrato suspendido",
"reanudar el contrato",
"quitar la suspension"
],
"respuesta": "Abre la **ficha** y toca **SUSPENSIÓN**. Escribe el **tiempo total** suspendido: la fecha final se corre lo mismo. Con 0 y 0 se quita.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 32
},
{
"id": "CN-EDITAR",
"app": "CONTRATACION",
"vista": "contratistas,contratista,editar",
"titulo": "Editar un contrato u OTROSÍ",
"frases": [
"editar el contrato",
"corregir un contrato",
"otrosi",
"cambiar el supervisor",
"cambiar datos del contrato",
"modificar el contrato"
],
"respuesta": "En la **ficha** toca **EDITAR**. Sin marcar la casilla es una **corrección** (queda quién cambió qué). Con **OTROSÍ** además le llega un aviso al contratista para adjuntarlo en su próxima cuenta. El nombre, el N° de contrato y el documento no se cambian ahí (eso es una cesión).",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 33
},
{
"id": "CN-ACTIVAR",
"app": "CONTRATACION",
"vista": "contratista",
"titulo": "Activar o inactivar un contrato",
"frases": [
"inactivar contratista",
"activar contratista",
"contrato inactivo",
"dar de baja",
"terminar contrato"
],
"respuesta": "En la **ficha** del contrato está el botón para **activar** o **inactivar**. Un contrato inactivo ya no deja radicar cuentas; el contratista puede pedir acceso de nuevo desde la entrada.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 34
},
{
"id": "CN-VARIOS",
"app": "CONTRATACION",
"vista": "contratistas,contratista",
"titulo": "¿Quién tiene varios contratos?",
"frases": [
"contratistas con varios contratos",
"tiene dos contratos",
"mismo contratista dos secretarias",
"tiene otro contrato"
],
"respuesta": "Cada contrato es una tarjeta aparte con su propia ficha. En la vista CONTRATISTAS, la pregunta rápida **¿Los que tienen varios contratos?** te los lista.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 35
},
{
"id": "CN-SOLICITUDES",
"app": "CONTRATACION",
"vista": "inicio,solicitudes",
"titulo": "¿Qué solicitudes tengo por responder?",
"frases": [
"solicitudes",
"solicitudes pendientes",
"que piden los contratistas",
"solicitudes por responder",
"peticiones de contratistas",
"piden adicion",
"piden cesion"
],
"respuesta": "{{solicitudesPend}}",
"accion": "ir:solicitudes",
"estado": "",
"activo": true,
"orden": 36
},
{
"id": "CN-ACCESO",
"app": "CONTRATACION",
"vista": "inicio,solicitudes",
"titulo": "¿Quiénes piden acceso?",
"frases": [
"piden acceso",
"solicitud de acceso",
"no puede entrar el contratista",
"contrato nuevo secop",
"primer contrato",
"acceso a la app contratista"
],
"respuesta": "{{accesoPendiente}}",
"accion": "ir:accesos",
"estado": "",
"activo": true,
"orden": 37
},
{
"id": "CN-RESPONDER",
"app": "CONTRATACION",
"vista": "solicitudes",
"titulo": "¿Cómo respondo una solicitud?",
"frases": [
"responder solicitud",
"contestar al contratista",
"registrar gestion",
"gestion suelta",
"borrar solicitud"
],
"respuesta": "Toca **Responder** (le llega por WhatsApp o en su app), registra una **Gestión** con lo que hiciste, o **borra** las que sean basura. Si pidió acceso y no tiene contrato activo, **Agregar contratista** abre el registro con su documento ya validado.",
"accion": "ir:solicitudes",
"estado": "",
"activo": true,
"orden": 38
},
{
"id": "CN-REQUERIMIENTO",
"app": "CONTRATACION",
"vista": "inicio,requerimientos",
"titulo": "Pedirle algo a un contratista",
"frases": [
"requerimiento",
"pedirle algo al contratista",
"enviar un requerimiento",
"solicitar documentos al contratista",
"requerir"
],
"respuesta": "En **REQUERIMIENTOS** eliges a quién (o marcas varios, máximo 20) y redactas una vez. Le llega como notificación y por WhatsApp, y queda en su buzón. En **Historial** lo marcas **atendido** cuando lo resuelva.",
"accion": "ir:requerimientos",
"estado": "",
"activo": true,
"orden": 39
},
{
"id": "CN-COMUNICADO",
"app": "CONTRATACION",
"vista": "inicio,comunicados",
"titulo": "Publicar un comunicado",
"frases": [
"comunicado",
"publicar un aviso",
"avisar a todos los contratistas",
"enviar un mensaje a todos",
"circular"
],
"respuesta": "En **COMUNICADOS** toca **Nuevo comunicado**: escribe, adjunta documentos y publica. Llega como notificación a los teléfonos de los contratistas. **Retirar** lo quita de su app sin borrarlo.",
"accion": "ir:comunicados",
"estado": "",
"activo": true,
"orden": 40
},
{
"id": "CN-REPORTE",
"app": "CONTRATACION",
"vista": "inicio,reporte",
"titulo": "Reporte de cuentas aprobadas y devueltas",
"frases": [
"reporte",
"informe de contratacion",
"cuantas cuentas aprobamos en el mes",
"cuentas devueltas del mes",
"descargar reporte",
"quien reviso mas"
],
"respuesta": "En **REPORTE** eliges el rango, filtras por estado, quién revisó o secretaría, y descargas en **PDF** o **Excel**.",
"accion": "ir:reporte",
"estado": "",
"activo": true,
"orden": 41
},
{
"id": "CN-AGENDA",
"app": "CONTRATACION",
"vista": "inicio,agenda",
"titulo": "Agenda de revisión",
"frases": [
"agenda",
"agenda de revision",
"que dias llegan las cuentas",
"cuando llegan las cuentas",
"calendario de cuentas"
],
"respuesta": "En la **AGENDA DE REVISIÓN** ves qué días llegan cuántas cuentas y de quiénes, según el corte de cada contratista (Mes, Semana, Día, Cortes o Lista).",
"accion": "ir:agenda",
"estado": "",
"activo": true,
"orden": 42
},
{
"id": "CN-MISREGISTROS",
"app": "CONTRATACION",
"vista": "inicio,misregistros",
"titulo": "Descargar lo que he hecho",
"frases": [
"mis registros",
"lo que he hecho",
"descargar lo que hice",
"mi informe de actividades",
"historial de lo que hice",
"informe gerencial"
],
"respuesta": "En **MIS REGISTROS** está todo lo que hiciste (cuentas aprobadas y devueltas, ingresos, adiciones, cesiones…). Elige el periodo y descárgalo en **PDF**, **Excel** o el **informe gerencial**.",
"accion": "ir:misregistros",
"estado": "",
"activo": true,
"orden": 43
},
{
"id": "CN-PERMISOS",
"app": "CONTRATACION",
"vista": "inicio",
"titulo": "¿Qué puede hacer mi usuario?",
"frases": [
"que puedo hacer",
"mi rol",
"soy revisor",
"soy creador",
"no me sale el boton",
"no tengo permiso",
"por que no veo"
],
"respuesta": "{{permisos}}",
"accion": "soporte",
"estado": "",
"activo": true,
"orden": 44
},
{
"id": "CN-FOTO",
"app": "CONTRATACION",
"vista": "",
"titulo": "Cambiar mi foto",
"frases": [
"cambiar mi foto",
"foto de perfil",
"poner foto",
"mi imagen"
],
"respuesta": "Toca tu foto (o tus iniciales) en el saludo, o el menú de tu perfil → **Foto de perfil**. Es la misma en todas las apps de la Alcaldía.",
"accion": "foto",
"estado": "",
"activo": true,
"orden": 45
},
{
"id": "CN-CLAVE",
"app": "CONTRATACION",
"vista": "",
"titulo": "Cambiar mi contraseña",
"frases": [
"cambiar mi contraseña",
"cambiar la clave",
"actualizar contraseña",
"nueva contraseña"
],
"respuesta": "Desde el menú de tu perfil → **Actualizar contraseña**.",
"accion": "clave",
"estado": "",
"activo": true,
"orden": 46
},
{
"id": "CN-INSTALAR",
"app": "CONTRATACION",
"vista": "",
"titulo": "Instalar la app",
"frases": [
"instalar la app",
"poner la app en el celular",
"acceso directo",
"descargar la app"
],
"respuesta": "Puedes instalarla en tu teléfono o computador para abrirla como una app más.",
"accion": "instalar",
"estado": "",
"activo": true,
"orden": 47
},
{
"id": "CN-AVISOS",
"app": "CONTRATACION",
"vista": "",
"titulo": "¿Me llegan los avisos al teléfono?",
"frases": [
"avisos al telefono",
"notificaciones",
"no me llegan avisos",
"activar notificaciones"
],
"respuesta": "{{avisosTelefono}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 48
},
{
"id": "CN-GUIA",
"app": "CONTRATACION",
"vista": "",
"titulo": "Guía rápida en PDF",
"frases": [
"guia rapida",
"manual",
"instructivo",
"como se usa la app",
"tutorial"
],
"respuesta": "Aquí tienes la **guía rápida** de Contratación en PDF.",
"accion": "guia",
"estado": "",
"activo": true,
"orden": 49
},
{
"id": "CN-SOPORTE",
"app": "CONTRATACION",
"vista": "",
"titulo": "Hablar con soporte",
"frases": [
"soporte",
"tengo un problema",
"no funciona",
"reportar un error",
"ayuda tecnica",
"hablar con alguien"
],
"respuesta": "Cuéntale a **soporte** qué pasó: llega al equipo de desarrollo y te responden en la app.",
"accion": "soporte",
"estado": "",
"activo": true,
"orden": 50
},
{
"id": "CNE-OLVIDE",
"app": "CONTRATACION",
"vista": "entrada",
"titulo": "Olvidé mi contraseña",
"frases": [
"olvide mi contraseña",
"no me acuerdo la clave",
"recuperar contraseña",
"perdi la contraseña",
"clave incorrecta"
],
"respuesta": "Escribe tu **documento** y toca **Olvidé mi contraseña**: te llega una nueva por WhatsApp.",
"accion": "olvide",
"estado": "",
"activo": true,
"orden": 51
},
{
"id": "CNE-ENTRAR",
"app": "CONTRATACION",
"vista": "entrada",
"titulo": "¿Cómo entro?",
"frases": [
"como entro",
"como ingreso",
"iniciar sesion",
"no puedo entrar",
"usuario y contraseña"
],
"respuesta": "Entra con tu **documento** (sin puntos) y tu **contraseña**. Si no la tienes o no te funciona, usa **Olvidé mi contraseña**.",
"accion": "documento",
"estado": "",
"activo": true,
"orden": 52
},
{
"id": "CNE-ACCESO",
"app": "CONTRATACION",
"vista": "entrada",
"titulo": "No tengo acceso a Contratación",
"frases": [
"no tengo acceso",
"no tengo usuario",
"me dice que no tengo permiso",
"soy nuevo en contratacion",
"crear usuario"
],
"respuesta": "Los usuarios de Contratación (revisores y creadores) los crea el **administrador** del ecosistema. Pídeselo indicando tu nombre y documento. Si eres contratista, tu app es **Contratista**, no esta.",
"accion": "",
"estado": "",
"activo": true,
"orden": 53
},
{
"id": "CNE-INSTALAR",
"app": "CONTRATACION",
"vista": "entrada",
"titulo": "Instalar la app",
"frases": [
"instalar la app",
"poner la app en el celular",
"descargar la app",
"acceso directo"
],
"respuesta": "Puedes instalarla en tu teléfono o computador para abrirla como una app más.",
"accion": "instalar",
"estado": "",
"activo": true,
"orden": 54
},
{
"id": "CNE-QUE-ES",
"app": "CONTRATACION",
"vista": "entrada",
"titulo": "¿Para qué sirve esta app?",
"frases": [
"para que sirve",
"que es esta app",
"que hago aqui",
"que es contratacion"
],
"respuesta": "**Contratación** es la app de la Oficina de Contratación: registrar contratos, adiciones, cesiones y suspensiones, revisar y aprobar las cuentas que ya revisó el supervisor y responder lo que piden los contratistas.",
"accion": "",
"estado": "",
"activo": true,
"orden": 55
}
];
