/**
 * Minutas control and calculations
 */

function getMinutas() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Minutas");
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var list = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (row[0]) {
      list.push({
        folioMinuta: String(row[0]),
        fechaSesion: formatDateISO(row[1]),
        tipoSesion: String(row[2] || ''),
        nombreMinuta: String(row[3] || ''),
        totalAcuerdos: Number(row[4] || 0),
        totalAjustesTecnicos: Number(row[5] || 0),
        totalInformativos: Number(row[6] || 0),
        totalDudas: Number(row[7] || 0),
        totalGeneral: Number(row[8] || 0),
        firma: String(row[9] || 'Pendiente por Firmar')
      });
    }
  }
  return list;
}

function getMinutaDetalle(folioMinuta) {
  var registros = getRegistros();
  var filtered = registros.filter(function(r) {
    return r.folioMinuta === folioMinuta;
  });

  var header = null;
  if (filtered.length > 0) {
    header = {
      folioMinuta: filtered[0].folioMinuta,
      nombreMinuta: filtered[0].nombreMinuta,
      fechaSesion: filtered[0].fechaSesion,
      tipoSesion: filtered[0].tipoSesion,
      etapaProyecto: filtered[0].etapaProyecto,
      modulo: filtered[0].modulo,
      sol: filtered[0].sol,
      nube: filtered[0].nube
    };
  }

  return {
    header: header,
    acuerdos: filtered
  };
}

function recalcularMinutas() {
  var registros = getRegistros();
  var minutasMap = {};

  for (var i = 0; i < registros.length; i++) {
    var r = registros[i];
    var folio = r.folioMinuta || "SIN_FOLIO";

    if (!minutasMap[folio]) {
      minutasMap[folio] = {
        folioMinuta: folio,
        fechaSesion: r.fechaSesion,
        tipoSesion: r.tipoSesion,
        nombreMinuta: r.nombreMinuta,
        totalAcuerdos: 0,
        totalAjustesTecnicos: 0,
        totalInformativos: 0,
        totalDudas: 0,
        totalGeneral: 0,
        firmadosCount: 0
      };
    }

    var m = minutasMap[folio];
    m.totalGeneral++;

    var tipoObs = (r.tipoObservacion || '').toLowerCase();
    if (tipoObs.indexOf("acuerdo") !== -1) {
      m.totalAcuerdos++;
    } else if (tipoObs.indexOf("ajuste") !== -1 || tipoObs.indexOf("técnico") !== -1 || tipoObs.indexOf("tecnico") !== -1) {
      m.totalAjustesTecnicos++;
    } else if (tipoObs.indexOf("informativo") !== -1) {
      m.totalInformativos++;
    } else if (tipoObs.indexOf("duda") !== -1) {
      m.totalDudas++;
    } else {
      m.totalAcuerdos++;
    }

    if (r.estatusFirma === "Firmado") {
      m.firmadosCount++;
    }
  }

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Minutas");
  if (!sheet) {
    sheet = ss.insertSheet("Minutas");
  }

  // Clear existing content except header
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).clearContent();
  }

  var headersMinutas = [
    "FOLIO MINUTA", "FECHA SESIÓN", "TIPO DE SESIÓN", "NOMBRE MINUTA",
    "TOTAL ACUERDOS", "TOTAL AJUSTES TÉCNICOS", "TOTAL INFORMATIVOS", "TOTAL DUDAS",
    "TOTAL GENERAL", "FIRMA"
  ];
  sheet.getRange(1, 1, 1, headersMinutas.length).setValues([headersMinutas])
       .setFontWeight("bold").setBackground("#2B6CB0").setFontColor("#FFFFFF");

  var rows = [];
  for (var folioKey in minutasMap) {
    var mObj = minutasMap[folioKey];
    var firmaEstado = (mObj.firmadosCount === mObj.totalGeneral && mObj.totalGeneral > 0) ? "Firmado" : "Pendiente por Firmar";
    rows.push([
      mObj.folioMinuta,
      mObj.fechaSesion,
      mObj.tipoSesion,
      mObj.nombreMinuta,
      mObj.totalAcuerdos,
      mObj.totalAjustesTecnicos,
      mObj.totalInformativos,
      mObj.totalDudas,
      mObj.totalGeneral,
      firmaEstado
    ]);
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 10).setValues(rows);
  }
}
