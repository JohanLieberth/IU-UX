/**
 * DocumentService.gs - Generación de Documentos Google Docs y PDF con Área de Firmas.
 */

function generarDocumentoMinuta(idMinuta) {
  try {
    const resDetalle = JSON.parse(obtenerDetalleMinuta(idMinuta));
    if (!resDetalle.success || !resDetalle.data) {
      throw new Error(resDetalle.message || 'No se pudieron obtener los datos de la minuta.');
    }

    const { minuta, asistencia, ordenDelDia, acuerdos } = resDetalle.data;

    const proyectos = getSheetDataAsObjects('Proyectos');
    const proyecto = proyectos.find(p => p.id_proyecto === minuta.id_proyecto) || {};
    const nombreProyecto = proyecto.nombre || 'General';

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

    const docTitle = 'Minuta ' + nombreProyecto + ' – ' + formatDateDisplay(minuta.fecha_reunion);
    const doc = DocumentApp.create(docTitle);
    const body = doc.getBody();

    body.setMarginTop(36);
    body.setMarginBottom(36);
    body.setMarginLeft(54);
    body.setMarginRight(54);

    // Configurar Fuente Century Gothic, Color Negro y Tamaño Principal 10
    body.editAsText().setFontFamily('Century Gothic').setFontSize(10).setForegroundColor('#000000');

    // -------------------------------------------------------------
    // ENCABEZADO OFICIAL (LOGO IZQUIERDA Y TEXTO CENTRADO)
    // -------------------------------------------------------------
    const header = doc.addHeader();
    const headerTable = header.appendTable([
      ['', '']
    ]);
    headerTable.setBorderColor('#FFFFFF'); // Ocultar bordes de la tabla de encabezado

    const rowHeader = headerTable.getRow(0);
    const cellLeft = rowHeader.getCell(0).setWidth(130);
    const cellRight = rowHeader.getCell(1).setWidth(370);

    // Logo a la izquierda del Encabezado (manteniendo proporción original)
    cellLeft.setText('');
    try {
      const logoFile = DriveApp.getFileById('1nVNJIP8-jIE89-Q8ZV3HWZATJPnLRMwc');
      const logoBlob = logoFile.getBlob();
      const pLogo = cellLeft.appendParagraph('');
      pLogo.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
      const img = pLogo.appendInlineImage(logoBlob);

      const origWidth = img.getWidth();
      const origHeight = img.getHeight();
      if (origWidth > 0 && origHeight > 0) {
        const maxHeight = 48; // Altura fija objetivo
        const scale = maxHeight / origHeight;
        img.setWidth(Math.round(origWidth * scale));
        img.setHeight(Math.round(origHeight * scale));
      }

      if (cellLeft.getNumChildren() > 1 && cellLeft.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
        cellLeft.removeChild(cellLeft.getChild(0));
      }
    } catch (e) {
      Logger.log('No se pudo cargar la imagen del logo en el encabezado: ' + e.toString());
    }

    // Texto Centrado en Encabezado
    cellRight.setText('');
    const headerTextLines = [
      'MUNICIPIO DE MÉRIDA, YUCATÁN',
      'Coordinación General de Buen Gobierno',
      'Dirección de Administración',
      'Subdirección de Mejora Regulatoria',
      'Departamento de Calidad y Mejora Continua',
      'MINUTA DE TRABAJO'
    ];

    headerTextLines.forEach((lineText, idx) => {
      const p = cellRight.appendParagraph(lineText);
      p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      p.setFontFamily('Century Gothic');
      p.setFontSize(10);
      p.setForegroundColor('#000000');
      if (idx === 0 || idx === headerTextLines.length - 1) {
        p.setBold(true);
      }
    });

    if (cellRight.getNumChildren() > headerTextLines.length && cellRight.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
      cellRight.removeChild(cellRight.getChild(0));
    }

    const textColor = '#000000';

    const headerTitle = body.appendParagraph(docTitle.toUpperCase());
    headerTitle.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    headerTitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    headerTitle.setFontFamily('Century Gothic');
    headerTitle.setFontSize(12);
    headerTitle.setBold(true);
    headerTitle.setForegroundColor(textColor);

    body.appendParagraph('');

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
      const cell0 = row.getCell(0);
      cell0.setBackgroundColor('#F1F5F9').setWidth(120);
      if (cell0.editAsText) {
        cell0.editAsText().setBold(true);
      }
      row.getCell(1).setWidth(380);
    }

    body.appendParagraph('');

    const sec1Heading = body.appendParagraph('2. LISTA DE ASISTENCIA');
    sec1Heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    sec1Heading.setFontFamily('Century Gothic');
    sec1Heading.setFontSize(10).setBold(true).setForegroundColor(textColor);

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

    const sec2Heading = body.appendParagraph('3. ORDEN DEL DÍA');
    sec2Heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    sec2Heading.setFontFamily('Century Gothic');
    sec2Heading.setFontSize(10).setBold(true).setForegroundColor(textColor);

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

    const sec3Heading = body.appendParagraph('4. ACCIONES Y ACUERDOS');
    sec3Heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    sec3Heading.setFontFamily('Century Gothic');
    sec3Heading.setFontSize(10).setBold(true).setForegroundColor(textColor);

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

    const sec4Heading = body.appendParagraph('5. ÁREA DE FIRMAS');
    sec4Heading.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    sec4Heading.setFontFamily('Century Gothic');
    sec4Heading.setFontSize(10).setBold(true).setForegroundColor(textColor);

    body.appendParagraph('En fe de conformidad de los puntos tratados y acuerdos establecidos en la presente minuta, firman los asistentes:').setFontFamily('Century Gothic').setFontSize(10).setForegroundColor(textColor).setItalic(true);
    body.appendParagraph('');

    const participantesParaFirma = (asistencia && asistencia.length > 0)
      ? asistencia.filter(a => !a.na)
      : [];

    const listaFirmas = participantesParaFirma.length > 0 ? participantesParaFirma : asistencia;

    if (listaFirmas && listaFirmas.length > 0) {
      const firmaRows = [];
      for (let i = 0; i < listaFirmas.length; i += 2) {
        const p1 = listaFirmas[i];
        const p2 = listaFirmas[i + 1];

        const c1Text = '____________________________\nNombre: ' + p1.nombre + '\nDependencia: ' + (p1.dependencia || '-') + '\nFecha: ____ / ____ / ________';
        const c2Text = p2 ? ('____________________________\nNombre: ' + p2.nombre + '\nDependencia: ' + (p2.dependencia || '-') + '\nFecha: ____ / ____ / ________') : '';

        firmaRows.push([c1Text, c2Text]);
      }

      const firmaTable = body.appendTable(firmaRows);
      firmaTable.setBorderColor('#FFFFFF');
      for (let r = 0; r < firmaTable.getNumRows(); r++) {
        const row = firmaTable.getRow(r);
        const cell1 = row.getCell(0).setWidth(245).setPaddingTop(20).setPaddingBottom(20);
        const cell2 = row.getCell(1).setWidth(245).setPaddingTop(20).setPaddingBottom(20);

        if (cell1.getNumChildren() > 0 && cell1.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
          cell1.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        }
        if (cell2.getNumChildren() > 0 && cell2.getChild(0).getType() === DocumentApp.ElementType.PARAGRAPH) {
          cell2.getChild(0).asParagraph().setAlignment(DocumentApp.HorizontalAlignment.CENTER);
        }
      }
    }

    const footer = doc.addFooter();
    const footerPara = footer.appendParagraph('Documento generado automáticamente el ' + formatDateDisplay(new Date()) + ' - Sistema de Minutas');
    footerPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
    footerPara.setFontFamily('Century Gothic');
    footerPara.setFontSize(10);
    footerPara.setForegroundColor('#000000');

    doc.saveAndClose();

    const docFile = DriveApp.getFileById(doc.getId());
    docFile.moveTo(targetFolder);

    const pdfBlob = docFile.getAs(MimeType.PDF);
    pdfBlob.setName(docTitle + '.pdf');
    const pdfFile = targetFolder.createFile(pdfBlob);

    try {
      docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch(e) {}

    const docUrl = docFile.getUrl();
    const pdfUrl = pdfFile.getUrl();

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

function formatTableStandard(table, colWidths, centerAlignColumns) {
  table.setBorderColor('#CBD5E1');

  const headerRow = table.getRow(0);
  for (let c = 0; c < headerRow.getNumCells(); c++) {
    const cell = headerRow.getCell(c);
    cell.setBackgroundColor('#1E293B');
    if (colWidths && colWidths[c]) cell.setWidth(colWidths[c]);

    for (let p = 0; p < cell.getNumChildren(); p++) {
      const child = cell.getChild(p);
      if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
        const para = child.asParagraph();
        para.setFontFamily('Century Gothic');
        para.setFontSize(10);
        para.setBold(true);
        para.setForegroundColor('#FFFFFF');
        para.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      }
    }
  }

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
          para.setFontFamily('Century Gothic');
          para.setFontSize(10);
          para.setForegroundColor('#000000');
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
