/**
 * ProyectosService.gs - Servicio para operaciones CRUD de Proyectos.
 */

function obtenerProyectos() {
  try {
    const proyectos = getSheetDataAsObjects('Proyectos');
    return buildResponse(true, proyectos, 'Proyectos obtenidos correctamente.');
  } catch (error) {
    return buildResponse(false, null, 'Error al obtener proyectos: ' + error.toString());
  }
}

function guardarProyecto(proyectoData) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Proyectos');
    const data = sheet.getDataRange().getValues();

    let isEdit = false;
    let rowIndex = -1;

    if (proyectoData.id_proyecto) {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === proyectoData.id_proyecto) {
          isEdit = true;
          rowIndex = i + 1;
          break;
        }
      }
    }

    if (isEdit) {
      sheet.getRange(rowIndex, 2).setValue(proyectoData.nombre);
      sheet.getRange(rowIndex, 3).setValue(proyectoData.descripcion || '');
      sheet.getRange(rowIndex, 5).setValue(proyectoData.estado || 'Activo');
      return buildResponse(true, { id_proyecto: proyectoData.id_proyecto }, 'Proyecto actualizado exitosamente.');
    } else {
      const newId = generateId();
      const fechaCreacion = formatDateISO(new Date());
      const rootFolder = getOrCreateRootFolder();
      const projectFolder = rootFolder.createFolder(proyectoData.nombre + '_' + newId.substring(0, 8));

      sheet.appendRow([
        newId,
        proyectoData.nombre,
        proyectoData.descripcion || '',
        fechaCreacion,
        proyectoData.estado || 'Activo',
        projectFolder.getId()
      ]);

      return buildResponse(true, { id_proyecto: newId }, 'Proyecto creado exitosamente.');
    }
  } catch (error) {
    return buildResponse(false, null, 'Error al guardar el proyecto: ' + error.toString());
  }
}

function eliminarProyecto(idProyecto) {
  try {
    const minutas = getSheetDataAsObjects('Minutas');
    const minutasAsociadas = minutas.filter(m => m.id_proyecto === idProyecto);
    if (minutasAsociadas.length > 0) {
      return buildResponse(false, null, 'No se puede eliminar el proyecto porque tiene ' + minutasAsociadas.length + ' minuta(s) asociada(s).');
    }

    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName('Proyectos');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === idProyecto) {
        sheet.deleteRow(i + 1);
        return buildResponse(true, null, 'Proyecto eliminado correctamente.');
      }
    }

    return buildResponse(false, null, 'Proyecto no encontrado.');
  } catch (error) {
    return buildResponse(false, null, 'Error al eliminar el proyecto: ' + error.toString());
  }
}
