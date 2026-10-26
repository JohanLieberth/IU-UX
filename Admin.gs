/**
 * Admin.gs - BitFix v3
 * Endpoints for Administrator dashboard, order list filtering, full detail inspector, and user searches.
 */

/**
 * Returns list of orders formatted for the main admin table.
 * Filterable by query, status, client type, technician, and date range.
 * Excludes soft-deleted orders.
 *
 * Column rules for main table:
 * | OrdenID | Fecha/Hora | Nombre | Equipos | No. Serie | TecnicoID | Estatus | Total | Acciones |
 *
 * @param {Object} filters { search, status, tipoCliente, tecnicoId, fechaInicio, fechaFin }
 * @returns {Array<Object>}
 */
function getOrdenesAdmin(filters) {
  requireRole(['Administrador', 'Recepcion']);
  filters = filters || {};

  var ordenes = readSheetAsObjects('OrdenServicio');
  var clientes = readSheetAsObjects('Clientes');
  var detalles = readSheetAsObjects('DetalleOrden');
  var equipos = readSheetAsObjects('Equipos');
  var servicios = readSheetAsObjects('Servicios');
  var asignaciones = readSheetAsObjects('Asignaciones');

  var clientMap = {};
  clientes.forEach(function(c) { clientMap[String(c.Telefono).trim()] = c; });

  var equipoMap = {};
  equipos.forEach(function(e) { equipoMap[String(e.EquipoID)] = e; });

  var servicioMap = {};
  servicios.forEach(function(s) { servicioMap[String(s.DetalleID)] = s; });

  var result = [];

  ordenes.forEach(function(ord) {
    if (String(ord.Eliminada).toUpperCase() === 'SI') return;

    var ordDetalles = detalles.filter(function(d) { return String(d.OrdenID) === String(ord.OrdenID); });
    var cli = clientMap[String(ord.Telefono).trim()] || { Nombre: 'Desconocido', TipoCliente: 'Cliente' };

    var equipoStrList = [];
    var noSerieList = [];
    var tecSet = {};
    var totalServicios = 0;

    ordDetalles.forEach(function(det) {
      var eq = equipoMap[String(det.EquipoID)];
      if (eq) {
        equipoStrList.push((eq.Marca || '') + ' ' + (eq.Modelo || ''));
        if (eq.NoSerie) noSerieList.push(eq.NoSerie);
      }

      var srv = servicioMap[String(det.DetalleID)];
      if (srv && srv.CostoFinal && !isNaN(Number(srv.CostoFinal))) {
        totalServicios += Number(srv.CostoFinal);
      }

      if (det.TecnicoAsignadoID) {
        tecSet[det.TecnicoAsignadoID] = true;
      }

      var asigs = asignaciones.filter(function(a) { return srv && String(a.ServicioID) === String(srv.ServicioID); });
      asigs.forEach(function(a) {
        if (a.TecnicoID) tecSet[a.TecnicoID] = true;
      });
    });

    var tecsJoined = Object.keys(tecSet).join(', ') || 'Sin asignar';
    var totalCalculado = (ord.TotalFinal !== '' && ord.TotalFinal !== null && !isNaN(Number(ord.TotalFinal))) ? Number(ord.TotalFinal) : totalServicios;

    var item = {
      OrdenID: ord.OrdenID,
      FechaHora: ord.FechaHoraRecepcion || ord.FechaRecepcion,
      Telefono: ord.Telefono,
      NombreCliente: cli.Nombre,
      TipoCliente: cli.TipoCliente || 'Cliente',
      EquiposConcat: equipoStrList.join(' · '),
      NoSerieConcat: noSerieList.join(' · ') || 'N/A',
      TecnicosConcat: tecsJoined,
      EstatusGeneral: ord.EstatusGeneral || 'Abierta',
      TotalFinal: totalCalculado,
      DetallesCount: ordDetalles.length
    };

    // Apply search filters
    var match = true;
    if (filters.search) {
      var q = String(filters.search).toLowerCase();
      var inOrd = String(item.OrdenID).toLowerCase().indexOf(q) !== -1;
      var inNom = String(item.NombreCliente).toLowerCase().indexOf(q) !== -1;
      var inTel = String(item.Telefono).toLowerCase().indexOf(q) !== -1;
      var inSer = String(item.NoSerieConcat).toLowerCase().indexOf(q) !== -1;
      if (!inOrd && !inNom && !inTel && !inSer) match = false;
    }

    if (filters.status && filters.status !== 'TODOS') {
      if (String(item.EstatusGeneral).toLowerCase() !== String(filters.status).toLowerCase()) match = false;
    }

    if (filters.tipoCliente && filters.tipoCliente !== 'TODOS') {
      if (String(item.TipoCliente).toLowerCase() !== String(filters.tipoCliente).toLowerCase()) match = false;
    }

    if (filters.tecnicoId && filters.tecnicoId !== 'TODOS') {
      if (item.TecnicosConcat.indexOf(filters.tecnicoId) === -1) match = false;
    }

    if (match) {
      result.push(item);
    }
  });

  // Sort descending by OrdenID
  result.sort(function(a, b) {
    return String(b.OrdenID).localeCompare(String(a.OrdenID));
  });

  return result;
}

/**
 * Returns full breakdown of an order for detail inspector modal.
 * @param {string} ordenId
 * @returns {Object}
 */
function getDetalleCompletoOrden(ordenId) {
  requireRole(['Administrador', 'Recepcion']);
  if (!ordenId) throw new Error('OrdenID requerido.');

  var ordenes = readSheetAsObjects('OrdenServicio');
  var ord = ordenes.find(function(o) { return String(o.OrdenID) === String(ordenId); });
  if (!ord) throw new Error('Orden no encontrada: ' + ordenId);

  var clientes = readSheetAsObjects('Clientes');
  var cli = clientes.find(function(c) { return String(c.Telefono).trim() === String(ord.Telefono).trim(); }) || {
    Nombre: 'N/A', Telefono: ord.Telefono, Correo: '', TipoCliente: 'Cliente'
  };

  var detalles = readSheetAsObjects('DetalleOrden').filter(function(d) { return String(d.OrdenID) === String(ordenId); });
  var equipos = readSheetAsObjects('Equipos');
  var servicios = readSheetAsObjects('Servicios');
  var asignaciones = readSheetAsObjects('Asignaciones');
  var historial = readSheetAsObjects('HistorialServicio');
  var pagos = readSheetAsObjects('Pagos').filter(function(p) { return String(p.OrdenID) === String(ordenId); });
  var admins = readSheetAsObjects('Admins');

  var tecsDisponibles = admins.filter(function(a) { return a.Rol === 'Tecnico' || a.Rol === 'Administrador'; });

  var totalPagado = 0;
  pagos.forEach(function(p) { totalPagado += Number(p.Importe || 0); });

  var totalFinal = Number(ord.TotalFinal || 0);
  var saldoPendiente = Math.max(0, totalFinal - totalPagado);

  var dispositivos = detalles.map(function(det) {
    var eq = equipos.find(function(e) { return String(e.EquipoID) === String(det.EquipoID); }) || {};
    var srv = servicios.find(function(s) { return String(s.DetalleID) === String(det.DetalleID); }) || {};

    var meAsigs = asignaciones.filter(function(a) { return String(a.ServicioID) === String(srv.ServicioID); });
    var tecIds = meAsigs.map(function(a) { return a.TecnicoID; });
    if (det.TecnicoAsignadoID && tecIds.indexOf(det.TecnicoAsignadoID) === -1) {
      tecIds.unshift(det.TecnicoAsignadoID);
    }

    var hst = historial.filter(function(h) { return String(h.ServicioID) === String(srv.ServicioID); });

    return {
      DetalleID: det.DetalleID,
      EquipoID: det.EquipoID,
      Tipo: eq.Tipo || 'Dispositivo',
      Marca: eq.Marca || '',
      Modelo: eq.Modelo || '',
      NoSerie: eq.NoSerie || '',
      Estatus: det.Estatus,
      ServicioID: srv.ServicioID,
      Diagnostico: srv.Diagnostico || '',
      Solucion: srv.Solucion || '',
      GarantiaDias: srv.GarantiaDias || 0,
      CostoDiagnostico: srv.CostoDiagnostico || 0,
      CostoFinal: srv.CostoFinal || 0,
      FallaReportada: srv.FallaReportada || '',
      ListoParaRecoleccion: srv.ListoParaRecoleccion || 'No',
      FechaEntregado: det.FechaEntregado || '',
      Entregado: det.Entregado || 'No',
      TecnicoAsignadoID: det.TecnicoAsignadoID,
      TecnicosAsignados: tecIds.join(', ') || 'Sin asignar',
      Historial: hst
    };
  });

  return {
    OrdenID: ord.OrdenID,
    FechaHora: ord.FechaHoraRecepcion || ord.FechaRecepcion,
    EstatusGeneral: ord.EstatusGeneral,
    CostoEstimado: ord.CostoEstimado || 0,
    TotalFinal: totalFinal,
    TotalPagado: totalPagado,
    SaldoPendiente: saldoPendiente,
    Cliente: cli,
    Dispositivos: dispositivos,
    Pagos: pagos,
    TecnicosDisponibles: tecsDisponibles
  };
}

/**
 * Searches users by phone or name for user lookup section.
 * @param {string} query
 * @returns {Array<Object>}
 */
function buscarUsuarioAdmin(query) {
  requireRole(['Administrador', 'Recepcion']);
  if (!query) return [];

  var q = String(query).toLowerCase().trim();
  var clientes = readSheetAsObjects('Clientes');
  var nfcs = readSheetAsObjects('NFC');
  var saldos = readSheetAsObjects('SaldoPuntos');
  var ordenes = readSheetAsObjects('OrdenServicio');
  var equipos = readSheetAsObjects('Equipos');

  var results = [];

  clientes.forEach(function(c) {
    var tel = String(c.Telefono).trim();
    var nom = String(c.Nombre).toLowerCase();

    if (tel.indexOf(q) !== -1 || nom.indexOf(q) !== -1) {
      var nfcList = nfcs.filter(function(n) { return String(n.TelefonoCliente).trim() === tel; });
      var sal = saldos.find(function(s) { return String(s.Telefono).trim() === tel; });
      var myOrds = ordenes.filter(function(o) { return String(o.Telefono).trim() === tel; });
      var myEqs = equipos.filter(function(e) { return String(e.Telefono).trim() === tel; });

      results.push({
        Telefono: c.Telefono,
        Nombre: c.Nombre,
        Correo: c.Correo,
        TipoCliente: c.TipoCliente || 'Cliente',
        SaldoPuntos: sal ? Number(sal.Saldo || 0) : 0,
        NFC_UIDs: nfcList.map(function(n) { return n.UID; }),
        OrdenesCount: myOrds.length,
        EquiposCount: myEqs.length
      });
    }
  });

  return results;
}
