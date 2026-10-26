/**
 * Notificaciones.gs - BitFix v3
 * Centralized email sending service, template interpolation, idempotency checking, and NotificacionesLog tracking.
 */

/**
 * Sends email using GmailApp and logs outcome in NotificacionesLog.
 * Checks idempotency for 'ListoRecoleccion' type.
 *
 * @param {string} telefono
 * @param {string} ordenId
 * @param {string} tipo 'Bienvenida' | 'RecepcionEquipo' | 'ListoRecoleccion' | 'ReenvioManual' | 'CambioEstatus'
 * @param {Object} overrides { destinatario, asunto, cuerpo, ServicioID, Equipo, NoSerie, ForzarReenvio }
 * @returns {Object}
 */
function enviarCorreo_(telefono, ordenId, tipo, overrides) {
  overrides = overrides || {};
  var telClean = String(telefono || '').trim();

  // 1. Determine recipient email address
  var destinatario = overrides.destinatario;
  var clienteNombre = 'Cliente';

  if (telClean) {
    var clientes = readSheetAsObjects('Clientes');
    var cli = clientes.find(function(c) { return String(c.Telefono).trim() === telClean; });
    if (cli) {
      if (!destinatario) destinatario = cli.Correo;
      if (cli.Nombre) clienteNombre = cli.Nombre;
    }
  }

  if (!destinatario || String(destinatario).trim() === '') {
    logNotificacion_(telClean, ordenId, tipo, '', '', 'Error', 'Sin dirección de correo electrónico.');
    throw new Error('El cliente no tiene una dirección de correo registrada.');
  }

  // 2. Check Idempotency for 'ListoRecoleccion' if not explicit manual resend
  if (tipo === 'ListoRecoleccion' && !overrides.ForzarReenvio) {
    var logs = readSheetAsObjects('NotificacionesLog');
    var srvId = overrides.ServicioID || '';
    var yaEnviado = logs.some(function(l) {
      return String(l.Telefono).trim() === telClean &&
             String(l.Tipo) === 'ListoRecoleccion' &&
             String(l.Estado) === 'Enviado' &&
             (srvId ? String(l.MensajeError || '').indexOf(srvId) !== -1 : true);
    });

    if (yaEnviado) {
      console.log('Notificación ListoRecoleccion ya fue enviada previamente para teléfono ' + telClean);
      return { success: true, duplicateSkipped: true };
    }
  }

  // 3. Load Templates and Config Parameters
  var config = readSheetAsObjects('Configuracion');
  var cMap = {};
  config.forEach(function(c) { cMap[c.Parametro] = c.Valor; });

  var tplAsuntoKey = 'TplAsunto_' + tipo;
  var tplCuerpoKey = 'TplCuerpo_' + tipo;

  var asuntoTpl = overrides.asunto || cMap[tplAsuntoKey] || ('BitFix - Notificación de Servicio ' + (ordenId || ''));
  var cuerpoTpl = overrides.cuerpo || cMap[tplCuerpoKey] || ('Hola {Nombre}, tienes una actualización de tu servicio BitFix.');

  // 4. Perform Placeholder Replacements
  var replacements = {
    '{Nombre}': clienteNombre,
    '{Telefono}': telClean,
    '{OrdenID}': ordenId || '',
    '{ServicioID}': overrides.ServicioID || '',
    '{Equipo}': overrides.Equipo || 'tu equipo',
    '{NoSerie}': overrides.NoSerie || 'N/A',
    '{Estatus}': overrides.Estatus || '',
    '{DireccionTaller}': cMap.DireccionTaller || 'Taller BitFix',
    '{URLPortal}': cMap.URLPortal || 'https://bitfix.mx'
  };

  var asuntoFinal = asuntoTpl;
  var cuerpoFinal = cuerpoTpl;

  for (var key in replacements) {
    if (replacements.hasOwnProperty(key)) {
      var val = replacements[key];
      asuntoFinal = asuntoFinal.split(key).join(val);
      cuerpoFinal = cuerpoFinal.split(key).join(val);
    }
  }

  // 5. Wrap in HTML Template
  var htmlBody = '<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">' +
    '<div style="background-color: #6f42c1; color: white; padding: 15px; border-radius: 6px 6px 0 0; text-align: center;">' +
    '<h2 style="margin: 0;">BitFix Reparaciones</h2>' +
    '</div>' +
    '<div style="padding: 20px; line-height: 1.6;">' +
    '<p style="white-space: pre-wrap;">' + cuerpoFinal + '</p>' +
    '</div>' +
    '<div style="border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #777; text-align: center;">' +
    '<p style="margin: 2px;">' + (cMap.DireccionTaller || 'BitFix Taller') + '</p>' +
    '<p style="margin: 2px;"><a href="' + (cMap.URLPortal || '#') + '" style="color: #6f42c1;">Consultar Portal de Clientes</a></p>' +
    '</div>' +
    '</div>';

  // 6. Send via GmailApp and Log
  try {
    GmailApp.sendEmail(destinatario, asuntoFinal, cuerpoFinal, {
      htmlBody: htmlBody,
      name: 'BitFix Reparaciones'
    });

    var infoLogMsg = overrides.ServicioID ? ('ServicioID: ' + overrides.ServicioID) : '';
    logNotificacion_(telClean, ordenId, tipo, destinatario, asuntoFinal, 'Enviado', infoLogMsg);

    return { success: true, estado: 'Enviado' };
  } catch (err) {
    var errMsg = err.toString();
    logNotificacion_(telClean, ordenId, tipo, destinatario, asuntoFinal, 'Error', errMsg);
    console.error('Error enviando correo: ' + errMsg);
    throw new Error('Error enviando correo a ' + destinatario + ': ' + errMsg);
  }
}

/**
 * Manual email resend endpoint called by Admin UI modal.
 * @param {string} ordenId
 * @param {string} destinatario
 * @param {string} asunto
 * @param {string} cuerpo
 * @returns {Object}
 */
function reenviarCorreoManual(ordenId, destinatario, asunto, cuerpo) {
  requireRole(['Administrador', 'Recepcion']);

  var ordenes = readSheetAsObjects('OrdenServicio');
  var ord = ordenes.find(function(o) { return String(o.OrdenID) === String(ordenId); });
  var tel = ord ? ord.Telefono : '';

  return enviarCorreo_(tel, ordenId, 'ReenvioManual', {
    destinatario: destinatario,
    asunto: asunto,
    cuerpo: cuerpo,
    ForzarReenvio: true
  });
}

/**
 * Internal logger into NotificacionesLog sheet.
 */
function logNotificacion_(telefono, ordenId, tipo, destinatario, asunto, estado, mensajeError) {
  try {
    var notifId = getNextId('NotificacionesLog', 'NTF');
    var nowIso = formatISO(new Date());

    appendRowObject('NotificacionesLog', {
      NotifID: notifId,
      FechaHora: nowIso,
      Telefono: telefono || '',
      OrdenID: ordenId || '',
      Tipo: tipo || '',
      Destinatario: destinatario || '',
      Asunto: asunto || '',
      Estado: estado || 'Enviado',
      MensajeError: mensajeError || ''
    });
  } catch (e) {
    console.warn('Error escribiendo en NotificacionesLog: ' + e.toString());
  }
}
