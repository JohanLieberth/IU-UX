/**
 * Tecnicos.gs - BitFix v3
 * Endpoints for technician dashboard, assigned services, activity logging, diagnostic cost editing.
 */

/**
 * Retrieves list of service details assigned to current technician.
 * Also returns sibling equipment in same order (marked as read-only if not assigned to tech).
 *
 * @returns {Array<Object>}
 */
function getMisAsignacionesTecnico() {
  var staff = requireRole(['Tecnico', 'Administrador']);

  var detalles = readSheetAsObjects('DetalleOrden');
  var servicios = readSheetAsObjects('Servicios');
  var equipos = readSheetAsObjects('Equipos');
  var ordenes = readSheetAsObjects('OrdenServicio');
  var clientes = readSheetAsObjects('Clientes');
  var asignaciones = readSheetAsObjects('Asignaciones');

  // Find all service IDs where tech is assigned via Asignaciones or DetalleOrden
  var myServiceIdsMap = {};

  asignaciones.forEach(function(a) {
    if (String(a.TecnicoID) === String(staff.AdminID)) {
      var st = String(a.Estatus || '').toLowerCase();
      if (st === 'asignado' || st === 'en proceso' || st === 'diagnostico' || st === '') {
        myServiceIdsMap[a.ServicioID] = true;
      }
    }
  });

  detalles.forEach(function(d) {
    if (String(d.TecnicoAsignadoID) === String(staff.AdminID)) {
      var srv = servicios.find(function(s) { return String(s.DetalleID) === String(d.DetalleID); });
      if (srv) {
        myServiceIdsMap[srv.ServicioID] = true;
      }
    }
  });

  // Find all orders that contain at least one device assigned to this tech
  var myOrderIdsMap = {};
  detalles.forEach(function(d) {
    var srv = servicios.find(function(s) { return String(s.DetalleID) === String(d.DetalleID); });
    if (srv && myServiceIdsMap[srv.ServicioID]) {
      myOrderIdsMap[d.OrdenID] = true;
    }
  });

  // Build items list
  var result = [];
  detalles.forEach(function(d) {
    if (myOrderIdsMap[d.OrdenID]) {
      var srv = servicios.find(function(s) { return String(s.DetalleID) === String(d.DetalleID); });
      var eq = equipos.find(function(e) { return String(e.EquipoID) === String(d.EquipoID); });
      var ord = ordenes.find(function(o) { return String(o.OrdenID) === String(d.OrdenID); });
      var cli = ord ? clientes.find(function(c) { return String(c.Telefono) === String(ord.Telefono); }) : null;

      var isMine = srv ? Boolean(myServiceIdsMap[srv.ServicioID]) : false;

      result.push({
        DetalleID: d.DetalleID,
        OrdenID: d.OrdenID,
        ServicioID: srv ? srv.ServicioID : '',
        ClienteNombre: cli ? cli.Nombre : 'N/A',
        ClienteTelefono: cli ? cli.Telefono : '',
        TipoCliente: cli ? cli.TipoCliente : 'Cliente',
        EquipoTipo: eq ? eq.Tipo : '',
        EquipoMarca: eq ? eq.Marca : '',
        EquipoModelo: eq ? eq.Modelo : '',
        NoSerie: eq ? eq.NoSerie : '',
        FallaReportada: srv ? srv.FallaReportada : '',
        Diagnostico: srv ? srv.Diagnostico : '',
        Solucion: srv ? srv.Solucion : '',
        CostoDiagnostico: srv ? srv.CostoDiagnostico : 0,
        CostoFinal: srv ? srv.CostoFinal : 0,
        EstatusDetalle: d.Estatus,
        TecnicoAsignadoID: d.TecnicoAsignadoID,
        IsMine: isMine
      });
    }
  });

  return result;
}

/**
 * Logs time spent by technician on a service and adds to total hours.
 * @param {string} servicioId
 * @param {string} accion
 * @param {number} minutos
 * @returns {Object}
 */
function registrarActividadTecnico(servicioId, accion, minutos) {
  var staff = requireRole(['Tecnico', 'Administrador']);
  if (!servicioId || !minutos || isNaN(Number(minutos))) {
    throw new Error('Servicio ID y minutos válidos son requeridos.');
  }

  return withLock(function() {
    var actId = getNextId('ActividadesTecnico', 'ACT');
    var nowStr = formatDate(new Date(), 'dd/MM/yyyy HH:mm');
    var minsNum = Number(minutos);

    appendRowObject('ActividadesTecnico', {
      ActividadID: actId,
      TecnicoID: staff.AdminID,
      ServicioID: servicioId,
      Fecha: nowStr,
      Accion: accion || 'Trabajo técnico',
      Minutos: minsNum
    });

    // Add to active assignment hours
    var asignaciones = readSheetAsObjects('Asignaciones');
    var asig = asignaciones.find(function(a) {
      return String(a.ServicioID) === String(servicioId) && String(a.TecnicoID) === String(staff.AdminID);
    });

    if (asig && asig._rowIndex) {
      var currentHrs = Number(asig.HorasInvertidas || 0);
      var addedHrs = minsNum / 60;
      updateRowObject('Asignaciones', asig._rowIndex, {
        HorasInvertidas: (currentHrs + addedHrs).toFixed(2)
      });
    }

    return {
      success: true,
      actividadId: actId
    };
  });
}

/**
 * Updates diagnostic cost and reported fault (allowed while in Diagnostico status).
 * @param {string} servicioId
 * @param {number} costoDiagnostico
 * @param {string} fallaReportada
 * @param {string} diagnosticoTexto
 * @returns {Object}
 */
function actualizarDiagnosticoTecnico(servicioId, costoDiagnostico, fallaReportada, diagnosticoTexto) {
  requireRole(['Tecnico', 'Administrador']);

  return withLock(function() {
    var servicios = readSheetAsObjects('Servicios');
    var srv = servicios.find(function(s) { return String(s.ServicioID) === String(servicioId); });
    if (!srv || !srv._rowIndex) {
      throw new Error('Servicio no encontrado: ' + servicioId);
    }

    var updateObj = {};
    if (costoDiagnostico !== undefined && !isNaN(Number(costoDiagnostico))) {
      updateObj.CostoDiagnostico = Number(costoDiagnostico);
    }
    if (fallaReportada !== undefined) {
      updateObj.FallaReportada = fallaReportada;
    }
    if (diagnosticoTexto !== undefined) {
      updateObj.Diagnostico = diagnosticoTexto;
    }

    updateRowObject('Servicios', srv._rowIndex, updateObj);

    // Recalculate parent order totals
    var detalles = readSheetAsObjects('DetalleOrden');
    var det = detalles.find(function(d) { return String(d.DetalleID) === String(srv.DetalleID); });
    if (det) {
      recalculateOrderTotals(det.OrdenID);
    }

    return { success: true };
  });
}
