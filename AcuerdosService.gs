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
  try {
    const acuerdos = getSheetDataAsObjects('Acuerdos');
    const minutas = getSheetDataAsObjects('Minutas');
    const proyectos = getSheetDataAsObjects('Proyectos');

    const minutasMap = {};
    minutas.forEach(m => minutasMap[m.id_minuta] = m);

    const proyectosMap = {};
    proyectos.forEach(p => proyectosMap[p.id_proyecto] = p.nombre);

    const result = acuerdos.map(ac => {
      const minuta = minutasMap[ac.id_minuta] || {};
      const nombreProyecto = proyectosMap[minuta.id_proyecto] || 'Sin Proyecto';
      const estadoCalculado = calcularEstadoAcuerdo(ac.fecha_cumplimiento, ac.estado);

      return {
        ...ac,
        titulo_minuta: minuta.titulo || 'Sin Minuta',
        id_proyecto: minuta.id_proyecto || '',
        nombre_proyecto: nombreProyecto,
        estado_calculado: estadoCalculado
      };
    });

    return buildResponse(true, result, 'Acuerdos cargados exitosamente.');
  } catch (error) {
    return buildResponse(false, null, 'Error al cargar acuerdos: ' + error.toString());
  }
}

function actualizarEstadoAcuerdo(idAcuerdo, nuevoEstado, motivoCancelacion) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Acuerdos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === idAcuerdo) {
        sheet.getRange(i + 1, 7).setValue(nuevoEstado);
        if (nuevoEstado === 'Cancelado') {
          sheet.getRange(i + 1, 8).setValue(motivoCancelacion || '');
        }
        return buildResponse(true, { id_acuerdo: idAcuerdo, nuevo_estado: nuevoEstado }, 'Estado de acuerdo actualizado.');
      }
    }

    return buildResponse(false, null, 'Acuerdo no encontrado.');
  } catch (error) {
    return buildResponse(false, null, 'Error al actualizar acuerdo: ' + error.toString());
  }
}
