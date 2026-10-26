/**
 * setup.gs - BitFix v3
 * Schema setup, database initialization, seed configuration, and custom menu.
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('BitFix')
    .addItem('Inicializar sistema', 'setupSchema')
    .addItem('Abrir Web App', 'abrirWebApp')
    .addToUi();
}

function abrirWebApp() {
  var url = ScriptApp.getService().getUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert('La aplicación web no ha sido desplegada aún.');
    return;
  }
  var html = HtmlService.createHtmlOutput('<script>window.open("' + url + '", "_blank");google.script.host.close();</script>')
    .setWidth(300).setHeight(100);
  SpreadsheetApp.getUi().showModalDialog(html, 'Abriendo BitFix Web App...');
}

/**
 * Idempotent schema initialization function.
 * Creates missing sheets, ensures expected columns exist, and seeds configuration.
 */
function setupSchema() {
  withLock(function() {
    var ss = getSpreadsheet();

    // Schema definition for expected sheets and their mandatory columns
    var schema = {
      'Clientes': ['Telefono', 'Nombre', 'Correo', 'TipoCliente'],
      'UsuariosPortal': ['UsuarioID', 'Telefono', 'Password', 'Activo', 'PasswordHash', 'FechaRegistro'],
      'Equipos': ['EquipoID', 'Telefono', 'Tipo', 'Marca', 'Modelo', 'NoSerie'],
      'OrdenServicio': ['OrdenID', 'Telefono', 'FechaRecepcion', 'EstatusGeneral', 'FechaHoraRecepcion', 'CostoEstimado', 'TotalFinal', 'Eliminada', 'FechaEliminacion', 'AdminID'],
      'DetalleOrden': ['DetalleID', 'OrdenID', 'EquipoID', 'Estatus', 'FechaEntregado', 'Entregado', 'TecnicoAsignadoID'],
      'Servicios': ['ServicioID', 'DetalleID', 'Diagnostico', 'Solucion', 'GarantiaDias', 'CostoDiagnostico', 'CostoFinal', 'FallaReportada', 'ListoParaRecoleccion'],
      'Asignaciones': ['AsignacionID', 'ServicioID', 'TecnicoID', 'FechaAsignacion', 'Estatus', 'HorasInvertidas'],
      'ActividadesTecnico': ['ActividadID', 'TecnicoID', 'ServicioID', 'Fecha', 'Accion', 'Minutos'],
      'HistorialServicio': ['HistorialID', 'ServicioID', 'Fecha', 'Estatus', 'Usuario'],
      'Pagos': ['PagoID', 'OrdenID', 'Fecha', 'Importe', 'Concepto'],
      'NFC': ['NFC_ID', 'UID', 'TelefonoCliente'],
      'MovimientosPuntos': ['MovimientoID', 'Telefono', 'Fecha', 'Puntos', 'Concepto'],
      'SaldoPuntos': ['Telefono', 'Saldo'],
      'Talleres': ['Telefono', 'RazonSocial', 'RFC', 'Direccion'],
      'Admins': ['AdminID', 'Nombre', 'Rol', 'Email'],
      'TablaPuntos': ['Accion', 'Puntos'],
      'Configuracion': ['Parametro', 'Valor'],
      'NotificacionesLog': ['NotifID', 'FechaHora', 'Telefono', 'OrdenID', 'Tipo', 'Destinatario', 'Asunto', 'Estado', 'MensajeError'],
      'EtiquetasImpresas': ['EtiquetaID', 'OrdenID', 'DetalleID', 'Tipo', 'FechaHora', 'AdminID']
    };

    for (var sheetName in schema) {
      if (schema.hasOwnProperty(sheetName)) {
        var sheet = ss.getSheetByName(sheetName);
        var expectedCols = schema[sheetName];

        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
          sheet.appendRow(expectedCols);
        } else {
          var lastCol = sheet.getLastColumn();
          var currentCols = [];
          if (lastCol > 0) {
            currentCols = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(c) { return String(c).trim(); });
          } else {
            sheet.appendRow(expectedCols);
            currentCols = expectedCols;
          }

          for (var i = 0; i < expectedCols.length; i++) {
            var col = expectedCols[i];
            if (currentCols.indexOf(col) === -1) {
              var newColIdx = sheet.getLastColumn() + 1;
              sheet.getRange(1, newColIdx).setValue(col);
            }
          }
        }
      }
    }

    seedConfiguracionDefaults_(ss);
    seedTablaPuntosDefaults_(ss);
    seedAdminsDefaults_(ss);

    SpreadsheetApp.getUi().alert('Inicialización de esquema BitFix completada con éxito.');
  });
}

function seedConfiguracionDefaults_(ss) {
  var sheet = ss.getSheetByName('Configuracion');
  var existing = readSheetAsObjects('Configuracion');
  var paramMap = {};
  existing.forEach(function(r) { paramMap[r.Parametro] = true; });

  var defaults = [
    { Parametro: 'URLPortal', Valor: 'https://script.google.com' },
    { Parametro: 'DireccionTaller', Valor: 'Calle 60 #123 x 45 y 47, Centro, Mérida, Yucatán' },
    { Parametro: 'VideoBienvenida', Valor: '' },
    { Parametro: 'TplAsunto_Bienvenida', Valor: 'Bienvenido a BitFix' },
    { Parametro: 'TplCuerpo_Bienvenida', Valor: 'Hola {Nombre}, bienvenido al portal de clientes de BitFix.' },
    { Parametro: 'TplAsunto_RecepcionEquipo', Valor: 'BitFix - Recepción de tu equipo {EquipoID}' },
    { Parametro: 'TplCuerpo_RecepcionEquipo', Valor: 'Hola {Nombre}, hemos recibido tu equipo {Equipo} bajo la orden {OrdenID}.' },
    { Parametro: 'TplAsunto_ListoRecoleccion', Valor: 'BitFix - Tu equipo está listo para recolección' },
    { Parametro: 'TplCuerpo_ListoRecoleccion', Valor: 'Hola {Nombre}, tu equipo {Equipo} (Serie: {NoSerie}) de la orden {OrdenID} y servicio {ServicioID} está listo para ser recogido en {DireccionTaller}.' },
    { Parametro: 'TplAsunto_CambioEstatus', Valor: 'BitFix - Actualización de estatus de tu servicio' },
    { Parametro: 'TplCuerpo_CambioEstatus', Valor: 'Hola {Nombre}, el estatus de tu servicio {ServicioID} ha cambiado a: {Estatus}.' },
    { Parametro: 'TplAsunto_ReenvioManual', Valor: 'BitFix - Actualización de tu servicio {ServicioID}' },
    { Parametro: 'TplCuerpo_ReenvioManual', Valor: 'Hola {Nombre}, te enviamos una actualización de tu servicio {ServicioID}.' }
  ];

  defaults.forEach(function(item) {
    if (!paramMap[item.Parametro]) {
      appendRowObject('Configuracion', item);
    }
  });
}

function seedTablaPuntosDefaults_(ss) {
  var existing = readSheetAsObjects('TablaPuntos');
  var map = {};
  existing.forEach(function(r) { map[r.Accion] = true; });

  var defaults = [
    { Accion: 'Servicio Mayor', Puntos: 10 },
    { Accion: 'Referido', Puntos: 25 }
  ];

  defaults.forEach(function(item) {
    if (!map[item.Accion]) {
      appendRowObject('TablaPuntos', item);
    }
  });
}

function seedAdminsDefaults_(ss) {
  var existing = readSheetAsObjects('Admins');
  if (existing.length === 0) {
    appendRowObject('Admins', { AdminID: 'ADM001', Nombre: 'Administrador Principal', Rol: 'Administrador', Email: Session.getActiveUser().getEmail() || 'admin@bitfix.mx' });
    appendRowObject('Admins', { AdminID: 'ADM003', Nombre: 'Técnico Ejemplo', Rol: 'Tecnico', Email: 'tecnico@bitfix.mx' });
  }
}
