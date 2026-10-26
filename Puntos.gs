/**
 * Puntos.gs - BitFix v3
 * Loyalty points awarding, manual point registration, redemption, and balance recalculation.
 */

/**
 * Recalculates and updates the materialized SaldoPuntos for a given phone number.
 * @param {string} telefono
 */
function recalculateSaldoPuntos(telefono) {
  if (!telefono) return;
  var telClean = String(telefono).trim();

  var movs = readSheetAsObjects('MovimientosPuntos');
  var userMovs = movs.filter(function(m) { return String(m.Telefono).trim() === telClean; });

  var totalSaldo = 0;
  userMovs.forEach(function(m) {
    totalSaldo += Number(m.Puntos || 0);
  });

  var saldos = readSheetAsObjects('SaldoPuntos');
  var salRow = saldos.find(function(s) { return String(s.Telefono).trim() === telClean; });

  if (salRow && salRow._rowIndex) {
    updateRowObject('SaldoPuntos', salRow._rowIndex, {
      Saldo: totalSaldo
    });
  } else {
    appendRowObject('SaldoPuntos', {
      Telefono: telClean,
      Saldo: totalSaldo
    });
  }
}

/**
 * Automatically awards points for a delivered service based on TablaPuntos rules.
 * Triggered when DetalleOrden.Estatus = "Entregado".
 *
 * @param {string} servicioId
 * @param {boolean} skipLock Optional flag if caller already holds ScriptLock
 */
function otorgarPuntosPorServicio(servicioId, skipLock) {
  if (!servicioId) return;

  var runLogic = function() {
    var servicios = readSheetAsObjects('Servicios');
    var srv = servicios.find(function(s) { return String(s.ServicioID) === String(servicioId); });
    if (!srv) return;

    var detalles = readSheetAsObjects('DetalleOrden');
    var det = detalles.find(function(d) { return String(d.DetalleID) === String(srv.DetalleID); });
    if (!det) return;

    var ordenes = readSheetAsObjects('OrdenServicio');
    var ord = ordenes.find(function(o) { return String(o.OrdenID) === String(det.OrdenID); });
    if (!ord) return;

    var telClean = String(ord.Telefono).trim();

    // Check if points were already awarded for this service to ensure idempotency
    var movs = readSheetAsObjects('MovimientosPuntos');
    var yaOtorgado = movs.some(function(m) {
      return String(m.Telefono).trim() === telClean && String(m.Concepto).indexOf(servicioId) !== -1;
    });

    if (yaOtorgado) return;

    // Get points rule for "Servicio Mayor" or default 10
    var tablaPuntos = readSheetAsObjects('TablaPuntos');
    var rule = tablaPuntos.find(function(r) { return String(r.Accion).toLowerCase() === 'servicio mayor'; });
    var pts = rule ? Number(rule.Puntos) : 10;

    var movId = getNextId('MovimientosPuntos', 'MOV');
    var nowStr = formatDate(new Date(), 'dd/MM/yyyy HH:mm');

    appendRowObject('MovimientosPuntos', {
      MovimientoID: movId,
      Telefono: telClean,
      Fecha: nowStr,
      Puntos: pts,
      Concepto: 'Puntos por Servicio Finalizado: ' + servicioId
    });

    recalculateSaldoPuntos(telClean);
  };

  if (skipLock) {
    runLogic();
  } else {
    withLock(runLogic);
  }
}

/**
 * Registers manual points addition or redemption for a client.
 * Validates that redeeming points does not result in a negative balance.
 *
 * @param {string} telefono
 * @param {number} puntos
 * @param {string} concepto
 * @returns {Object}
 */
function registrarMovimientoPuntosManual(telefono, puntos, concepto) {
  requireRole(['Administrador', 'Recepcion']);
  if (!telefono || puntos === undefined || isNaN(Number(puntos))) {
    throw new Error('Teléfono y cantidad de puntos válidos son requeridos.');
  }

  var telClean = String(telefono).trim();
  var ptsNum = Number(puntos);

  return withLock(function() {
    // Check current balance if redeeming (negative points)
    if (ptsNum < 0) {
      var saldos = readSheetAsObjects('SaldoPuntos');
      var salRow = saldos.find(function(s) { return String(s.Telefono).trim() === telClean; });
      var saldoActual = salRow ? Number(salRow.Saldo || 0) : 0;

      if (saldoActual + ptsNum < 0) {
        throw new Error('El cliente no cuenta con saldo de puntos suficiente (' + saldoActual + ' disp).');
      }
    }

    var movId = getNextId('MovimientosPuntos', 'MOV');
    var nowStr = formatDate(new Date(), 'dd/MM/yyyy HH:mm');

    appendRowObject('MovimientosPuntos', {
      MovimientoID: movId,
      Telefono: telClean,
      Fecha: nowStr,
      Puntos: ptsNum,
      Concepto: concepto || (ptsNum > 0 ? 'Ajuste manual (+)' : 'Canje de puntos (-)')
    });

    recalculateSaldoPuntos(telClean);

    return {
      success: true,
      movimientoId: movId,
      telefono: telClean
    };
  });
}
