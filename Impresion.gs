/**
 * Impresion.gs - BitFix v3
 * Thermal ticket (58mm) and sticker label (50x30mm) HTML template rendering and audit log.
 */

/**
 * Renders thermal ticket (58mm width) for printing.
 * @param {string} ordenId
 * @param {string} servicioId Optional filter for a single device
 * @returns {HtmlOutput}
 */
function renderComprobante(ordenId, servicioId) {
  requireRole(['Administrador', 'Recepcion', 'Tecnico']);

  var data = getDatosImpresion_(ordenId, servicioId, 'Ticket58mm');
  var tpl = HtmlService.createTemplateFromFile('comprobante');
  tpl.data = data;

  return tpl.evaluate()
    .setTitle('Comprobante Order ' + ordenId)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Renders small device sticker label (50x30mm) with QR code.
 * @param {string} ordenId
 * @param {string} servicioId
 * @returns {HtmlOutput}
 */
function renderEtiqueta(ordenId, servicioId) {
  requireRole(['Administrador', 'Recepcion', 'Tecnico']);

  var data = getDatosImpresion_(ordenId, servicioId, 'Etiqueta50x30');
  var tpl = HtmlService.createTemplateFromFile('etiqueta');
  tpl.data = data;

  return tpl.evaluate()
    .setTitle('Etiqueta Servicio ' + (servicioId || ordenId))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Internal helper to gather order, device, client and payment data for printing and record audit.
 */
function getDatosImpresion_(ordenId, servicioId, tipoImpresion) {
  if (!ordenId) throw new Error('OrdenID requerido para impresión.');
  var staff = getCurrentStaffUser();

  var ordenes = readSheetAsObjects('OrdenServicio');
  var ord = ordenes.find(function(o) { return String(o.OrdenID) === String(ordenId); });
  if (!ord) throw new Error('Orden no encontrada: ' + ordenId);

  var clientes = readSheetAsObjects('Clientes');
  var cli = clientes.find(function(c) { return String(c.Telefono).trim() === String(ord.Telefono).trim(); }) || {
    Nombre: 'Cliente', Telefono: ord.Telefono
  };

  var detalles = readSheetAsObjects('DetalleOrden').filter(function(d) { return String(d.OrdenID) === String(ordenId); });
  var equipos = readSheetAsObjects('Equipos');
  var servicios = readSheetAsObjects('Servicios');
  var pagos = readSheetAsObjects('Pagos').filter(function(p) { return String(p.OrdenID) === String(ordenId); });
  var config = readSheetAsObjects('Configuracion');

  var cMap = {};
  config.forEach(function(c) { cMap[c.Parametro] = c.Valor; });

  var totalPagado = 0;
  pagos.forEach(function(p) { totalPagado += Number(p.Importe || 0); });
  var totalOrden = Number(ord.TotalFinal || 0);
  var saldo = Math.max(0, totalOrden - totalPagado);

  var items = [];
  detalles.forEach(function(det) {
    var srv = servicios.find(function(s) { return String(s.DetalleID) === String(det.DetalleID); });
    if (servicioId && srv && String(srv.ServicioID) !== String(servicioId)) {
      return; // Filter specific device if requested
    }

    var eq = equipos.find(function(e) { return String(e.EquipoID) === String(det.EquipoID); }) || {};

    items.push({
      DetalleID: det.DetalleID,
      ServicioID: srv ? srv.ServicioID : '',
      Equipo: (eq.Marca || '') + ' ' + (eq.Modelo || ''),
      Tipo: eq.Tipo || 'Dispositivo',
      NoSerie: eq.NoSerie || 'N/A',
      FallaReportada: srv ? (srv.FallaReportada || 'No especificada') : 'No especificada',
      Diagnostico: srv ? (srv.Diagnostico || 'Pendiente') : 'Pendiente',
      Solucion: srv ? (srv.Solucion || 'Pendiente') : 'Pendiente',
      GarantiaDias: srv ? (srv.GarantiaDias || 0) : 0,
      CostoDiagnostico: srv ? Number(srv.CostoDiagnostico || 0) : 0,
      CostoFinal: srv ? Number(srv.CostoFinal || 0) : 0,
      Estatus: det.Estatus,
      TecnicoID: det.TecnicoAsignadoID || 'N/A'
    });

    // Log print audit in EtiquetasImpresas
    try {
      appendRowObject('EtiquetasImpresas', {
        EtiquetaID: getNextId('EtiquetasImpresas', 'ETQ'),
        OrdenID: ordenId,
        DetalleID: det.DetalleID,
        Tipo: tipoImpresion,
        FechaHora: formatDate(new Date(), 'dd/MM/yyyy HH:mm'),
        AdminID: staff.AdminID
      });
    } catch (e) {
      console.warn('Error registrando auditoría de impresión: ' + e.toString());
    }
  });

  return {
    OrdenID: ord.OrdenID,
    FechaHora: ord.FechaHoraRecepcion || ord.FechaRecepcion,
    ClienteNombre: cli.Nombre,
    ClienteTelefono: cli.Telefono,
    TotalOrden: totalOrden,
    TotalPagado: totalPagado,
    Saldo: saldo,
    URLPortal: cMap.URLPortal || 'https://bitfix.mx',
    DireccionTaller: cMap.DireccionTaller || 'Taller BitFix',
    Items: items
  };
}
