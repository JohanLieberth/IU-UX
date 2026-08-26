/**
 * AcuerdosService.gs - Lógica de estados y seguimiento de acuerdos.
 */

function calcularEstadoAcuerdo(fechaCumplimiento, estadoActual) {
  if (estadoActual === 'Atendido' || estadoActual === 'Cancelado') {
    return estadoActual;
  }

  if (!fechaCumplimiento) {
    return estadoActual || 'Pendiente';
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaLimite = (fechaCumplimiento instanceof Date) ? new Date(fechaCumplimiento) : new Date(fechaCumplimiento);
  fechaLimite.setHours(0, 0, 0, 0);

  if (isNaN(fechaLimite.getTime())) {
    return estadoActual || 'Pendiente';
  }

  const diffTime = fechaLimite.getTime() - hoy.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Vencido';
  } else if (diffDays >= 0 && diffDays <= 3) {
    return 'Por vencer';
  } else {
    return 'Pendiente';
  }
}

function obtenerAcuerdosConEstado() {
  return obtenerAcuerdosFiltrados({});
}

/**
 * Obtiene y filtra los acuerdos directamente desde la pestaña Acuerdos de DB_Sistema_Minutas_Seguimiento.
 * @param {Object} filtros
 * @returns {string} JSON
 */
function obtenerAcuerdosFiltrados(filtros) {
  try {
    if (!filtros) filtros = {};

    const acuerdos = getSheetDataAsObjects('Acuerdos');
    const minutas = getSheetDataAsObjects('Minutas');
    const proyectos = getSheetDataAsObjects('Proyectos');

    const minutasMap = {};
    minutas.forEach(m => minutasMap[m.id_minuta] = m);

    const proyectosMap = {};
    proyectos.forEach(p => proyectosMap[p.id_proyecto] = p.nombre);

    const fProyecto = (filtros.id_proyecto || '').toString().trim();
    const fEstado = (filtros.estado || '').toString().trim();
    const fResponsable = (filtros.responsable || '').toString().trim().toLowerCase();
    const fFechaInicio = (filtros.fecha_inicio || '').toString().trim();
    const fFechaFin = (filtros.fecha_fin || '').toString().trim();
    const fTexto = (filtros.texto || '').toString().trim().toLowerCase();

    const result = [];

    acuerdos.forEach(ac => {
      const minuta = minutasMap[ac.id_minuta] || {};
      const idProyecto = (minuta.id_proyecto || '').toString();
      const nombreProyecto = proyectosMap[idProyecto] || 'Sin Proyecto';
      const estadoCalculado = calcularEstadoAcuerdo(ac.fecha_cumplimiento, ac.estado);
      const fechaISO = formatDateISO(ac.fecha_cumplimiento);

      if (fProyecto && idProyecto !== fProyecto) {
        return;
      }

      if (fEstado && estadoCalculado !== fEstado) {
        return;
      }

      if (fResponsable) {
        const respList = (ac.responsable || '').toString().toLowerCase().split(',').map(s => s.trim());
        if (!respList.includes(fResponsable) && !respList.includes('todos')) {
          return;
        }
      }

      if (fFechaInicio && fechaISO && fechaISO < fFechaInicio) {
        return;
      }

      if (fFechaFin && fechaISO && fechaISO > fFechaFin) {
        return;
      }

      if (fTexto) {
        const desc = (ac.descripcion || '').toString().toLowerCase();
        if (!desc.includes(fTexto)) {
          return;
        }
      }

      result.push({
        ...ac,
        tipo: ac.tipo || 'Acuerdo',
        titulo_minuta: minuta.titulo || 'Sin Minuta',
        id_proyecto: idProyecto,
        nombre_proyecto: nombreProyecto,
        estado_calculado: estadoCalculado
      });
    });

    return buildResponse(true, result, 'Acuerdos filtrados cargados exitosamente.');
  } catch (error) {
    return buildResponse(false, null, 'Error al filtrar acuerdos: ' + error.toString());
  }
}

function actualizarEstadoAcuerdo(idAcuerdo, nuevoEstado, motivoCancelacion) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Acuerdos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === idAcuerdo) {
        sheet.getRange(i + 1, 8).setValue(nuevoEstado);
        if (nuevoEstado === 'Cancelado') {
          sheet.getRange(i + 1, 9).setValue(motivoCancelacion || '');
        }
        return buildResponse(true, { id_acuerdo: idAcuerdo, nuevo_estado: nuevoEstado }, 'Estado de acuerdo actualizado.');
      }
    }

    return buildResponse(false, null, 'Acuerdo no encontrado.');
  } catch (error) {
    return buildResponse(false, null, 'Error al actualizar acuerdo: ' + error.toString());
  }
}
