/**
 * Catalog management functions
 */

function getCatalogos() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Catalogos");
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName("Catalogos");
  }

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      tiposSesion: ["DPR", "TYP", "ESZ", "PMO", "OPE"],
      tiposObservacion: ["Ajuste Técnico", "Acuerdo", "Informativo", "Duda"],
      estatus: ["Pendiente", "Resuelto", "Informativo"],
      estatusFirma: ["Pendiente por Firmar", "Firmado"],
      prioridades: ["Alta", "Media", "Baja"],
      origenes: ["Minuta", "Correo", "Oficio"],
      modulos: [
        "Centro Estatal de Solución de Controversias",
        "Fondo Auxiliar",
        "Interacción con FGE",
        "Secretaría Ejecutiva",
        "Servicios Electrónicos Jurisdiccionales"
      ],
      etapasProyecto: ["Modelo Simplificado", "Diagnóstico", "Agenda Legislativa"],
      participantes: getParticipantes()
    };
  }

  var headers = data[0];
  var catalogos = {
    tiposSesion: [],
    tiposObservacion: [],
    estatus: [],
    estatusFirma: [],
    prioridades: [],
    origenes: [],
    modulos: [],
    etapasProyecto: [],
    participantes: getParticipantes()
  };

  var mapColIdx = {
    "TIPO DE SESIÓN": "tiposSesion",
    "TIPO DE OBSERVACIÓN": "tiposObservacion",
    "ESTATUS": "estatus",
    "ESTATUS DE FIRMA": "estatusFirma",
    "PRIORIDAD": "prioridades",
    "ORIGEN": "origenes",
    "MÓDULO": "modulos",
    "ETAPA PROYECTO": "etapasProyecto"
  };

  for (var c = 0; c < headers.length; c++) {
    var colHeader = String(headers[c] || '').trim();
    var key = mapColIdx[colHeader];
    if (key) {
      for (var r = 1; r < data.length; r++) {
        var val = data[r][c];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          if (catalogos[key].indexOf(String(val).trim()) === -1) {
            catalogos[key].push(String(val).trim());
          }
        }
      }
    }
  }

  return catalogos;
}

function getParticipantes() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Participantes");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var list = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] || row[1]) {
      list.push({
        clave: String(row[0] || '').trim(),
        nombre: String(row[1] || '').trim(),
        modulo: String(row[2] || '').trim(),
        rol: String(row[3] || '').trim(),
        activo: String(row[4] || 'SI').trim().toUpperCase()
      });
    }
  }
  return list;
}

/**
 * Maps module names to acronyms for Folio generation
 */
function getSiglasModulo(moduloName) {
  if (!moduloName) return "GEN";
  var map = {
    "Centro Estatal de Solución de Controversias": "CESC",
    "Fondo Auxiliar": "FA",
    "Interacción con FGE": "FGE",
    "Secretaría Ejecutiva": "SE",
    "Servicios Electrónicos Jurisdiccionales": "SEJ"
  };
  if (map[moduloName]) return map[moduloName];

  // Fallback acronym from initials
  var words = moduloName.split(" ").filter(function(w) {
    return w.length > 2 && ["de", "del", "con", "las", "los", "por", "para"].indexOf(w.toLowerCase()) === -1;
  });
  var initials = words.map(function(w) { return w.charAt(0).toUpperCase(); }).join("");
  return initials || moduloName.substring(0, 3).toUpperCase();
}

/**
 * Utility to generate Folio Minuta: MIN_{PROYECTO}_{TIPO}_{YYYYMMDD}_{SIGLAS_MODULO}
 */
function generarFolioMinuta(proyecto, tipoSesion, fechaSesionStr, modulo) {
  var proj = (proyecto || "PJ").trim().toUpperCase().replace(/\s+/g, "");
  var tipo = (tipoSesion || "PMO").trim().toUpperCase();

  var dateClean = "";
  if (fechaSesionStr) {
    var str = String(fechaSesionStr).trim();
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
      dateClean = str.replace(/-/g, "").substring(0, 8);
    } else {
      var d = new Date(str);
      if (!isNaN(d.getTime())) {
        var yyyy = d.getFullYear();
        var mm = ("0" + (d.getMonth() + 1)).slice(-2);
        var dd = ("0" + d.getDate()).slice(-2);
        dateClean = yyyy + mm + dd;
      } else {
        dateClean = str.replace(/-/g, "").substring(0, 8);
      }
    }
  } else {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = ("0" + (today.getMonth() + 1)).slice(-2);
    var dd = ("0" + today.getDate()).slice(-2);
    dateClean = yyyy + mm + dd;
  }

  var siglas = getSiglasModulo(modulo);
  return "MIN_" + proj + "_" + tipo + "_" + dateClean + "_" + siglas;
}
