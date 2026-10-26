/**
 * Portal.gs - BitFix v3
 * Client self-registration, client portal login endpoints, and full client dashboard metrics.
 */

/**
 * Registers a new client for the online portal.
 * Validates 10-digit phone number, hashes password, inserts into Clientes and UsuariosPortal.
 * Sends welcome notification.
 *
 * @param {Object} data { telefono, nombre, correo, password }
 * @returns {Object} Login session result
 */
function registrarClientePortal(data) {
  data = data || {};
  if (!data.telefono || !data.nombre || !data.password) {
    throw new Error('Teléfono, nombre y contraseña son requeridos.');
  }

  var telClean = String(data.telefono).replace(/\D/g, '');
  if (telClean.length !== 10) {
    throw new Error('El teléfono debe tener exactamente 10 dígitos.');
  }

  return withLock(function() {
    var clientes = readSheetAsObjects('Clientes');
    var cli = clientes.find(function(c) { return String(c.Telefono).trim() === telClean; });

    // Create Clientes entry if not exists
    if (!cli) {
      appendRowObject('Clientes', {
        Telefono: telClean,
        Nombre: data.nombre,
        Correo: data.correo || '',
        TipoCliente: 'Cliente'
      });
    }

    // Check UsuariosPortal
    var usuarios = readSheetAsObjects('UsuariosPortal');
    var usr = usuarios.find(function(u) { return String(u.Telefono).trim() === telClean; });
    if (usr) {
      throw new Error('Ya existe una cuenta registrada para este teléfono. Inicie sesión.');
    }

    var userId = getNextId('UsuariosPortal', 'UP');
    var passHash = hashSHA256(data.password);
    var nowIso = formatISO(new Date());

    appendRowObject('UsuariosPortal', {
      UsuarioID: userId,
      Telefono: telClean,
      Password: '', // Don't store plaintext
      Activo: 'Si',
      PasswordHash: passHash,
      FechaRegistro: nowIso
    });

    // Send welcome email
    try {
      enviarCorreo_(telClean, '', 'Bienvenida', {
        Nombre: data.nombre
      });
    } catch (e) {
      console.warn('Correo de bienvenida no pudo enviarse: ' + e.toString());
    }

    // Auto-login
    return loginCliente(telClean, data.password);
  });
}

/**
 * Retrieves client dashboard data: active/past repair equipment, points balance, points movement log, NFC tags, payments.
 *
 * @param {string} token Session token
 * @returns {Object}
 */
function getPortalDashboard(token) {
  var session = requireClientSession(token);
  var telClean = session.telefono;

  var clientes = readSheetAsObjects('Clientes');
  var cli = clientes.find(function(c) { return String(c.Telefono).trim() === telClean; }) || {
    Telefono: telClean,
    Nombre: session.nombre,
    Correo: session.correo,
    TipoCliente: session.tipoCliente || 'Cliente'
  };

  var ordenes = readSheetAsObjects('OrdenServicio').filter(function(o) {
    return String(o.Telefono).trim() === telClean && String(o.Eliminada).toUpperCase() !== 'SI';
  });

  var orderIdsMap = {};
  ordenes.forEach(function(o) { orderIdsMap[String(o.OrdenID)] = o; });

  var detalles = readSheetAsObjects('DetalleOrden').filter(function(d) {
    return orderIdsMap[String(d.OrdenID)];
  });

  var equipos = readSheetAsObjects('Equipos');
  var servicios = readSheetAsObjects('Servicios');
  var pagos = readSheetAsObjects('Pagos').filter(function(p) { return orderIdsMap[String(p.OrdenID)]; });
  var nfcs = readSheetAsObjects('NFC').filter(function(n) { return String(n.TelefonoCliente).trim() === telClean; });

  var saldos = readSheetAsObjects('SaldoPuntos');
  var salRow = saldos.find(function(s) { return String(s.Telefono).trim() === telClean; });
  var saldoPuntos = salRow ? Number(salRow.Saldo || 0) : 0;

  var movsPuntos = readSheetAsObjects('MovimientosPuntos').filter(function(m) {
    return String(m.Telefono).trim() === telClean;
  });

  // Format repair items for dashboard
  var misEquipos = detalles.map(function(det) {
    var ord = orderIdsMap[String(det.OrdenID)] || {};
    var eq = equipos.find(function(e) { return String(e.EquipoID) === String(det.EquipoID); }) || {};
    var srv = servicios.find(function(s) { return String(s.DetalleID) === String(det.DetalleID); }) || {};

    return {
      OrdenID: det.OrdenID,
      FechaOrden: ord.FechaHoraRecepcion || ord.FechaRecepcion,
      Equipo: (eq.Marca || '') + ' ' + (eq.Modelo || ''),
      Tipo: eq.Tipo || 'Dispositivo',
      NoSerie: eq.NoSerie || 'N/A',
      Estatus: det.Estatus,
      Diagnostico: srv.Diagnostico || 'En proceso',
      Solucion: srv.Solucion || 'En proceso',
      FechaLiberacion: det.FechaEntregado || '',
      CostoFinal: srv.CostoFinal ? '$' + Number(srv.CostoFinal).toFixed(2) : 'Pendiente'
    };
  });

  // Format points log with running balance calculation
  var runningBalance = 0;
  var puntosLog = movsPuntos.map(function(m) {
    var pts = Number(m.Puntos || 0);
    runningBalance += pts;
    return {
      Fecha: m.Fecha,
      Puntos: pts,
      Concepto: m.Concepto,
      SaldoAcumulado: runningBalance
    };
  });

  return {
    Cliente: cli,
    MisEquipos: misEquipos,
    SaldoPuntos: saldoPuntos,
    MovimientosPuntos: puntosLog,
    NFC_UIDs: nfcs.map(function(n) { return n.UID; }),
    Pagos: pagos
  };
}
