/**
 * Utils.gs - BitFix v3
 * Utility functions, locks, ID generation, formatters, and sheet helpers.
 */

/**
 * Gets the active spreadsheet or opens it by ID if set in ScriptProperties.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  var propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (propId) {
    try {
      return SpreadsheetApp.openById(propId);
    } catch (e) {
      console.warn('Could not open spreadsheet by ID from properties: ' + e.toString());
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Executes a callback within a Script Lock to prevent race conditions.
 * @param {Function} callback
 * @returns {*}
 */
function withLock(callback) {
  var lock = LockService.getScriptLock();
  var success = lock.tryLock(30000); // Wait up to 30s
  if (!success) {
    throw new Error('El sistema está ocupado procesando otra solicitud. Por favor intente de nuevo.');
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Generates the next ID for a table with a prefix and zero-padded sequence number.
 * e.g., getNextId('OrdenServicio', 'OS') -> 'OS003'
 * @param {string} sheetName
 * @param {string} prefix
 * @returns {string}
 */
function getNextId(sheetName, prefix) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return prefix + '001';
  }
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return prefix + '001';
  }

  var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var maxNum = 0;
  var re = new RegExp('^' + prefix + '(\\d+)$', 'i');

  for (var i = 0; i < data.length; i++) {
    var val = String(data[i][0] || '').trim();
    var match = val.match(re);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }

  var nextNum = maxNum + 1;
  var padded = ('000' + nextNum).slice(-Math.max(3, String(nextNum).length));
  return prefix + padded;
}

/**
 * Formats a Date object to string based on timezone America/Mexico_City.
 * @param {Date|string} date
 * @param {string} format
 * @returns {string}
 */
function formatDate(date, format) {
  if (!date) return '';
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  if (isNaN(date.getTime())) return '';

  var fmt = format || 'dd/MM/yyyy HH:mm';
  var timeZone = Session.getScriptTimeZone() || 'America/Mexico_City';
  return Utilities.formatDate(date, timeZone, fmt);
}

/**
 * Formats date to ISO string in Mexico_City timezone.
 * @param {Date} date
 * @returns {string}
 */
function formatISO(date) {
  return formatDate(date || new Date(), "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * Computes SHA-256 hash of a string.
 * @param {string} input
 * @returns {string} Hex encoded SHA-256 hash
 */
function hashSHA256(input) {
  if (!input) return '';
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(input), Utilities.Charset.UTF_8);
  var txt = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byte = rawHash[i];
    if (byte < 0) byte += 256;
    var byteStr = byte.toString(16);
    if (byteStr.length === 1) byteStr = '0' + byteStr;
    txt += byteStr;
  }
  return txt;
}

/**
 * Reads all objects from a sheet as an array of JavaScript objects.
 * Uses headers in row 1 as property keys.
 * @param {string} sheetName
 * @returns {Array<Object>}
 */
function readSheetAsObjects(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var results = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    var emptyRow = true;
    for (var j = 0; j < headers.length; j++) {
      var header = String(headers[j]).trim();
      if (header) {
        var val = row[j];
        if (val instanceof Date) {
          val = formatDate(val, 'dd/MM/yyyy HH:mm');
        }
        obj[header] = val;
        if (val !== '' && val !== null && val !== undefined) {
          emptyRow = false;
        }
      }
    }
    if (!emptyRow) {
      obj._rowIndex = i + 2; // 1-based sheet row index
      results.push(obj);
    }
  }
  return results;
}

/**
 * Appends an object or array to a sheet using header keys.
 * @param {string} sheetName
 * @param {Object} rowObject
 */
function appendRowObject(sheetName, rowObject) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Hoja no encontrada: ' + sheetName);
  }
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rowData = [];
  for (var j = 0; j < headers.length; j++) {
    var header = String(headers[j]).trim();
    rowData.push(rowObject[header] !== undefined ? rowObject[header] : '');
  }
  sheet.appendRow(rowData);
}

/**
 * Updates columns of a specific row index in a sheet.
 * @param {string} sheetName
 * @param {number} rowIndex
 * @param {Object} updateObject
 */
function updateRowObject(sheetName, rowIndex, updateObject) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var j = 0; j < headers.length; j++) {
    var header = String(headers[j]).trim();
    if (updateObject.hasOwnProperty(header)) {
      sheet.getRange(rowIndex, j + 1).setValue(updateObject[header]);
    }
  }
}
