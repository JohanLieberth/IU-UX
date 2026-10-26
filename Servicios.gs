/**
 * Servicios.gs - BitFix v3
 * Service status management, multi-technician assignment logic, points triggering.
 */

/**
 * Updates the status of a DetalleOrden / Servicio.
 * If status is "Listo para Recoleccion": sets ListoParaRecoleccion = "Si", sends email.
 * If status is "Entregado": awards points via otorgarPuntosPorServicio(servicioId).
 * Always logs to HistorialServicio and recalculates order status & totals.
 *
 * @param {string} detalleId
 * @param {string} nuevoEstatus
 * @param {Object} extraData { solucion, costoDiagnostico, costoFinal, fallaReportada, garantiaDias }
 * @returns {Object}
 */
function actualizarEstatusDetalle(detalleId, nuevoEstatus, extraData) {
  var staff = getCurrentStaffUser();
  extraData = extraData || {};

  return withLock(function() {
    var detalles = readSheetAsObjects('DetalleOrden');
    var det = detalles.find(function(d) { return String(d.DetalleID) === String(detalleId); });

    if (!det || !det._rowIndex) {
      throw new Error('Detalle de orden no encontrado: ' + detalleId);
    }

    var servicios = readSheetAsObjects('Servicios');
    var srv = servicios.find(function(s) { return String(s.DetalleID) === String(detalleId); });

    if (!srv || !srv._rowIndex) {
      throw new Error('Servicio no encontrado para el detalle: ' + detalleId);
    }

    // Check role/permissions if staff is Technician
    if (staff.Rol === 'Tecnico') {
      var asignaciones = readSheetAsObjects('Asignaciones');
      var isAssigned = (String(det.TecnicoAsignadoID) === String(staff.AdminID)) ||
        asignaciones.some(function(a) {
          return String(a.ServicioID) === String(srv.ServicioID) && String(a.TecnicoID) === String(staff.AdminID);
        });

      if (!isAssigned) {
        throw new Error('No tienes permiso para modificar este dispositivo ya que no estás asignado.');
      }
    }

    var nowStr = formatDate(new Date(), 'dd/MM/yyyy HH:mm');
    var updateDet = { Estatus: nuevoEstatus };
    var updateSrv = {};

    if (extraData.solucion !== undefined) updateSrv.Solucion = extraData.solucion;
    if (extraData.costoDiagnostico !== undefined && staff.Rol === 'Tecnico') updateSrv.CostoDiagnostico = extraData.costoDiagnostico;
    if (extraData.costoFinal !== undefined && (staff.Rol === 'Administrador' || staff.Rol === 'Recepcion')) updateSrv.CostoFinal = extraData.costoFinal;
    if (extraData.fallaReportada !== undefined) updateSrv.FallaReportada = extraData.fallaReportada;
    if (extraData.garantiaDias !== undefined) updateSrv.GarantiaDias = extraData.garantiaDias;

    // Status specific actions
    if (nuevoEstatus === 'Listo para Recoleccion') {
      updateSrv.ListoParaRecoleccion = 'Si';

      // Auto email trigger if not previously sent
      try {
        var ordenes = readSheetAsObjects('OrdenServicio');
        var ord = ordenes.find(function(o) { return String(o.OrdenID) === String(det.OrdenID); });
        var equipos = readSheetAsObjects('Equipos');
        var eq = equipos.find(function(e) { return String(e.EquipoID) === String(det.EquipoID); });

        if (ord && eq) {
          enviarCorreo_(ord.Telefono, ord.OrdenID, 'ListoRecoleccion', {
            ServicioID: srv.ServicioID,
            Equipo: eq.Marca + ' ' + eq.Modelo,
            NoSerie: eq.NoSerie || 'N/A'
          });
        }
      } catch (e) {
        console.warn('Error al enviar notificación ListoRecoleccion: ' + e.toString());
      }
    } else if (nuevoEstatus === 'Entregado') {
      updateDet.Entregado = 'Si';
      updateDet.FechaEntregado = nowStr;

      // Award points for delivered service (skip lock since withLock is active)
      try {
        otorgarPuntosPorServicio(srv.ServicioID, true);
      } catch (e) {
        console.warn('Error al otorgar puntos por servicio: ' + e.toString());
      }
    }

    // Apply updates
    updateRowObject('DetalleOrden', det._rowIndex, updateDet);
    if (Object.keys(updateSrv).length > 0) {
      updateRowObject('Servicios', srv._rowIndex, updateSrv);
    }

    // Log HistorialServicio
    appendRowObject('HistorialServicio', {
      HistorialID: getNextId('HistorialServicio', 'HST'),
      ServicioID: srv.ServicioID,
      Fecha: nowStr,
      Estatus: nuevoEstatus,
      Usuario: staff.AdminID + ' (' + staff.Nombre + ')'
    });

    // Recalculate parent order total and general status
    recalculateOrderTotals(det.OrdenID);

    return {
      success: true,
      detalleId: detalleId,
      nuevoEstatus: nuevoEstatus
    };
  });
}

/**
 * Reassigns or adds a technician to a service detail.
 * Creates new record in Asignaciones table and updates DetalleOrden.TecnicoAsignadoID.
 *
 * @param {string} detalleId
 * @param {string} tecnicoId
 * @param {boolean} isPrimary
 * @returns {Object}
 */
function reasignarTecnico(detalleId, tecnicoId, isPrimary) {
  requireRole(['Administrador', 'Recepcion']);

  return withLock(function() {
    var staff = getCurrentStaffUser();
    var detalles = readSheetAsObjects('DetalleOrden');
    var det = detalles.find(function(d) { return String(d.DetalleID) === String(detalleId); });

    if (!det || !det._rowIndex) {
      throw new Error('Detalle no encontrado: ' + detalleId);
    }

    var servicios = readSheetAsObjects('Servicios');
    var srv = servicios.find(function(s) { return String(s.DetalleID) === String(detalleId); });
    if (!srv) {
      throw new Error('Servicio no encontrado para el detalle: ' + detalleId);
    }

    var nowStr = formatDate(new Date(), 'dd/MM/yyyy HH:mm');

    // Insert new assignment record
    var asigId = getNextId('Asignaciones', 'ASG');
    appendRowObject('Asignaciones', {
      AsignacionID: asigId,
      ServicioID: srv.ServicioID,
      TecnicoID: tecnicoId,
      FechaAsignacion: nowStr,
      Estatus: 'Asignado',
      HorasInvertidas: 0
    });

    // Update main TecnicoAsignadoID if primary or unset
    if (isPrimary || !det.TecnicoAsignadoID) {
      updateRowObject('DetalleOrden', det._rowIndex, {
        TecnicoAsignadoID: tecnicoId
      });
    }

    // Log in HistorialServicio
    appendRowObject('HistorialServicio', {
      HistorialID: getNextId('HistorialServicio', 'HST'),
      ServicioID: srv.ServicioID,
      Fecha: nowStr,
      Estatus: 'Reasignado a ' + tecnicoId,
      Usuario: staff.AdminID + ' (' + staff.Nombre + ')'
    });

    return {
      success: true,
      asigId: asigId,
      tecnicoId: tecnicoId
    };
  });
}
