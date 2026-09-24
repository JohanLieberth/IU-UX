/**
 * CRUD and business logic for Registros (Acuerdos y Ajustes)
 */

var HEADERS_REGISTROS = [
  "NO. GRAL", "NO. EN MIN", "TIPO DE SESIÓN", "FECHA DE SESIÓN", "FOLIO MINUTA",
  "NOMBRE DE MINUTA", "ORIGEN DEL ACUERDO", "FECHA SOLICITUD", "ETAPA PROYECTO",
  "MÓDULO", "TIPO DE OBSERVACIÓN", "ACUERDO O AJUSTE SOLICITADO", "SOL", "RESP",
  "FECHA COMPROMISO", "PRIORIDAD", "COMENTARIOS PROVEEDOR", "OBSERVACIONES PMO",
  "ESTATUS", "TRACKING COMENTARIOS", "ESTATUS DE FIRMA", "NUBE", "FECHA CIERRE"
];

function formatDateISO(val) {
  if (!val) return "";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    var yyyy = val.getFullYear();
    var mm = ("0" + (val.getMonth() + 1)).slice(-2);
    var dd = ("0" + val.getDate()).slice(-2);
    return yyyy + "-" + mm + "-" + dd;
  }
  var str = String(val).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    return str.substring(0, 10);
  }
  var d = new Date(str);
  if (!isNaN(d.getTime())) {
    var yyyy = d.getFullYear();
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var dd = ("0" + d.getDate()).slice(-2);
    return yyyy + "-" + mm + "-" + dd;
  }
  return str;
}

function getRegistros() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Registros");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var registros = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0] !== "" && row[0] !== null && row[0] !== undefined) {
      registros.push({
        noGral: Number(row[0]),
        noEnMin: row[1] !== "" ? Number(row[1]) : 1,
        tipoSesion: String(row[2] || ''),
        fechaSesion: formatDateISO(row[3]),
        folioMinuta: String(row[4] || ''),
        nombreMinuta: String(row[5] || ''),
        origenAcuerdo: String(row[6] || ''),
        fechaSolicitud: formatDateISO(row[7]),
        etapaProyecto: String(row[8] || ''),
        modulo: String(row[9] || ''),
        tipoObservacion: String(row[10] || ''),
        acuerdo: String(row[11] || ''),
        sol: String(row[12] || ''),
        resp: String(row[13] || ''),
        fechaCompromiso: formatDateISO(row[14]),
        prioridad: String(row[15] || ''),
        comentariosProveedor: String(row[16] || ''),
        observacionesPmo: String(row[17] || ''),
        estatus: String(row[18] || 'Pendiente'),
        trackingComentarios: String(row[19] || ''),
        estatusFirma: String(row[20] || 'Pendiente por Firmar'),
        nube: String(row[21] || ''),
        fechaCierre: formatDateISO(row[22])
      });
    }
  }
  return registros;
}

function getRegistroByNoGral(noGral) {
  var registros = getRegistros();
  var reg = null;
  for (var i = 0; i < registros.length; i++) {
    if (registros[i].noGral === Number(noGral)) {
      reg = registros[i];
      break;
    }
  }
  if (!reg) return null;

  reg.historial = getHistorialPorRegistro(noGral);
  return reg;
}

function validarRegistro(reg) {
  var errores = [];
  if (!reg.acuerdo || String(reg.acuerdo).trim() === "") {
    errores.push("El campo 'ACUERDO O AJUSTE SOLICITADO' es obligatorio.");
  }
  if (!reg.resp || String(reg.resp).trim() === "") {
    errores.push("El campo 'RESPONSABLE (RESP)' es obligatorio.");
  }
  if (!reg.prioridad || String(reg.prioridad).trim() === "") {
    errores.push("El campo 'PRIORIDAD' es obligatorio.");
  }
  if (!reg.fechaCompromiso || String(reg.fechaCompromiso).trim() === "") {
    errores.push("El campo 'FECHA COMPROMISO' es obligatorio.");
  }
  return errores;
}

function appendRegistro(registroObj) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    throw new Error("El sistema está ocupado. Intenta de nuevo en unos momentos.");
  }

  try {
    var errores = validarRegistro(registroObj);
    if (errores.length > 0) {
      throw new Error("Errores de validación: " + errores.join(" "));
    }

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Registros");

    // Calcular NO. GRAL
    var data = sheet.getDataRange().getValues();
    var maxNoGral = 0;
    for (var i = 1; i < data.length; i++) {
      var val = Number(data[i][0]);
      if (!isNaN(val) && val > maxNoGral) {
        maxNoGral = val;
      }
    }
    var newNoGral = maxNoGral + 1;

    // Generar Folio Minuta si no viene dado
    var folio = registroObj.folioMinuta;
    if (!folio || String(folio).trim() === "") {
      folio = generarFolioMinuta(
        registroObj.etapaProyecto,
        registroObj.tipoSesion,
        registroObj.fechaSesion,
        registroObj.modulo
      );
    }

    var estatus = registroObj.estatus || "Pendiente";
    var fechaCierre = registroObj.fechaCierre || "";
    if (estatus === "Resuelto" && !fechaCierre) {
      fechaCierre = formatDateISO(new Date());
    }

    var row = [
      newNoGral,
      registroObj.noEnMin || 1,
      registroObj.tipoSesion || "",
      formatDateISO(registroObj.fechaSesion),
      folio,
      registroObj.nombreMinuta || "",
      registroObj.origenAcuerdo || "Minuta",
      formatDateISO(registroObj.fechaSolicitud || registroObj.fechaSesion),
      registroObj.etapaProyecto || "",
      registroObj.modulo || "",
      registroObj.tipoObservacion || "Acuerdo",
      registroObj.acuerdo || "",
      registroObj.sol || "",
      registroObj.resp || "",
      formatDateISO(registroObj.fechaCompromiso),
      registroObj.prioridad || "Media",
      registroObj.comentariosProveedor || "",
      registroObj.observacionesPmo || "",
      estatus,
      registroObj.trackingComentarios || "",
      registroObj.estatusFirma || "Pendiente por Firmar",
      registroObj.nube || "",
      fechaCierre
    ];

    sheet.appendRow(row);

    // Registrar en Historial
    logHistorial(newNoGral, "CREACIÓN", "", "Registro Creado (Folio: " + folio + ")");

    recalcularResumenYMinutas();

    return { success: true, noGral: newNoGral, folioMinuta: folio };

  } finally {
    lock.releaseLock();
  }
}

function appendRegistrosBatch(batchData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    throw new Error("El sistema está ocupado. Intenta de nuevo en unos momentos.");
  }

  try {
    var common = batchData.common || {};
    var items = batchData.items || [];
    if (items.length === 0) {
      throw new Error("No hay elementos para registrar.");
    }

    var folio = common.folioMinuta || generarFolioMinuta(
      common.etapaProyecto,
      common.tipoSesion,
      common.fechaSesion,
      common.modulo
    );

    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Registros");
    var data = sheet.getDataRange().getValues();
    var maxNoGral = 0;
    for (var i = 1; i < data.length; i++) {
      var val = Number(data[i][0]);
      if (!isNaN(val) && val > maxNoGral) {
        maxNoGral = val;
      }
    }

    var rowsToAdd = [];
    var createdIds = [];

    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      var merged = {
        noEnMin: k + 1,
        tipoSesion: common.tipoSesion,
        fechaSesion: common.fechaSesion,
        folioMinuta: folio,
        nombreMinuta: common.nombreMinuta,
        origenAcuerdo: common.origenAcuerdo || "Minuta",
        fechaSolicitud: common.fechaSolicitud || common.fechaSesion,
        etapaProyecto: common.etapaProyecto,
        modulo: common.modulo,
        tipoObservacion: it.tipoObservacion || "Acuerdo",
        acuerdo: it.acuerdo,
        sol: it.sol || common.sol,
        resp: it.resp,
        fechaCompromiso: it.fechaCompromiso,
        prioridad: it.prioridad || "Media",
        comentariosProveedor: it.comentariosProveedor || "",
        observacionesPmo: it.observacionesPmo || "",
        estatus: it.estatus || "Pendiente",
        trackingComentarios: it.trackingComentarios || "",
        estatusFirma: it.estatusFirma || "Pendiente por Firmar",
        nube: common.nube || ""
      };

      var errores = validarRegistro(merged);
      if (errores.length > 0) {
        throw new Error("Fila " + (k + 1) + ": " + errores.join(" "));
      }

      maxNoGral++;
      var estatus = merged.estatus;
      var fechaCierre = (estatus === "Resuelto") ? formatDateISO(new Date()) : "";

      rowsToAdd.push([
        maxNoGral,
        merged.noEnMin,
        merged.tipoSesion || "",
        formatDateISO(merged.fechaSesion),
        folio,
        merged.nombreMinuta || "",
        merged.origenAcuerdo || "",
        formatDateISO(merged.fechaSolicitud),
        merged.etapaProyecto || "",
        merged.modulo || "",
        merged.tipoObservacion || "",
        merged.acuerdo || "",
        merged.sol || "",
        merged.resp || "",
        formatDateISO(merged.fechaCompromiso),
        merged.prioridad || "",
        merged.comentariosProveedor || "",
        merged.observacionesPmo || "",
        estatus,
        merged.trackingComentarios || "",
        merged.estatusFirma || "",
        merged.nube || "",
        fechaCierre
      ]);

      createdIds.push(maxNoGral);
    }

    if (rowsToAdd.length > 0) {
      var startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToAdd.length, HEADERS_REGISTROS.length).setValues(rowsToAdd);
      for (var c = 0; c < createdIds.length; c++) {
        logHistorial(createdIds[c], "CREACIÓN BATCH", "", "Registro creado en captura masiva (Folio: " + folio + ")");
      }
    }

    recalcularResumenYMinutas();

    return { success: true, count: rowsToAdd.length, folioMinuta: folio };

  } finally {
    lock.releaseLock();
  }
}

function updateRegistro(noGral, updatedFields) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    throw new Error("El sistema está ocupado. Intenta de nuevo en unos momentos.");
  }

  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Registros");
    var data = sheet.getDataRange().getValues();
    var targetRowIdx = -1;

    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][0]) === Number(noGral)) {
        targetRowIdx = i + 1;
        break;
      }
    }

    if (targetRowIdx === -1) {
      throw new Error("No se encontró el registro con NO. GRAL " + noGral);
    }

    var rowValues = sheet.getRange(targetRowIdx, 1, 1, HEADERS_REGISTROS.length).getValues()[0];

    var mapFieldsToColIdx = {
      noEnMin: 1,
      tipoSesion: 2,
      fechaSesion: 3,
      folioMinuta: 4,
      nombreMinuta: 5,
      origenAcuerdo: 6,
      fechaSolicitud: 7,
      etapaProyecto: 8,
      modulo: 9,
      tipoObservacion: 10,
      acuerdo: 11,
      sol: 12,
      resp: 13,
      fechaCompromiso: 14,
      prioridad: 15,
      comentariosProveedor: 16,
      observacionesPmo: 17,
      estatus: 18,
      trackingComentarios: 19,
      estatusFirma: 20,
      nube: 21,
      fechaCierre: 22
    };

    var mergedAcuerdo = updatedFields.acuerdo !== undefined ? updatedFields.acuerdo : rowValues[11];
    var mergedResp = updatedFields.resp !== undefined ? updatedFields.resp : rowValues[13];
    var mergedPrioridad = updatedFields.prioridad !== undefined ? updatedFields.prioridad : rowValues[15];
    var mergedFechaCompromiso = updatedFields.fechaCompromiso !== undefined ? updatedFields.fechaCompromiso : rowValues[14];

    var errores = validarRegistro({
      acuerdo: mergedAcuerdo,
      resp: mergedResp,
      prioridad: mergedPrioridad,
      fechaCompromiso: mergedFechaCompromiso
    });
    if (errores.length > 0) {
      throw new Error("Errores de validación: " + errores.join(" "));
    }

    for (var key in updatedFields) {
      var colIdx = mapFieldsToColIdx[key];
      if (colIdx !== undefined) {
        var oldVal = rowValues[colIdx];
        var newVal = updatedFields[key];

        if (key.indexOf("fecha") === 0 || key === "fechaCompromiso" || key === "fechaSolicitud" || key === "fechaSesion" || key === "fechaCierre") {
          oldVal = formatDateISO(oldVal);
          newVal = formatDateISO(newVal);
        }

        if (String(oldVal) !== String(newVal)) {
          if (key === "estatus" && newVal === "Resuelto" && !updatedFields.fechaCierre) {
            var dateCierre = formatDateISO(new Date());
            sheet.getRange(targetRowIdx, mapFieldsToColIdx["fechaCierre"] + 1).setValue(dateCierre);
            logHistorial(noGral, "FECHA CIERRE", String(rowValues[mapFieldsToColIdx["fechaCierre"]]), dateCierre);
          }

          sheet.getRange(targetRowIdx, colIdx + 1).setValue(newVal);
          logHistorial(noGral, key.toUpperCase(), String(oldVal), String(newVal));
        }
      }
    }

    recalcularResumenYMinutas();

    return { success: true, message: "Registro actualizado correctamente." };

  } finally {
    lock.releaseLock();
  }
}

function updateEstatusRapido(noGral, nuevoEstatus, nuevoEstatusFirma) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    throw new Error("El sistema está ocupado. Intenta de nuevo en unos momentos.");
  }

  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName("Registros");
    var data = sheet.getDataRange().getValues();
    var targetRowIdx = -1;
    var rowValues = null;

    for (var i = 1; i < data.length; i++) {
      if (Number(data[i][0]) === Number(noGral)) {
        targetRowIdx = i + 1;
        rowValues = data[i];
        break;
      }
    }

    if (targetRowIdx === -1) {
      throw new Error("No se encontró el registro con NO. GRAL " + noGral);
    }

    var oldEstatus = String(rowValues[18] || '');
    var oldFirma = String(rowValues[20] || '');

    if (nuevoEstatus && oldEstatus !== nuevoEstatus) {
      sheet.getRange(targetRowIdx, 19).setValue(nuevoEstatus); // Col 19 = ESTATUS
      logHistorial(noGral, "ESTATUS (RÁPIDO)", oldEstatus, nuevoEstatus);

      if (nuevoEstatus === "Resuelto") {
        var fechaHoy = formatDateISO(new Date());
        var oldFechaCierre = formatDateISO(rowValues[22]);
        sheet.getRange(targetRowIdx, 23).setValue(fechaHoy); // Col 23 = FECHA CIERRE
        logHistorial(noGral, "FECHA CIERRE", oldFechaCierre, fechaHoy);
      }
    }

    if (nuevoEstatusFirma && oldFirma !== nuevoEstatusFirma) {
      sheet.getRange(targetRowIdx, 21).setValue(nuevoEstatusFirma); // Col 21 = ESTATUS DE FIRMA
      logHistorial(noGral, "ESTATUS DE FIRMA (RÁPIDO)", oldFirma, nuevoEstatusFirma);
    }

    recalcularResumenYMinutas();

    return { success: true, message: "Estatus actualizado rápidamente." };

  } finally {
    lock.releaseLock();
  }
}

function importarDesdeHoja(dataArray) {
  if (!dataArray || dataArray.length === 0) {
    throw new Error("No se recibieron datos para importar.");
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    throw new Error("Servicio bloqueado por concurrencia. Intenta más tarde.");
  }

  try {
    var count = 0;
    for (var i = 0; i < dataArray.length; i++) {
      var item = dataArray[i];
      appendRegistro({
        noEnMin: item.noEnMin || item["NO. EN MIN"] || 1,
        tipoSesion: item.tipoSesion || item["TIPO DE SESIÓN"] || "PMO",
        fechaSesion: item.fechaSesion || item["FECHA DE SESIÓN"] || formatDateISO(new Date()),
        folioMinuta: item.folioMinuta || item["FOLIO MINUTA"] || "",
        nombreMinuta: item.nombreMinuta || item["NOMBRE DE MINUTA"] || "Minuta Importada",
        origenAcuerdo: item.origenAcuerdo || item["ORIGEN DEL ACUERDO"] || "Minuta",
        fechaSolicitud: item.fechaSolicitud || item["FECHA SOLICITUD"] || formatDateISO(new Date()),
        etapaProyecto: item.etapaProyecto || item["ETAPA PROYECTO"] || "",
        modulo: item.modulo || item["MÓDULO"] || "",
        tipoObservacion: item.tipoObservacion || item["TIPO DE OBSERVACIÓN"] || "Acuerdo",
        acuerdo: item.acuerdo || item["ACUERDO O AJUSTE SOLICITADO"] || "Sin detalle",
        sol: item.sol || item["SOL"] || "",
        resp: item.resp || item["RESP"] || "Por Asignar",
        fechaCompromiso: item.fechaCompromiso || item["FECHA COMPROMISO"] || formatDateISO(new Date()),
        prioridad: item.prioridad || item["PRIORIDAD"] || "Media",
        comentariosProveedor: item.comentariosProveedor || item["COMENTARIOS PROVEEDOR"] || "",
        observacionesPmo: item.observacionesPmo || item["OBSERVACIONES PMO"] || "",
        estatus: item.estatus || item["ESTATUS"] || "Pendiente",
        trackingComentarios: item.trackingComentarios || item["TRACKING COMENTARIOS"] || "",
        estatusFirma: item.estatusFirma || item["ESTATUS DE FIRMA"] || "Pendiente por Firmar",
        nube: item.nube || item["NUBE"] || ""
      });
      count++;
    }
    return { success: true, count: count, message: count + " registros importados exitosamente." };
  } finally {
    lock.releaseLock();
  }
}

function logHistorial(noGral, campo, valorAnterior, valorNuevo) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Historial");
  if (!sheet) return;

  var user = "Usuario Web";
  try {
    user = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail() || "Usuario Web";
  } catch (e) {
    user = "Usuario Web";
  }

  var fechaHora = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone() || "GMT-6", "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([
    fechaHora,
    user,
    noGral,
    campo,
    valorAnterior || "",
    valorNuevo || ""
  ]);
}

function getHistorialPorRegistro(noGral) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Historial");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var list = [];
  for (var i = 1; i < data.length; i++) {
    if (Number(data[i][2]) === Number(noGral)) {
      list.push({
        fecha: String(data[i][0]),
        usuario: String(data[i][1]),
        noGral: Number(data[i][2]),
        campo: String(data[i][3]),
        valorAnterior: String(data[i][4]),
        valorNuevo: String(data[i][5])
      });
    }
  }
  return list;
}
