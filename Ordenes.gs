/**
 * Ordenes.gs - BitFix v3
 * Order management, order creation, total calculations, and soft/hard deletes.
 */

/**
 * Recalculates TotalFinal and CostoEstimado for an order based on non-cancelled details and services.
 * Also recalculates EstatusGeneral (e.g. "Entregado Parcial" if mixed).
 * @param {string} ordenId
 */
function recalculateOrderTotals(ordenId) {
  if (!ordenId) return;

  var ordenes = readSheetAsObjects('OrdenServicio');
  var orden = ordenes.find(function(o) { return String(o.OrdenID) === String(ordenId); });
  if (!orden || !orden._rowIndex) return;

  var detalles = readSheetAsObjects('DetalleOrden');
  var ordDetalles = detalles.filter(function(d) { return String(d.OrdenID) === String(ordenId); });

  var servicios = readSheetAsObjects('Servicios');

  var totalEstimado = 0;
  var totalFinal = 0;
  var hasCostoFinalPending = false;

  var statuses = [];

  ordDetalles.forEach(function(det) {
    if (String(det.Estatus).toLowerCase() !== 'cancelado') {
      statuses.push(String(det.Estatus));
      var srv = servicios.find(function(s) { return String(s.DetalleID) === String(det.DetalleID); });
      if (srv) {
        if (srv.CostoDiagnostico && !isNaN(Number(srv.CostoDiagnostico))) {
          totalEstimado += Number(srv.CostoDiagnostico);
        }
        if (srv.CostoFinal !== '' && srv.CostoFinal !== null && srv.CostoFinal !== undefined && !isNaN(Number(srv.CostoFinal))) {
          totalFinal += Number(srv.CostoFinal);
        } else {
          hasCostoFinalPending = true;
        }
      }
    }
  });

  var nuevoEstatusGeneral = orden.EstatusGeneral || 'Abierta';
  if (statuses.length > 0) {
    var numEntregados = statuses.filter(function(st) { return st === 'Entregado'; }).length;
    var numCancelados = statuses.filter(function(st) { return st === 'Cancelado'; }).length;
    var numActivos = statuses.length;

    if (numEntregados === numActivos) {
      nuevoEstatusGeneral = 'Cerrada';
    } else if (numEntregados > 0 && numEntregados < numActivos) {
      nuevoEstatusGeneral = 'Entregado Parcial';
    } else {
      nuevoEstatusGeneral = 'Abierta';
    }
  }

  updateRowObject('OrdenServicio', orden._rowIndex, {
    CostoEstimado: totalEstimado,
    TotalFinal: totalFinal,
    EstatusGeneral: nuevoEstatusGeneral
  });
}

/**
 * Creates a new repair service order with multiple equipment items.
 * @param {Object} data Order submission payload
 * @returns {Object} Created Order details
 */
function crearOrdenServicio(data) {
  requireRole(['Administrador', 'Recepcion']);

  return withLock(function() {
    var ss = getSpreadsheet();
    var staff = getCurrentStaffUser();

    // Ensure Client exists or create
    var telClean = String(data.telefono).trim();
    var clientes = readSheetAsObjects('Clientes');
    var cliente = clientes.find(function(c) { return String(c.Telefono).trim() === telClean; });
    if (!cliente) {
      appendRowObject('Clientes', {
        Telefono: telClean,
        Nombre: data.nombre,
        Correo: data.correo || '',
        TipoCliente: data.tipoCliente || 'Cliente'
      });
    }

    // Create OrdenServicio
    var ordenId = getNextId('OrdenServicio', 'OS');
    var nowStr = formatDate(new Date(), 'dd/MM/yyyy HH:mm');
    var isoStr = formatISO(new Date());

    appendRowObject('OrdenServicio', {
      OrdenID: ordenId,
      Telefono: telClean,
      FechaRecepcion: nowStr,
      EstatusGeneral: 'Abierta',
      FechaHoraRecepcion: isoStr,
      CostoEstimado: 0,
      TotalFinal: 0,
      Eliminada: 'No',
      FechaEliminacion: '',
      AdminID: staff.AdminID
    });

    var items = data.items || [];
    var creados = [];

    items.forEach(function(item) {
      // Create Equipo
      var equipoId = getNextId('Equipos', 'EQ');
      appendRowObject('Equipos', {
        EquipoID: equipoId,
        Telefono: telClean,
        Tipo: item.tipo,
        Marca: item.marca,
        Modelo: item.modelo,
        NoSerie: item.noSerie || ''
      });

      // Create DetalleOrden
      var detalleId = getNextId('DetalleOrden', 'DET');
      var tecId = item.tecnicoId || staff.AdminID;
      appendRowObject('DetalleOrden', {
        DetalleID: detalleId,
        OrdenID: ordenId,
        EquipoID: equipoId,
        Estatus: 'Diagnostico',
        FechaEntregado: '',
        Entregado: 'No',
        TecnicoAsignadoID: tecId
      });

      // Create Servicio
      var servicioId = getNextId('Servicios', 'SRV');
      appendRowObject('Servicios', {
        ServicioID: servicioId,
        DetalleID: detalleId,
        Diagnostico: item.diagnosticoInicial || '',
        Solucion: '',
        GarantiaDias: item.garantiaDias || 0,
        CostoDiagnostico: item.costoDiagnostico || 0,
        CostoFinal: item.costoFinal || 0,
        FallaReportada: item.fallaReportada || item.diagnosticoInicial || '',
        ListoParaRecoleccion: 'No'
      });

      // Create Asignacion
      var asigId = getNextId('Asignaciones', 'ASG');
      appendRowObject('Asignaciones', {
        AsignacionID: asigId,
        ServicioID: servicioId,
        TecnicoID: tecId,
        FechaAsignacion: nowStr,
        Estatus: 'Asignado',
        HorasInvertidas: 0
      });

      // Log HistorialServicio
      appendRowObject('HistorialServicio', {
        HistorialID: getNextId('HistorialServicio', 'HST'),
        ServicioID: servicioId,
        Fecha: nowStr,
        Estatus: 'Diagnostico',
        Usuario: staff.AdminID + ' (' + staff.Nombre + ')'
      });

      creados.push({
        equipoId: equipoId,
        detalleId: detalleId,
        servicioId: servicioId
      });
    });

    recalculateOrderTotals(ordenId);

    // Optional reception email
    try {
      enviarCorreo_(telClean, ordenId, 'RecepcionEquipo', {
        Equipo: items.map(function(i) { return i.marca + ' ' + i.modelo; }).join(', ')
      });
    } catch (e) {
      console.warn('Correo de recepción no enviado: ' + e.toString());
    }

    return {
      success: true,
      ordenId: ordenId,
      itemsCount: creados.length
    };
  });
}

/**
 * Deletes or soft-deletes an order.
 * Soft-delete: sets Eliminada = "Si", FechaEliminacion, AdminID.
 * Hard-delete: allowed only if checkbox marked and order has no recorded payments.
 * @param {string} ordenId
 * @param {boolean} hardDelete
 * @returns {Object}
 */
function eliminarOrden(ordenId, hardDelete) {
  requireRole(['Administrador']);

  return withLock(function() {
    var staff = getCurrentStaffUser();
    var ordenes = readSheetAsObjects('OrdenServicio');
    var ord = ordenes.find(function(o) { return String(o.OrdenID) === String(ordenId); });

    if (!ord) {
      throw new Error('La orden ' + ordenId + ' no existe.');
    }

    var pagos = readSheetAsObjects('Pagos');
    var ordPagos = pagos.filter(function(p) { return String(p.OrdenID) === String(ordenId); });

    if (hardDelete) {
      if (ordPagos.length > 0) {
        throw new Error('No se puede eliminar definitivamente una orden con pagos registrados. Realice un borrado suave.');
      }

      var ss = getSpreadsheet();

      // Remove from OrdenServicio
      var ordSheet = ss.getSheetByName('OrdenServicio');
      if (ord._rowIndex) ordSheet.deleteRow(ord._rowIndex);

      // Remove associated details and services
      var detalles = readSheetAsObjects('DetalleOrden').filter(function(d) { return String(d.OrdenID) === String(ordenId); });
      var detSheet = ss.getSheetByName('DetalleOrden');
      var srvSheet = ss.getSheetByName('Servicios');
      var servicios = readSheetAsObjects('Servicios');

      detalles.forEach(function(det) {
        var srv = servicios.find(function(s) { return String(s.DetalleID) === String(det.DetalleID); });
        if (srv && srv._rowIndex) {
          srvSheet.deleteRow(srv._rowIndex);
        }
        if (det._rowIndex) {
          detSheet.deleteRow(det._rowIndex);
        }
      });

      return { success: true, message: 'Orden ' + ordenId + ' eliminada definitivamente.' };
    } else {
      // Soft Delete
      updateRowObject('OrdenServicio', ord._rowIndex, {
        Eliminada: 'Si',
        FechaEliminacion: formatDate(new Date(), 'dd/MM/yyyy HH:mm'),
        AdminID: staff.AdminID
      });

      // Log in HistorialServicio for associated services
      var detalles = readSheetAsObjects('DetalleOrden').filter(function(d) { return String(d.OrdenID) === String(ordenId); });
      var servicios = readSheetAsObjects('Servicios');
      detalles.forEach(function(det) {
        var srv = servicios.find(function(s) { return String(s.DetalleID) === String(det.DetalleID); });
        if (srv) {
          appendRowObject('HistorialServicio', {
            HistorialID: getNextId('HistorialServicio', 'HST'),
            ServicioID: srv.ServicioID,
            Fecha: formatDate(new Date(), 'dd/MM/yyyy HH:mm'),
            Estatus: 'ELIMINADA',
            Usuario: staff.AdminID + ' (' + staff.Nombre + ')'
          });
        }
      });

      return { success: true, message: 'Orden ' + ordenId + ' enviada a la papelera (soft-delete).' };
    }
  });
}
