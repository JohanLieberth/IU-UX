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
      folio: m.folio || 'N/A',
      etapa: m.etapa || '',
      dependencia: m.dependencia || '',
      subdireccion: m.subdireccion || '',
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

    minuta.folio = minuta.folio || 'N/A';
    minuta.etapa = minuta.etapa || '';
    minuta.dependencia = minuta.dependencia || '';
    minuta.subdireccion = minuta.subdireccion || '';

    const asistencia = getSheetDataAsObjects('Asistencia').filter(a => a.id_minuta === idMinuta);
    const ordenDelDia = getSheetDataAsObjects('OrdenDelDia').filter(o => o.id_minuta === idMinuta);
    const acuerdos = getSheetDataAsObjects('Acuerdos').filter(ac => ac.id_minuta === idMinuta);

    const acuerdosConEstado = acuerdos.map(ac => ({
      ...ac,
      prioridad: ac.prioridad || 'Media',
      solicitante: ac.solicitante || '',
      responsable: ac.responsable || '',
      tracking: ac.tracking || '',
      num_acuerdo_anterior: ac.num_acuerdo_anterior || '',
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
    setupDatabase(ss);

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

    const fechaCreacion = isEdit ? (minData.fecha_creacion || formatDateISO(new Date())) : formatDateISO(new Date());

    const minHeaders = minutasSheet.getRange(1, 1, 1, Math.max(1, minutasSheet.getLastColumn())).getValues()[0];
    const minRowData = {
      id_minuta: idMinuta,
      folio: minData.folio || '',
      id_proyecto: minData.id_proyecto || '',
      etapa: minData.etapa || '',
      dependencia: minData.dependencia || '',
      subdireccion: minData.subdireccion || '',
      titulo: minData.titulo || '',
      fecha_reunion: formatDateISO(minData.fecha_reunion),
      lugar: minData.lugar || '',
      objetivo: minData.objetivo || '',
      doc_url: isEdit ? (minData.doc_url || '') : '',
      pdf_url: isEdit ? (minData.pdf_url || '') : '',
      fecha_creacion: fechaCreacion
    };

    if (isEdit) {
      const rows = minutasSheet.getDataRange().getValues();
      const idColIdx = minHeaders.indexOf('id_minuta');
      let targetRow = -1;

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColIdx >= 0 ? idColIdx : 0] === idMinuta) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow > 0) {
        minHeaders.forEach((h, colIdx) => {
          if (minRowData[h] !== undefined && h !== 'id_minuta') {
            minutasSheet.getRange(targetRow, colIdx + 1).setValue(minRowData[h]);
          }
        });
      }
      limpiarRelacionesMinuta(idMinuta);
    } else {
      const rowVal = minHeaders.map(h => minRowData[h] !== undefined ? minRowData[h] : '');
      minutasSheet.appendRow(rowVal);
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
      const acHeaders = acuerdosSheet.getRange(1, 1, 1, Math.max(1, acuerdosSheet.getLastColumn())).getValues()[0];
      payload.acuerdos.forEach((item, index) => {
        const acRowData = {
          id_acuerdo: generateId(),
          id_minuta: idMinuta,
          numero: index + 1,
          tipo: item.tipo || 'Acuerdo',
          descripcion: item.descripcion || '',
          prioridad: item.prioridad || 'Media',
          solicitante: item.solicitante || '',
          responsable: item.responsable || '',
          tracking: item.tracking || '',
          num_acuerdo_anterior: item.num_acuerdo_anterior || '',
          fecha_cumplimiento: formatDateISO(item.fecha_cumplimiento),
          estado: item.estado || 'Pendiente',
          motivo_cancelacion: item.motivo_cancelacion || ''
        };
        const rowVal = acHeaders.map(h => acRowData[h] !== undefined ? acRowData[h] : '');
        acuerdosSheet.appendRow(rowVal);
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
