/**
 * Summary calculations and reporting functions
 */

function getResumenDashboard() {
  var registros = getRegistros();
  var todayStr = formatDateISO(new Date());

  var totalAcuerdos = registros.length;
  var pendientes = 0;
  var resueltos = 0;
  var pendientesPorFirmar = 0;
  var informativos = 0;
  var vencidos = 0;

  var moduloMap = {};
  var respMap = {};

  for (var i = 0; i < registros.length; i++) {
    var r = registros[i];
    var estatus = r.estatus || "Pendiente";
    var modulo = r.modulo || "Sin Módulo";
    var resp = r.resp || "Sin Asignar";

    if (estatus === "Pendiente") {
      pendientes++;
      if (r.fechaCompromiso && r.fechaCompromiso < todayStr) {
        vencidos++;
      }
    } else if (estatus === "Resuelto") {
      resueltos++;
    } else if (estatus === "Informativo") {
      informativos++;
    }

    if (r.estatusFirma === "Pendiente por Firmar") {
      pendientesPorFirmar++;
    }

    // Módulo Stats
    if (!moduloMap[modulo]) {
      moduloMap[modulo] = { pendientes: 0, resueltos: 0, informativos: 0, total: 0 };
    }
    moduloMap[modulo].total++;
    if (estatus === "Pendiente") moduloMap[modulo].pendientes++;
    else if (estatus === "Resuelto") moduloMap[modulo].resueltos++;
    else if (estatus === "Informativo") moduloMap[modulo].informativos++;

    // Responsable Stats
    if (!respMap[resp]) {
      respMap[resp] = { asignados: 0, resueltos: 0 };
    }
    respMap[resp].asignados++;
    if (estatus === "Resuelto") {
      respMap[resp].resueltos++;
    }
  }

  var resumenPorModulo = [];
  for (var modKey in moduloMap) {
    resumenPorModulo.push({
      modulo: modKey,
      pendientes: moduloMap[modKey].pendientes,
      resueltos: moduloMap[modKey].resueltos,
      informativos: moduloMap[modKey].informativos,
      total: moduloMap[modKey].total
    });
  }

  var resumenPorResponsable = [];
  for (var respKey in respMap) {
    var asig = respMap[respKey].asignados;
    var res = respMap[respKey].resueltos;
    var pct = asig > 0 ? Math.round((res / asig) * 100) : 0;
    resumenPorResponsable.push({
      responsable: respKey,
      asignados: asig,
      resueltos: res,
      porcentaje: pct + "%"
    });
  }

  return {
    kpis: {
      totalAcuerdos: totalAcuerdos,
      pendientes: pendientes,
      resueltos: resueltos,
      pendientesPorFirmar: pendientesPorFirmar,
      vencidos: vencidos,
      informativos: informativos
    },
    resumenPorModulo: resumenPorModulo,
    resumenPorResponsable: resumenPorResponsable
  };
}

function recalcularResumen() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Resumen");
  if (!sheet) {
    sheet = ss.insertSheet("Resumen");
  }

  sheet.clearContents();

  var dataDash = getResumenDashboard();

  // Title 1: Resumen por Módulo
  sheet.getRange("A1").setValue("RESUMEN DE ACUERDOS Y AJUSTES POR MÓDULO").setFontWeight("bold").setFontSize(12).setBackground("#1A365D").setFontColor("#FFFFFF");
  sheet.getRange("A1:E1").merge();

  var modHeaders = [["MÓDULO", "PENDIENTES", "RESUELTOS", "INFORMATIVOS", "TOTAL"]];
  sheet.getRange(2, 1, 1, 5).setValues(modHeaders).setFontWeight("bold").setBackground("#2B6CB0").setFontColor("#FFFFFF");

  var modRows = [];
  for (var i = 0; i < dataDash.resumenPorModulo.length; i++) {
    var m = dataDash.resumenPorModulo[i];
    modRows.push([m.modulo, m.pendientes, m.resueltos, m.informativos, m.total]);
  }

  var curRow = 3;
  if (modRows.length > 0) {
    sheet.getRange(curRow, 1, modRows.length, 5).setValues(modRows);
    curRow += modRows.length + 2;
  } else {
    curRow += 2;
  }

  // Title 2: Resumen por Responsable
  sheet.getRange(curRow, 1).setValue("RESUMEN DE CUMPLIMIENTO POR RESPONSABLE").setFontWeight("bold").setFontSize(12).setBackground("#1A365D").setFontColor("#FFFFFF");
  sheet.getRange(curRow, 1, 1, 4).merge();
  curRow++;

  var respHeaders = [["RESPONSABLE", "ASIGNADOS", "RESUELTOS", "% CUMPLIMIENTO"]];
  sheet.getRange(curRow, 1, 1, 4).setValues(respHeaders).setFontWeight("bold").setBackground("#2B6CB0").setFontColor("#FFFFFF");
  curRow++;

  var respRows = [];
  for (var j = 0; j < dataDash.resumenPorResponsable.length; j++) {
    var r = dataDash.resumenPorResponsable[j];
    respRows.push([r.responsable, r.asignados, r.resueltos, r.porcentaje]);
  }

  if (respRows.length > 0) {
    sheet.getRange(curRow, 1, respRows.length, 4).setValues(respRows);
  }
}

function recalcularResumenYMinutas() {
  recalcularMinutas();
  recalcularResumen();
}

/**
 * PDF generation handler for printable summary or minuta view
 */
function exportarResumenPDFHtml(htmlContent) {
  var blob = Utilities.newBlob(htmlContent, 'text/html', 'Reporte_Acuerdos.html');
  var pdfBlob = blob.getAs('application/pdf').setName('Reporte_Acuerdos_PMO.pdf');
  return "data:application/pdf;base64," + Utilities.base64Encode(pdfBlob.getBytes());
}
