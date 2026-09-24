/**
 * Application setup and main entry point for Web App.
 * Control y Seguimiento de Acuerdos y Ajustes de Proyecto (PMO)
 */

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Control y Seguimiento de Acuerdos PMO')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Include HTML files into master template
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get active spreadsheet or open by ID if configured
 */
function getSpreadsheet() {
  var prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (prop) {
    try {
      return SpreadsheetApp.openById(prop);
    } catch (e) {
      console.warn("Could not open spreadsheet by ID, falling back to active spreadsheet: " + e.message);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Setup function to initialize Google Sheet structure, catalogs, and sample data.
 */
function setup() {
  var ss = getSpreadsheet();
  if (!ss) {
    throw new Error("No hay una hoja de cálculo activa. Vincula el script a una Google Sheet o asigna SPREADSHEET_ID en ScriptProperties.");
  }

  // 1. Hoja "Registros"
  var sheetRegistros = ss.getSheetByName("Registros") || ss.insertSheet("Registros");
  var headersRegistros = [
    "NO. GRAL", "NO. EN MIN", "TIPO DE SESIÓN", "FECHA DE SESIÓN", "FOLIO MINUTA",
    "NOMBRE DE MINUTA", "ORIGEN DEL ACUERDO", "FECHA SOLICITUD", "ETAPA PROYECTO",
    "MÓDULO", "TIPO DE OBSERVACIÓN", "ACUERDO O AJUSTE SOLICITADO", "SOL", "RESP",
    "FECHA COMPROMISO", "PRIORIDAD", "COMENTARIOS PROVEEDOR", "OBSERVACIONES PMO",
    "ESTATUS", "TRACKING COMENTARIOS", "ESTATUS DE FIRMA", "NUBE", "FECHA CIERRE"
  ];
  if (sheetRegistros.getLastRow() === 0) {
    sheetRegistros.getRange(1, 1, 1, headersRegistros.length).setValues([headersRegistros]);
    sheetRegistros.getRange(1, 1, 1, headersRegistros.length).setFontWeight("bold").setBackground("#1A365D").setFontColor("#FFFFFF");
    sheetRegistros.setFrozenRows(1);
  }

  // 2. Hoja "Catalogos"
  var sheetCatalogos = ss.getSheetByName("Catalogos") || ss.insertSheet("Catalogos");
  var headersCatalogos = [
    "TIPO DE SESIÓN", "TIPO DE OBSERVACIÓN", "ESTATUS", "ESTATUS DE FIRMA",
    "PRIORIDAD", "ORIGEN", "MÓDULO", "ETAPA PROYECTO"
  ];
  if (sheetCatalogos.getLastRow() === 0) {
    sheetCatalogos.getRange(1, 1, 1, headersCatalogos.length).setValues([headersCatalogos]);
    sheetCatalogos.getRange(1, 1, 1, headersCatalogos.length).setFontWeight("bold").setBackground("#2B6CB0").setFontColor("#FFFFFF");
    sheetCatalogos.setFrozenRows(1);

    var catalogData = [
      ["DPR", "Ajuste Técnico", "Pendiente", "Pendiente por Firmar", "Alta", "Minuta", "Centro Estatal de Solución de Controversias", "Modelo Simplificado"],
      ["TYP", "Acuerdo", "Resuelto", "Firmado", "Media", "Correo", "Fondo Auxiliar", "Diagnóstico"],
      ["ESZ", "Informativo", "Informativo", "", "Baja", "Oficio", "Interacción con FGE", "Agenda Legislativa"],
      ["PMO", "Duda", "", "", "", "", "Secretaría Ejecutiva", ""],
      ["OPE", "", "", "", "", "", "Servicios Electrónicos Jurisdiccionales", ""]
    ];

    sheetCatalogos.getRange(2, 1, catalogData.length, catalogData[0].length).setValues(catalogData);
  }

  // 3. Hoja "Participantes"
  var sheetParticipantes = ss.getSheetByName("Participantes") || ss.insertSheet("Participantes");
  var headersParticipantes = ["CLAVE INICIALES", "NOMBRE", "MÓDULO", "ROL", "ACTIVO"];
  if (sheetParticipantes.getLastRow() === 0) {
    sheetParticipantes.getRange(1, 1, 1, headersParticipantes.length).setValues([headersParticipantes]);
    sheetParticipantes.getRange(1, 1, 1, headersParticipantes.length).setFontWeight("bold").setBackground("#2C5282").setFontColor("#FFFFFF");
    sheetParticipantes.setFrozenRows(1);

    var participantesData = [
      ["JGA", "Ing. Juan García Aranda", "Centro Estatal de Solución de Controversias", "Líder Técnico", "SI"],
      ["MLR", "Lic. María López Rodríguez", "Fondo Auxiliar", "Analista PMO", "SI"],
      ["CPS", "Ing. Carlos Pérez Sánchez", "Interacción con FGE", "Desarrollador Senior", "SI"],
      ["AMM", "Dra. Ana Martínez Morales", "Secretaría Ejecutiva", "Coordinadora General", "SI"],
      ["RTH", "Lic. Roberto Torres Hernández", "Servicios Electrónicos Jurisdiccionales", "QA Lead", "SI"]
    ];
    sheetParticipantes.getRange(2, 1, participantesData.length, participantesData[0].length).setValues(participantesData);
  }

  // 4. Hoja "Minutas"
  var sheetMinutas = ss.getSheetByName("Minutas") || ss.insertSheet("Minutas");
  var headersMinutas = [
    "FOLIO MINUTA", "FECHA SESIÓN", "TIPO DE SESIÓN", "NOMBRE MINUTA",
    "TOTAL ACUERDOS", "TOTAL AJUSTES TÉCNICOS", "TOTAL INFORMATIVOS", "TOTAL DUDAS",
    "TOTAL GENERAL", "FIRMA"
  ];
  if (sheetMinutas.getLastRow() === 0) {
    sheetMinutas.getRange(1, 1, 1, headersMinutas.length).setValues([headersMinutas]);
    sheetMinutas.getRange(1, 1, 1, headersMinutas.length).setFontWeight("bold").setBackground("#2B6CB0").setFontColor("#FFFFFF");
    sheetMinutas.setFrozenRows(1);
  }

  // 5. Hoja "Historial"
  var sheetHistorial = ss.getSheetByName("Historial") || ss.insertSheet("Historial");
  var headersHistorial = ["FECHA", "USUARIO", "NO. GRAL", "CAMPO MODIFICADO", "VALOR ANTERIOR", "VALOR NUEVO"];
  if (sheetHistorial.getLastRow() === 0) {
    sheetHistorial.getRange(1, 1, 1, headersHistorial.length).setValues([headersHistorial]);
    sheetHistorial.getRange(1, 1, 1, headersHistorial.length).setFontWeight("bold").setBackground("#4A5568").setFontColor("#FFFFFF");
    sheetHistorial.setFrozenRows(1);
  }

  // 6. Hoja "Resumen"
  var sheetResumen = ss.getSheetByName("Resumen") || ss.insertSheet("Resumen");

  // 7. Insertar 5 registros de prueba si Registros solo tiene encabezados
  if (sheetRegistros.getLastRow() === 1) {
    var sampleRecords = [
      {
        "noEnMin": 1,
        "tipoSesion": "PMO",
        "fechaSesion": "2025-01-10",
        "folioMinuta": "MIN_PJ_PMO_20250110_CESC",
        "nombreMinuta": "Sesión Inicial de Alineación CESC",
        "origenAcuerdo": "Minuta",
        "fechaSolicitud": "2025-01-10",
        "etapaProyecto": "Modelo Simplificado",
        "modulo": "Centro Estatal de Solución de Controversias",
        "tipoObservacion": "Acuerdo",
        "acuerdo": "Definir matriz de roles y permisos para mediadores del centro.",
        "sol": "Lic. María López Rodríguez",
        "resp": "Ing. Juan García Aranda",
        "fechaCompromiso": "2025-01-20",
        "prioridad": "Alta",
        "comentariosProveedor": "En revisión por el equipo técnico.",
        "observacionesPmo": "Se requiere validación final antes del pase a producción.",
        "estatus": "Pendiente",
        "trackingComentarios": "",
        "estatusFirma": "Pendiente por Firmar",
        "nube": "https://drive.google.com/drive/folders/sample1",
        "fechaCierre": ""
      },
      {
        "noEnMin": 2,
        "tipoSesion": "PMO",
        "fechaSesion": "2025-01-10",
        "folioMinuta": "MIN_PJ_PMO_20250110_CESC",
        "nombreMinuta": "Sesión Inicial de Alineación CESC",
        "origenAcuerdo": "Minuta",
        "fechaSolicitud": "2025-01-10",
        "etapaProyecto": "Modelo Simplificado",
        "modulo": "Centro Estatal de Solución de Controversias",
        "tipoObservacion": "Ajuste Técnico",
        "acuerdo": "Ajustar validación del CURP en el formulario de registro de expedientes.",
        "sol": "Lic. María López Rodríguez",
        "resp": "Ing. Juan García Aranda",
        "fechaCompromiso": "2025-01-15",
        "prioridad": "Alta",
        "comentariosProveedor": "Cambio implementado y desplegado en ambiente QA.",
        "observacionesPmo": "Prueba de aceptación aprobada.",
        "estatus": "Resuelto",
        "trackingComentarios": "",
        "estatusFirma": "Firmado",
        "nube": "https://drive.google.com/drive/folders/sample2",
        "fechaCierre": "2025-01-14"
      },
      {
        "noEnMin": 1,
        "tipoSesion": "DPR",
        "fechaSesion": "2025-01-12",
        "folioMinuta": "MIN_PJ_DPR_20250112_FA",
        "nombreMinuta": "Revisión Técnica Fondo Auxiliar",
        "origenAcuerdo": "Minuta",
        "fechaSolicitud": "2025-01-12",
        "etapaProyecto": "Diagnóstico",
        "modulo": "Fondo Auxiliar",
        "tipoObservacion": "Informativo",
        "acuerdo": "Se presentó la arquitectura propuesta para la integración bancaria.",
        "sol": "Ing. Carlos Pérez Sánchez",
        "resp": "Lic. María López Rodríguez",
        "fechaCompromiso": "2025-01-12",
        "prioridad": "Baja",
        "comentariosProveedor": "Informativo presentado en la sesión.",
        "observacionesPmo": "Sin acciones pendientes.",
        "estatus": "Informativo",
        "trackingComentarios": "",
        "estatusFirma": "Firmado",
        "nube": "",
        "fechaCierre": ""
      },
      {
        "noEnMin": 1,
        "tipoSesion": "TYP",
        "fechaSesion": "2025-01-05",
        "folioMinuta": "MIN_PJ_TYP_20250105_FGE",
        "nombreMinuta": "Mesa Interinstitucional FGE",
        "origenAcuerdo": "Correo",
        "fechaSolicitud": "2025-01-05",
        "etapaProyecto": "Agenda Legislativa",
        "modulo": "Interacción con FGE",
        "tipoObservacion": "Acuerdo",
        "acuerdo": "Entregar especificaciones de la API Rest para consulta de carpetas.",
        "sol": "Dra. Ana Martínez Morales",
        "resp": "Ing. Carlos Pérez Sánchez",
        "fechaCompromiso": "2025-01-10",
        "prioridad": "Alta",
        "comentariosProveedor": "Pendiente respuesta de la FGE sobre tokens OAuth2.",
        "observacionesPmo": "Acuerdo vencido. Requiere reprogramación o escalamiento.",
        "estatus": "Pendiente",
        "trackingComentarios": "Vinculado con acuerdo #1 para credenciales de acceso.",
        "estatusFirma": "Pendiente por Firmar",
        "nube": "",
        "fechaCierre": ""
      },
      {
        "noEnMin": 2,
        "tipoSesion": "TYP",
        "fechaSesion": "2025-01-05",
        "folioMinuta": "MIN_PJ_TYP_20250105_FGE",
        "nombreMinuta": "Mesa Interinstitucional FGE",
        "origenAcuerdo": "Oficio",
        "fechaSolicitud": "2025-01-05",
        "etapaProyecto": "Agenda Legislativa",
        "modulo": "Interacción con FGE",
        "tipoObservacion": "Duda",
        "acuerdo": "Clarificar alcance del resguardo de bitácoras de auditoría.",
        "sol": "Lic. Roberto Torres Hernández",
        "resp": "Dra. Ana Martínez Morales",
        "fechaCompromiso": "2025-01-25",
        "prioridad": "Media",
        "comentariosProveedor": "Se atenderá en el taller de normativa legal.",
        "observacionesPmo": "En proceso de definición.",
        "estatus": "Pendiente",
        "trackingComentarios": "",
        "estatusFirma": "Pendiente por Firmar",
        "nube": "",
        "fechaCierre": ""
      }
    ];

    for (var i = 0; i < sampleRecords.length; i++) {
      appendRegistro(sampleRecords[i]);
    }
  }

  // Actualizar resúmenes y minutas
  recalcularResumenYMinutas();

  return "Setup completado exitosamente con tablas, catálogos, participantes y registros de prueba.";
}
