/**
 * Utils.gs - Funciones auxiliares y de almacenamiento para el sistema de Minutas.
 */

const SPREADSHEET_PROPERTY_KEY = 'MINUTAS_SPREADSHEET_ID';

const DEPENDENCIAS = [
  'Oficina de Presidencia',
  'Secretaría Municipal',
  'Instituto Municipal de Planeación de Mérida',
  'Unidad de Comunicación Ciudadana',
  'Dirección de la Policía Municipal',
  'Dirección de Contraloría Municipal',
  'Secretaría de Participación y Atención Ciudadana',
  'Coordinación General de Buen Gobierno',
  'Dirección de Gobernación',
  'Dirección de Administración',
  'Dirección de Finanzas y Tesorería Municipal',
  'Dirección de Innovación y Gobierno Inteligente',
  'Coordinación General de Justicia Social y Desarrollo Humano',
  'Dirección de Desarrollo Integral de la Familia',
  'Dirección de Desarrollo Social y Combate a la Pobreza',
  'Dirección de Bienestar Humano',
  'Dirección de Prosperidad y Bienestar Económico',
  'Instituto de las Mujeres',
  'Dirección de Cultura e Identidad',
  'Coordinación General de Desarrollo Ordenado y Gestión de la Ciudad',
  'Dirección de Desarrollo Urbano',
  'Dirección de Obras Públicas',
  'Dirección de Servicios Públicos',
  'Unidad de Medio Ambiente y Bienestar Animal',
  'Dirección de Catastro Municipal',
  'Abastos de Mérida',
  'Central de Abasto',
  'Comité Permanente del Carnaval',
  'Servi-limpia',
  'Cuxtal'
];

const SUBDIRECCIONES = [
  'Subdirección General',
  'Subdirección Operativa',
  'Subdirección Administrativa',
  'Subdirección Técnica',
  'Subdirección de Mejora Regulatoria',
  'Subdirección de Innovación',
  'Secretaría Técnica',
  'N/A'
];

const ETAPAS_PROYECTO = [
  'Inicio',
  'Planificación',
  'Ejecución',
  'Monitoreo y Control',
  'Cierre'
];

/**
 * Obtiene o crea la hoja de cálculo base de datos de la aplicación.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty(SPREADSHEET_PROPERTY_KEY);
  let ss = null;

  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (e) {
      Logger.log('Hoja de cálculo no encontrada con ID guardado. Se creará una nueva.');
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('DB_Sistema_Minutas_Seguimiento');
    props.setProperty(SPREADSHEET_PROPERTY_KEY, ss.getId());
  }

  setupDatabase(ss);
  return ss;
}

/**
 * Inicializa la estructura de la base de datos asegurando que existan todas las pestañas y columnas.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss]
 */
function setupDatabase(ss) {
  if (!ss) {
    const props = PropertiesService.getScriptProperties();
    let ssId = props.getProperty(SPREADSHEET_PROPERTY_KEY);
    if (ssId) {
      try {
        ss = SpreadsheetApp.openById(ssId);
      } catch (e) {}
    }
    if (!ss) {
      return getSpreadsheet();
    }
  }

  const schema = {
    'Proyectos': ['id_proyecto', 'nombre', 'descripcion', 'fecha_creacion', 'estado', 'folder_id'],
    'Minutas': ['id_minuta', 'folio', 'id_proyecto', 'etapa', 'dependencia', 'subdireccion', 'titulo', 'fecha_reunion', 'lugar', 'objetivo', 'doc_url', 'pdf_url', 'fecha_creacion'],
    'Asistencia': ['id_asistencia', 'id_minuta', 'numero', 'nombre', 'dependencia', 'ap', 'at', 'na'],
    'OrdenDelDia': ['id_orden', 'id_minuta', 'numero', 'descripcion'],
    'Acuerdos': ['id_acuerdo', 'id_minuta', 'numero', 'tipo', 'descripcion', 'prioridad', 'solicitante', 'responsable', 'tracking', 'num_acuerdo_anterior', 'fecha_cumplimiento', 'estado', 'motivo_cancelacion']
  };

  Object.keys(schema).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Verificar si la pestaña está vacía o si le faltan los encabezados
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema[sheetName]);
      sheet.getRange(1, 1, 1, schema[sheetName].length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    } else {
      const existingHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      const newHeaders = schema[sheetName];
      newHeaders.forEach(header => {
        if (!existingHeaders.includes(header)) {
          const nextCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, nextCol).setValue(header).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
          existingHeaders.push(header);
        }
      });
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
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
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
 * Sanitiza texto HTML para evitar inyecciones.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
