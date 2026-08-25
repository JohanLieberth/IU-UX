/**
 * Code.gs - Punto de entrada doGet y utilidades de renderizado para Web App.
 */

/**
 * Sirve la aplicación Web HTML.
 * @param {Object} e
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  // Asegurar que la base de datos esté creada e inicializada
  setupDatabase();

  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Sistema de Minutas y Seguimiento de Acuerdos')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Incluye el contenido de archivos HTML secundarios (CSS/JS/Vistas) dentro del HTML principal.
 * @param {string} filename
 * @returns {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Carga inicial de datos para la aplicación de forma rápida en una sola llamada.
 * @returns {string} JSON
 */
function getInitialData() {
  try {
    const proyectosRes = JSON.parse(obtenerProyectos());
    const minutasRes = JSON.parse(obtenerMinutas());
    const acuerdosRes = JSON.parse(obtenerAcuerdosConEstado());

    return buildResponse(true, {
      proyectos: proyectosRes.data || [],
      minutas: minutasRes.data || [],
      acuerdos: acuerdosRes.data || []
    }, "Datos iniciales cargados con éxito");
  } catch (err) {
    return buildResponse(false, null, "Error al cargar datos iniciales: " + err.toString());
  }
}
