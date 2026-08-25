/**
 * DocumentService.gs - Generación de Documentos Google Docs y PDF con Área de Firmas.
 */

/**
 * Genera el documento de Google Docs y PDF para una minuta específica.
 * @param {string} idMinuta
 * @returns {string} JSON con URLs de Docs y PDF
 */
function generarDocumentoMinuta(idMinuta) {
  try {
    // 1. Obtener datos completos de la minuta
    const resDetalle = JSON.parse(obtenerDetalleMinuta(idMinuta));
    if (!resDetalle.success || !resDetalle.data) {
      throw new Error(resDetalle.message || 'No se pudieron obtener los datos de la minuta.');
    }

    const { minuta, asistencia, ordenDelDia, acuerdos } = resDetalle.data;

    // Obtener información del proyecto para determinar la carpeta de almacenamiento
    const proyectos = getSheetDataAsObjects('Proyectos');
    const proyecto = proyectos.find(p => p.id_proyecto === minuta.id_proyecto) || {};
    const nombreProyecto = proyecto.nombre || 'General';

    // Determinar la carpeta de destino en Drive
    let targetFolder;
    if (proyecto.folder_id) {
      try {
        targetFolder = DriveApp.getFolderById(proyecto.folder_id);
      } catch(e) {
        targetFolder = getOrCreateRootFolder();
      }
    } else {
      targetFolder = getOrCreateRootFolder();
    }

    // 2. Crear Documento Google Docs
    const docTitle = `Minuta ${nombreProyecto} – ${formatDateDisplay(minuta.fecha_reunion)}`;
    const doc = DocumentApp.create(docTitle);
    const body = doc.getBody();

    // Configuración de Márgenes (en puntos: 36 pt = 0.5 pulg, 54 pt = 0.75 pulg)
    body.setMarginTop(36);
    body.setMarginBottom(36);
    body.setMarginLeft(54);
    body.setMarginRight(54);

    // Color primario corporativo: Azul Marino (#1e3a8a)
    const primaryColor = '#1e3a8a';
    const textColor = '#333333';

    // -------------------------------------------------------------
    // ENCABEZADO Y TÍTULO
    // -------------------------------------------------------------
    const headerTitle = body.appendParagraph(docTitle.toUpperCase());
    headerTitle.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    headerTitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    headerTitle.getAttributes();
    headerTitle.setFontFamily('Arial');
    headerTitle.setFontSize(16);
    headerTitle.setBold(true);
    headerTitle.setForegroundColor(primaryColor);

    body.appendParagraph(''); // Espaciador

    // Tabla de Metadatos de la reunión
    const metaTableData = [
      ['Proyecto:', nombreProyecto],
      ['Fecha de Reunión:', formatDateDisplay(minuta.fecha_reunion)],
      ['Lugar:', minuta.lugar || 'N/A'],
      ['Objetivo:', minuta.objetivo || 'N/A']
    ];

    const metaTable = body.appendTable(metaTableData);
    metaTable.setBorderColor('#CBD5E1');
    for (let r = 0; r < metaTable.getNumRows(); r++) {
      const row = metaTable.getRow(r);
      row.getCell(0).setBold(true).setBackgroundColor('#F1F5F9').setWidth(120);
      row.getCell(1).setWidth(380);
    }

    body.appendParagraph(''); // Espaciador

    // -------------------------------------------------------------
    // 2. LISTA DE ASISTENCIA
    // -------------------------------------------------------------
    const sec1Heading = body.appendParagraph('2. LISTA DE ASISTENCIA');
    sec1Heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    sec1Heading.setFontSize(12).setBold(true).setForegroundColor(primaryColor);

    const asistenciaTableData = [
      ['No.', 'Nombre', 'Dependencia', 'AP', 'AT', 'NA']
    ];

    if (asistencia && asistencia.length > 0) {
      asistencia.forEach((item, idx) => {
        asistenciaTableData.push([
          String(idx + 1),
          item.nombre || '',
          item.dependencia || '',
          item.ap ? '☑' : '☐',
          item.at ? '☑' : '☐',
          item.na ? '☑' : '☐'
        ]);
      });
    } else {
      asistenciaTableData.push(['-', 'Sin asistentes registrados', '-', '-', '-', '-']);
    }

    const asistenciaTable = body.appendTable(asistenciaTableData);
    formatTableStandard(asistenciaTable, [30, 180, 150, 45, 45, 45], true);

    body.appendParagraph('');

    // -------------------------------------------------------------
    // 3. ORDEN DEL DÍA
    // -------------------------------------------------------------
    const sec2Heading = body.appendParagraph('3. ORDEN DEL DÍA');
    sec2Heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    sec2Heading.setFontSize(12).setBold(true).setForegroundColor(primaryColor);

    const ordenTableData = [
      ['No.', 'Descripción']
    ];

    if (ordenDelDia && ordenDelDia.length > 0) {
      ordenDelDia.forEach((item, idx) => {
        ordenTableData.push([
          String(idx + 1),
          item.descripcion || ''
        ]);
      });
    } else {
      ordenTableData.push(['-', 'Sin puntos registrados']);
    }

    const ordenTable = body.appendTable(ordenTableData);
    formatTableStandard(ordenTable, [40, 450]);

    body.appendParagraph('');

    // -------------------------------------------------------------
    // 4. ACCIONES Y ACUERDOS
    // -------------------------------------------------------------
    const sec3Heading = body.appendParagraph('4. ACCIONES Y ACUERDOS');
    sec3Heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    sec3Heading.setFontSize(12).setBold(true).setForegroundColor(primaryColor);

    const acuerdosTableData = [
      ['No.', 'Descripción', 'Responsable', 'Fecha de Cumplimiento']
    ];

    if (acuerdos && acuerdos.length > 0) {
      acuerdos.forEach((item, idx) => {
        acuerdosTableData.push([
          String(idx + 1),
          item.descripcion || '',
          item.responsable || '',
          formatDateDisplay(item.fecha_cumplimiento)
        ]);
      });
    } else {
      acuerdosTableData.push(['-', 'Sin acuerdos registrados', '-', '-']);
    }

    const acuerdosTable = body.appendTable(acuerdosTableData);
    formatTableStandard(acuerdosTable, [30, 220, 130, 110]);

    body.appendParagraph('');

    // -------------------------------------------------------------
    // 5. ÁREA DE FIRMAS
    // -------------------------------------------------------------
    const sec4Heading = body.appendParagraph('5. ÁREA DE FIRMAS');
    sec4Heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    sec4Heading.setFontSize(12).setBold(true).setForegroundColor(primaryColor);

    body.appendParagraph('En fe de conformidad de los puntos tratados y acuerdos establecidos en la presente minuta, firman los asistentes:').setFontSize(10).setItalic(true);
    body.appendParagraph('');

    // Crear grilla de firmas (2 participantes por fila)
    const participantesParaFirma = (asistencia && asistencia.length > 0)
      ? asistencia.filter(a => !a.na) // Excluir a los que NO asistieron
      : [];

    const listaFirmas = participantesParaFirma.length > 0 ? participantesParaFirma : asistencia;

    if (listaFirmas && listaFirmas.length > 0) {
      const firmaRows = [];
      for (let i = 0; i < listaFirmas.length; i += 2) {
        const p1 = listaFirmas[i];
        const p2 = listaFirmas[i + 1];

        const c1Text = `____________________________\nNombre: ${p1.nombre}\nDependencia: ${p1.dependencia || '-'}\nFecha: ____ / ____ / ________`;
        const c2Text = p2 ? `____________________________\nNombre: ${p2.nombre}\nDependencia: ${p2.dependencia || '-'}\nFecha: ____ / ____ / ________` : '';

        firmaRows.push([c1Text, c2Text]);
      }

      const firmaTable = body.appendTable(firmaRows);
      firmaTable.setBorderColor('#FFFFFF'); // Ocultar bordes de la tabla de firmas
      for (let r = 0; r < firmaTable.getNumRows(); r++) {
        const row = firmaTable.getRow(r);
        const cell1 = row.getCell(0).setWidth(245).setPaddingTop(20).setPaddingBottom(20);
        const cell2 = row.getCell(1).setWidth(245).setPaddingTop(20).setPaddingBottom(20);
        cell1.getChild(0).setParagraphInTableAlignment(DocumentApp.HorizontalAlignment.CENTER);
        cell2.getChild(0).setParagraphInTableAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }

    // Pie de página con fecha de generación
    const footer = doc.addFooter();
    const footerPara = footer.appendParagraph(`Documento generado automáticamente el ${formatDateDisplay(new Date())} - Sistema de Minutas`);
    footerPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    footerPara.setFontSize(8);
    footerPara.setForegroundColor('#64748b');

    // Guardar y cerrar Docs
    doc.saveAndClose();

    // Mover el archivo Docs a la carpeta del proyecto
    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(targetFolder);

    // Generar PDF
    const pdfBlob = docFile.getAs(MimeType.PDF);
    pdfBlob.setName(`${docTitle}.pdf`);
    const pdfFile = targetFolder.createFile(pdfBlob);

    // Compartir visibilidad de los archivos si es necesario
    try {
      docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {}

    const docUrl = docFile.getUrl();
    const pdfUrl = pdfFile.getUrl();

    // Actualizar registro en la tabla Minutas con las URLs generadas
    const ss = getSpreadsheet();
    const minutasSheet = ss.getSheetByName('Minutas');
    const minData = minutasSheet.getDataRange().getValues();
    for (let i = 1; i < minData.length; i++) {
      if (minData[i][0] === idMinuta) {
        minutasSheet.getRange(i + 1, 7).setValue(docUrl);
        minutasSheet.getRange(i + 1, 8).setValue(pdfUrl);
        break;
      }
    }

    return buildResponse(true, {
      doc_url: docUrl,
      pdf_url: pdfUrl
    }, 'Documento Docs y PDF generados exitosamente.');

  } catch (error) {
    return buildResponse(false, null, 'Error al generar documentos: ' + error.toString());
  }
}

/**
 * Formatea una tabla de Google Docs con estilo estandarizado y profesional.
 * @param {GoogleAppsScript.Document.Table} table
 * @param {Array<number>} colWidths
 * @param {boolean} [centerAlignColumns=false]
 */
function formatTableStandard(table, colWidths, centerAlignColumns = false) {
  table.setBorderColor('#CBD5E1');

  // Formato Encabezado
  const headerRow = table.getRow(0);
  for (let c = 0; c < headerRow.getNumCells(); c++) {
    const cell = headerRow.getCell(c);
    cell.setBackgroundColor('#1E293B'); // Azul oscuro Slate
    if (colWidths && colWidths[c]) cell.setWidth(colWidths[c]);

    for (let p = 0; p < cell.getNumChildren(); p++) {
      const child = cell.getChild(p);
      if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
        const para = child.asParagraph();
        para.setFontFamily('Arial');
        para.setFontSize(9);
        para.setBold(true);
        para.setForegroundColor('#FFFFFF');
        para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
  }

  // Formato Filas de datos
  for (let r = 1; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    const bgColor = (r % 2 === 0) ? '#F8FAFC' : '#FFFFFF';

    for (let c = 0; c < row.getNumCells(); c++) {
      const cell = row.getCell(c);
      cell.setBackgroundColor(bgColor);
      if (colWidths && colWidths[c]) cell.setWidth(colWidths[c]);

      for (let p = 0; p < cell.getNumChildren(); p++) {
        const child = cell.getChild(p);
        if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
          const para = child.asParagraph();
          para.setFontFamily('Arial');
          para.setFontSize(9);
          para.setForegroundColor('#334155');
          if (c === 0 || (centerAlignColumns && c >= 3)) {
            para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
          } else {
            para.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
          }
        }
      }
    }
  }
}
