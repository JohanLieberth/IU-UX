/**
 * NFC.gs - BitFix v3
 * Endpoints for linking and unlinking NFC UID tokens to client phone numbers.
 */

/**
 * Links an NFC token UID to a customer's phone number.
 * Checks for existing binding and requires confirmation if reassigning.
 *
 * @param {string} uid
 * @param {string} telefono
 * @param {boolean} reasignar
 * @returns {Object}
 */
function vincularTokenNFC(uid, telefono, reasignar) {
  requireRole(['Administrador', 'Recepcion']);
  if (!uid || !telefono) {
    throw new Error('UID de tarjeta NFC y teléfono son requeridos.');
  }

  var uidClean = String(uid).trim().toUpperCase();
  var telClean = String(telefono).trim();

  return withLock(function() {
    var nfcs = readSheetAsObjects('NFC');
    var existing = nfcs.find(function(n) { return String(n.UID).toUpperCase() === uidClean; });

    if (existing) {
      if (String(existing.TelefonoCliente).trim() === telClean) {
        return { success: true, message: 'La tarjeta NFC ya se encuentra vinculada a este teléfono.' };
      }

      if (!reasignar) {
        return {
          requiereConfirmacion: true,
          mensaje: 'El UID ' + uidClean + ' ya está vinculado al teléfono ' + existing.TelefonoCliente + '. ¿Desea reasignarlo?'
        };
      }

      // Update existing record
      if (existing._rowIndex) {
        updateRowObject('NFC', existing._rowIndex, {
          TelefonoCliente: telClean
        });
      }
    } else {
      // Create new record
      var nfcId = getNextId('NFC', 'NFC');
      appendRowObject('NFC', {
        NFC_ID: nfcId,
        UID: uidClean,
        TelefonoCliente: telClean
      });
    }

    return {
      success: true,
      message: 'Tarjeta NFC (' + uidClean + ') vinculada exitosamente al teléfono ' + telClean + '.'
    };
  });
}

/**
 * Unlinks an NFC token UID.
 * @param {string} uid
 * @returns {Object}
 */
function desvincularTokenNFC(uid) {
  requireRole(['Administrador', 'Recepcion']);
  if (!uid) throw new Error('UID requerido.');

  var uidClean = String(uid).trim().toUpperCase();

  return withLock(function() {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('NFC');
    var nfcs = readSheetAsObjects('NFC');

    var existing = nfcs.find(function(n) { return String(n.UID).toUpperCase() === uidClean; });
    if (existing && existing._rowIndex) {
      sheet.deleteRow(existing._rowIndex);
    }

    return {
      success: true,
      message: 'Tarjeta NFC (' + uidClean + ') desvinculada.'
    };
  });
}
