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

const SUBDIRECCIONES = Array.from(new Set([
  'Secretaría Técnica de la Oficina de Presidencia',
  'Secretario Técnico del Despacho de la Presidenta Municipal',
  'Secretaría Técnica de Vinculación',
  'Subdirección del Despacho de Presidencia Municipal',
  'Unidad de Transparencia y Gestión Archivística',
  'Subdirección de la Secretaría Municipal',
  'Subdirección de Medios',
  'Subdirección de Imagen Institucional',
  'Subdirección de Secretaría Técnica',
  'Subdirección de Prevención Social del Delito y Participación Ciudadana',
  'Subdirección de Áreas de Administración',
  'Subdirección General Operativa',
  'Subdirección de Auditoría y Seguimiento de Actos de Fiscalización',
  'Subdirección de Normatividad y Responsabilidades',
  'Subdirección de Participación Social',
  'Subdirección de la Unidad de Atención Ciudadana',
  'Secretaría Técnica de Planeación, Seguimiento y Evaluación',
  'Subdirección de Planeación e Información',
  'Subdirección de Seguimiento y Evaluación',
  'Secretaría Técnica de Gestión Administrativa',
  'Secretaría Técnica de Coordinación de Entidades Paramunicipales',
  'Subdirección de Relaciones Públicas y Protocolo',
  'Subdirección de Logística',
  'Subdirección de Proyectos Especiales',
  'Secretaría Técnica del Servicio Público de Mercados',
  'Subdirección Especializada en Establecimientos Fijos, Semifijos y Ambulantaje',
  'Subdirección de Mercados Públicos',
  'Subdirección de Consejería Jurídica',
  'Subdirección de Asuntos Jurídicos',
  'Subdirección de Gobernación',
  'Subdirección Operativa',
  'Subdirección de Administración y de Proveeduría',
  'Subdirección de Servicios Internos',
  'Subdirección de Recursos Humanos',
  'Subdirección de Mejora Regulatoria',
  'Subdirección de Patrimonio Municipal',
  'Subdirección de Ventanillas Únicas',
  'Subdirección de Ingresos',
  'Subdirección de Egresos',
  'Subdirección de Presupuestos y Control del Gasto',
  'Subdirección de Contabilidad y Administración',
  'Subdirección de Política Tributaria',
  'Subdirección de Ingeniería de Software',
  'Subdirección de Infraestructura',
  'Subdirección de Innovación',
  'Secretaría Técnica de la Unidad de Turismo',
  'Subdirección de Vinculación',
  'Subdirección de Desarrollo Integral de la Familia (DIF Municipal)',
  'Subdirección de Promoción Social',
  'Subdirección de Participación Ciudadana',
  'Subdirección de Infraestructura Social',
  'Subdirección de Atención a Comisarías',
  'Subdirección de Salud',
  'Subdirección de Deportes',
  'Subdirección de Administración',
  'Subdirección de Educación',
  'Subdirección de Bienestar Económico',
  'Subdirección de Prosperidad',
  'Subdirección de Conservación y Difusión Patrimonial',
  'Subdirección de Cultura',
  'Secretario de Gestión Integral de Residuos Municipales',
  'Subdirector de Residuos Municipales',
  'Subdirección de Planeación y Proyectos de Residuos Municipales',
  'Subdirección de Calidad y Atención Ciudadana',
  'Subdirección de Gestión y Control del Territorio',
  'Subdirección de Patrimonio Cultural',
  'Subdirección Jurídica',
  'Subdirección de Nuevos Desarrollos',
  'Subdirección de Obras e Infraestructura',
  'Subdirección de Vías Terrestres',
  'Subdirección de Planeación y Organización de Obras',
  'Subdirección de Servicios Generales',
  'Subdirección de Servicios Oriente',
  'Subdirección de Servicios Básicos Poniente',
  'Subdirección de Verificación y Gestión',
  'Subdirección de Bienestar Animal',
  'Subdirección de Infraestructura Verde',
  'Subdirección de Operaciones y Procesos',
  'Subdirección Técnica',
  'Despacho del Administrador',
  'Secretaría de Finanzas',
  'Secretaría Operativa y Mercadotecnia',
  'Subdirección Administrativa',
  'Subdirección de Operaciones y Mantenimiento',
  'Subdirección de Servicios Espaciales',
  'Secretaría Técnica'
]));

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
