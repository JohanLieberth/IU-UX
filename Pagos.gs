/**
 * Pagos.gs - BitFix v3
 * Payment registration and query endpoints per service order.
 */

/**
 * Registers a payment against an order ID and recalculates totals and balances.
 *
 * @param {string} ordenId
 * @param {number} importe
 * @param {string} concepto
 * @returns {Object}
 */
function registrarPagoOrden(ordenId, importe, concepto) {
  requireRole(['Administrador', 'Recepcion']);
  if (!ordenId || importe === undefined || isNaN(Number(importe)) || Number(importe) <= 0) {
    throw new Error('ID de orden e importe válido mayor a cero son requeridos.');
  }

  return withLock(function() {
    var ordenes = readSheetAsObjects('OrdenServicio');
    var ord = ordenes.find(function(o) { return String(o.OrdenID) === String(ordenId); });
    if (!ord) {
      throw new Error('La orden ' + ordenId + ' no existe.');
    }

    var pagoId = getNextId('Pagos', 'PAG');
    var nowStr = formatDate(new Date(), 'dd/MM/yyyy HH:mm');
    var impNum = Number(importe);

    appendRowObject('Pagos', {
      PagoID: pagoId,
      OrdenID: ordenId,
      Fecha: nowStr,
      Importe: impNum,
      Concepto: concepto || 'Abono / Pago de servicio'
    });

    recalculateOrderTotals(ordenId);

    return {
      success: true,
      pagoId: pagoId,
      ordenId: ordenId,
      importe: impNum
    };
  });
}

/**
 * Queries all payments for a specific order ID.
 * @param {string} ordenId
 * @returns {Array<Object>}
 */
function getPagosOrden(ordenId) {
  if (!ordenId) return [];
  var pagos = readSheetAsObjects('Pagos');
  return pagos.filter(function(p) { return String(p.OrdenID) === String(ordenId); });
}
