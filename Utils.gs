/**
 * Utils.gs - Funciones auxiliares y de almacenamiento para el sistema de Minutas.
 */

const SPREADSHEET_PROPERTY_KEY = 'MINUTAS_SPREADSHEET_ID';

/**
 * Obtiene o crea la hoja de cálculo base de datos de la aplicación.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty(SPREADSHEET_PROPERTY_KEY);

  if (ssId) {
    try {
      return SpreadsheetApp.openById(ssId);
    } catch (e) {
      Logger.log('Hoja de cálculo no encontrada con ID guardado. Se creará una nueva.');
    }
  }

  const newSs = SpreadsheetApp.create('DB_Sistema_Minutas_Seguimiento');
  props.setProperty(SPREADSHEET_PROPERTY_KEY, newSs.getId());
  setupDatabase(newSs);
  return newSs;
}

/**
 * Inicializa la estructura de la base de datos con las pestañas requeridas.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss]
 */
function setupDatabase(ss) {
  if (!ss) {
    ss = getSpreadsheet();
  }

  const schema = {
    'Proyectos': ['id_proyecto', 'nombre', 'descripcion', 'fecha_creacion', 'estado', 'folder_id'],
    'Minutas': ['id_minuta', 'id_proyecto', 'titulo', 'fecha_reunion', 'lugar', 'objetivo', 'doc_url', 'pdf_url', 'fecha_creacion'],
    'Asistencia': ['id_asistencia', 'id_minuta', 'numero', 'nombre', 'dependencia', 'ap', 'at', 'na'],
    'OrdenDelDia': ['id_orden', 'id_minuta', 'numero', 'descripcion'],
    'Acuerdos': ['id_acuerdo', 'id_minuta', 'numero', 'descripcion', 'responsable', 'fecha_cumplimiento', 'estado', 'motivo_cancelacion']
  };

  Object.keys(schema).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schema[sheetName]);
      sheet.getRange(1, 1, 1, schema[sheetName].length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    }
  });

  const defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch(e) {}
  }
}

/**
 * Convierte los datos de una pestaña en un arreglo de objetos JSON.
 * @param {string} sheetName
 * @returns {Array<Object>}
 */
function getSheetDataAsObjects(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val instanceof Date) {
        val = formatDateISO(val);
      }
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * Genera un UUID v4 simple.
 * @returns {string}
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Formatea una fecha a string YYYY-MM-DD.
 * @param {Date|string} dateInput
 * @returns {string}
 */
function formatDateISO(dateInput) {
  if (!dateInput) return '';
  const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha a string legible en español (ej. dd/MM/yyyy).
 * @param {Date|string} dateInput
 * @returns {string}
 */
function formatDateDisplay(dateInput) {
  if (!dateInput) return '';
  const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);

  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'GMT', 'dd/MM/yyyy');
}

/**
 * Crea o recupera la carpeta raíz del proyecto en Google Drive.
 * @returns {GoogleAppsScript.Drive.Folder}
 */
function getOrCreateRootFolder() {
  const folderName = 'Minutas_y_Seguimiento_App';
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

/**
 * Envuelve la respuesta en formato estándar JSON para el cliente.
 * @param {boolean} success
 * @param {any} data
 * @param {string} [message]
 * @returns {string} JSON string
 */
function buildResponse(success, data, message) {
  return JSON.stringify({
    success: success,
    data: data || null,
    message: message || ''
  });
}
