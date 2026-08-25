/**
 * MinutasService.gs - Servicio para operaciones de Minutas, Asistencia, Orden del Día y Acuerdos.
 */

function obtenerMinutas() {
  try {
    const minutas = getSheetDataAsObjects('Minutas');
    const proyectos = getSheetDataAsObjects('Proyectos');

    const proyectosMap = {};
    proyectos.forEach(p => proyectosMap[p.id_proyecto] = p.nombre);

    const result = minutas.map(m => ({
      ...m,
      nombre_proyecto: proyectosMap[m.id_proyecto] || 'Proyecto Desconocido'
    }));

    return buildResponse(true, result, 'Minutas obtenidas correctamente.');
  } catch (error) {
    return buildResponse(false, null, 'Error al obtener minutas: ' + error.toString());
  }
}

function obtenerDetalleMinuta(idMinuta) {
  try {
    const minutas = getSheetDataAsObjects('Minutas');
    const minuta = minutas.find(m => m.id_minuta === idMinuta);

    if (!minuta) {
      return buildResponse(false, null, 'Minuta no encontrada.');
    }

    const asistencia = getSheetDataAsObjects('Asistencia').filter(a => a.id_minuta === idMinuta);
    const ordenDelDia = getSheetDataAsObjects('OrdenDelDia').filter(o => o.id_minuta === idMinuta);
    const acuerdos = getSheetDataAsObjects('Acuerdos').filter(ac => ac.id_minuta === idMinuta);

    const acuerdosConEstado = acuerdos.map(ac => ({
      ...ac,
      estado_calculado: calcularEstadoAcuerdo(ac.fecha_cumplimiento, ac.estado)
    }));

    return buildResponse(true, {
      minuta: minuta,
      asistencia: asistencia,
      ordenDelDia: ordenDelDia,
      acuerdos: acuerdosConEstado
    }, 'Detalle de minuta obtenido.');
  } catch (error) {
    return buildResponse(false, null, 'Error al obtener detalle de la minuta: ' + error.toString());
  }
}

function guardarMinutaCompleta(payload) {
  try {
    const ss = getSpreadsheet();
    const minutasSheet = ss.getSheetByName('Minutas');
    const asistenciaSheet = ss.getSheetByName('Asistencia');
    const ordenSheet = ss.getSheetByName('OrdenDelDia');
    const acuerdosSheet = ss.getSheetByName('Acuerdos');

    const minData = payload.minuta;
    let isEdit = false;
    let idMinuta = minData.id_minuta;

    if (idMinuta) {
      isEdit = true;
    } else {
      idMinuta = generateId();
    }

    const fechaCreacion = isEdit ? minData.fecha_creacion : formatDateISO(new Date());

    if (isEdit) {
      const rows = minutasSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === idMinuta) {
          minutasSheet.getRange(i + 1, 2).setValue(minData.id_proyecto);
          minutasSheet.getRange(i + 1, 3).setValue(minData.titulo);
          minutasSheet.getRange(i + 1, 4).setValue(formatDateISO(minData.fecha_reunion));
          minutasSheet.getRange(i + 1, 5).setValue(minData.lugar || '');
          minutasSheet.getRange(i + 1, 6).setValue(minData.objetivo || '');
          break;
        }
      }
      limpiarRelacionesMinuta(idMinuta);
    } else {
      minutasSheet.appendRow([
        idMinuta,
        minData.id_proyecto,
        minData.titulo,
        formatDateISO(minData.fecha_reunion),
        minData.lugar || '',
        minData.objetivo || '',
        '',
        '',
        fechaCreacion
      ]);
    }

    if (Array.isArray(payload.asistencia)) {
      payload.asistencia.forEach((item, index) => {
        asistenciaSheet.appendRow([
          generateId(),
          idMinuta,
          index + 1,
          item.nombre,
          item.dependencia || '',
          item.ap ? true : false,
          item.at ? true : false,
          item.na ? true : false
        ]);
      });
    }

    if (Array.isArray(payload.ordenDelDia)) {
      payload.ordenDelDia.forEach((item, index) => {
        ordenSheet.appendRow([
          generateId(),
          idMinuta,
          index + 1,
          item.descripcion
        ]);
      });
    }

    if (Array.isArray(payload.acuerdos)) {
      payload.acuerdos.forEach((item, index) => {
        acuerdosSheet.appendRow([
          generateId(),
          idMinuta,
          index + 1,
          item.descripcion,
          item.responsable,
          formatDateISO(item.fecha_cumplimiento),
          item.estado || 'Pendiente',
          item.motivo_cancelacion || ''
        ]);
      });
    }

    return buildResponse(true, { id_minuta: idMinuta }, 'Minuta guardada exitosamente.');
  } catch (error) {
    return buildResponse(false, null, 'Error al guardar la minuta: ' + error.toString());
  }
}

function limpiarRelacionesMinuta(idMinuta) {
  const ss = getSpreadsheet();
  ['Asistencia', 'OrdenDelDia', 'Acuerdos'].forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][1] === idMinuta) {
        sheet.deleteRow(i + 1);
      }
    }
  });
}

function eliminarMinuta(idMinuta) {
  try {
    const ss = getSpreadsheet();
    limpiarRelacionesMinuta(idMinuta);

    const minutasSheet = ss.getSheetByName('Minutas');
    const data = minutasSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === idMinuta) {
        minutasSheet.deleteRow(i + 1);
        break;
      }
    }

    return buildResponse(true, null, 'Minuta eliminada correctamente.');
  } catch (error) {
    return buildResponse(false, null, 'Error al eliminar la minuta: ' + error.toString());
  }
}
