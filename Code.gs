/**
 * ==============================================================================
 * APLICACIÓN WEB DE VALIDACIÓN DE CURP EN GOOGLE APPS SCRIPT
 * ==============================================================================
 *
 * Este archivo contiene la lógica backend del servidor (Google Apps Script)
 * encargada de servir la interfaz Web App y realizar la consulta de scraping
 * para validar la existencia de una CURP.
 */

// ==============================================================================
// CONFIGURACIÓN GLOBAL
// ==============================================================================

/**
 * URL del sitio público fuente para la consulta de CURP.
 * Puede ser modificada según el sitio o API pública a consultar.
 */
const URL_CONSULTA = "https://www.gob.mx/curp/";

/**
 * Expresión regular estándar para la validación del formato oficial de la CURP mexicana.
 * Formato: 4 letras, 6 dígitos (AAMMDD), Sexo (H/M), 2 letras de entidad federativa,
 * 3 letras consonantes internas, 1 carácter alfanumérico (homoclave), 1 dígito verificador.
 */
const REGEX_CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i;


// ==============================================================================
// VISTAS Y SERVIDOR WEB (HTTP GET)
// ==============================================================================

/**
 * Función principal que sirve la aplicación web al acceder a la URL del despliegue.
 *
 * @param {Object} e - Objeto de evento del servidor web.
 * @returns {HtmlOutput} Página HTML renderizada para el cliente.
 */
function doGet(e) {
  try {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Validador de CURP - Sistema de Consulta')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log("Error al cargar la plantilla Index.html: " + error.toString());
    return HtmlService.createHtmlOutput("<h3>Error al cargar la aplicación web. Verifique la existencia del archivo Index.html.</h3>");
  }
}

/**
 * Función auxiliar para incluir archivos HTML dentro de plantillas (si se requiere modularizar).
 *
 * @param {string} filename - Nombre del archivo a incluir sin extensión.
 * @returns {string} Contenido del archivo HTML.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


// ==============================================================================
// FUNCIONES AUXILIARES DE VALIDACIÓN
// ==============================================================================

/**
 * Valida si una cadena cumple con la longitud y formato estricto de una CURP.
 *
 * @param {string} curp - Cadena a validar.
 * @returns {Object} Objeto con resultado de validación ({ esValido: boolean, mensaje: string }).
 */
function validarFormatoCurp(curp) {
  if (!curp || typeof curp !== 'string') {
    return { esValido: false, mensaje: 'Debe ingresar una cadena de texto válida.' };
  }

  const curpLimpia = curp.trim().toUpperCase();

  if (curpLimpia.length !== 18) {
    return {
      esValido: false,
      mensaje: `La CURP debe tener exactamente 18 caracteres. Longitud ingresada: ${curpLimpia.length}.`
    };
  }

  if (!REGEX_CURP.test(curpLimpia)) {
    return {
      esValido: false,
      mensaje: 'El formato de la CURP es incorrecto. Verifique letras, fecha y caracteres.'
    };
  }

  return { esValido: true, curpLimpia: curpLimpia, mensaje: 'Formato correcto.' };
}


// ==============================================================================
// LOGICA PRINCIPAL DE WEB SCRAPING
// ==============================================================================

/**
 * Realiza la consulta web mediante UrlFetchApp y analiza la respuesta HTML
 * para verificar la existencia de la CURP solicitada.
 *
 * @param {string} curpIngresada - CURP capturada por el usuario en el frontend.
 * @returns {Object} Resultado estructurado para ser procesado en el cliente.
 */
function validarCurpEnServicio(curpIngresada) {
  // 1. Validar formato previo en backend
  const validacion = validarFormatoCurp(curpIngresada);
  if (!validacion.esValido) {
    return {
      exito: false,
      tipoError: 'FORMATO_INVALIDO',
      mensaje: validacion.mensaje
    };
  }

  const curp = validacion.curpLimpia;

  // 2. Configuración de opciones para la petición HTTP
  const opcionesNavegacion = {
    method: 'get',
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
    }
  };

  try {
    // Definir la URL de consulta dinámica si el sitio requiere parámetros GET
    // En caso de consultas directas, se agrega el parámetro o slug según corresponda.
    let urlConParametros = URL_CONSULTA;
    if (!urlConParametros.includes('?')) {
      urlConParametros += `?curp=${encodeURIComponent(curp)}`;
    } else {
      urlConParametros += `&curp=${encodeURIComponent(curp)}`;
    }

    // 3. Petición HTTP usando UrlFetchApp
    const respuesta = UrlFetchApp.fetch(urlConParametros, opcionesNavegacion);
    const codigoEstado = respuesta.getResponseCode();
    const htmlContenido = respuesta.getContentText();

    // 4. Manejo de errores HTTP de servidor/sitio no disponible
    if (codigoEstado >= 500) {
      return {
        exito: false,
        tipoError: 'SITIO_NO_DISPONIBLE',
        mensaje: `El sitio web de consulta no está disponible actualmente (Error ${codigoEstado}). Por favor intente más tarde.`
      };
    }

    if (codigoEstado === 404) {
      return {
        exito: false,
        tipoError: 'SITIO_NO_DISPONIBLE',
        mensaje: 'La página de consulta especificada no se encuentra disponible (Error 404).'
      };
    }

    // 5. Analizar el HTML mediante técnicas de parsing y Expresiones Regulares
    return analizarRespuestaHtml(htmlContenido, curp);

  } catch (error) {
    const errorStr = error.toString().toLowerCase();

    // Diagnóstico específico de tipos de error de red
    if (errorStr.includes('timeout') || errorStr.includes('exceeded maximum execution time') || errorStr.includes('deadline')) {
      return {
        exito: false,
        tipoError: 'TIMEOUT',
        mensaje: 'El tiempo de espera para consultar el sitio externo ha agotado el límite. Intente de nuevo.'
      };
    } else if (errorStr.includes('dns') || errorStr.includes('connection reset') || errorStr.includes('failed to connect') || errorStr.includes('address')) {
      return {
        exito: false,
        tipoError: 'ERROR_CONEXION',
        mensaje: 'Error de conexión con el sitio remoto. Verifique su acceso a internet o la URL de consulta.'
      };
    } else {
      return {
        exito: false,
        tipoError: 'DESCONOCIDO',
        mensaje: `Ocurrió un error inesperado al realizar la consulta: ${error.message || error.toString()}`
      };
    }
  }
}

/**
 * Función auxiliar para parsear el contenido HTML obtenido del scraping.
 * Utiliza heurísticas y expresiones regulares para determinar la presencia de la CURP.
 *
 * @param {string} html - Contenido HTML completo devuelto por el servidor remoto.
 * @param {string} curp - CURP consultada.
 * @returns {Object} Resultado indicando si existe o no la CURP o si la estructura cambió.
 */
function analizarRespuestaHtml(html, curp) {
  if (!html || html.trim() === '') {
    return {
      exito: false,
      tipoError: 'ESTRUCTURA_CAMBIADA',
      mensaje: 'El sitio remoto devolvió un contenido HTML vacío.'
    };
  }

  // Patrones para detectar si la CURP fue encontrada
  const patronesEncontrado = [
    new RegExp(`curp[\\s\\S]*?${curp}`, 'i'),
    new RegExp(`${curp}[\\s\\S]*?(registrada|encontrada|válida|valida|datos del ciudadano|curp confirmada)`, 'i'),
    /datos del ciudadano/i,
    /renapo/i,
    /resultado de la consulta/i,
    /curp\s*registrada/i,
    new RegExp(`class=["'][^"']*resultado[^"']*["']`, 'i'),
    new RegExp(`id=["'][^"']*datos-personales[^"']*["']`, 'i')
  ];

  // Patrones para detectar explícitamente que NO existe la CURP
  const patronesNoEncontrado = [
    /no se encontr[óo] información/i,
    /curp no existe/i,
    /la curp ingresada no es válida/i,
    /no existe registro/i,
    /no se encontraron resultados/i,
    /sin registros/i,
    /curp no registrada/i
  ];

  // Evaluar coincidencias explícitas de "No encontrado"
  for (let patron of patronesNoEncontrado) {
    if (patron.test(html)) {
      return {
        exito: true,
        existe: false,
        curp: curp,
        mensaje: '❌ CURP no encontrada en los registros.'
      };
    }
  }

  // Evaluar si contiene la CURP solicitada en la respuesta
  if (html.toUpperCase().includes(curp.toUpperCase())) {
    return {
      exito: true,
      existe: true,
      curp: curp,
      mensaje: '✅ CURP encontrada'
    };
  }

  // Evaluar otros patrones de éxito en la respuesta
  let coincidenciasExito = 0;
  for (let patron of patronesEncontrado) {
    if (patron.test(html)) {
      coincidenciasExito++;
    }
  }

  if (coincidenciasExito >= 1) {
    return {
      exito: true,
      existe: true,
      curp: curp,
      mensaje: '✅ CURP encontrada'
    };
  }

  // Si no coincide con ningún patrón conocido, es posible que la estructura haya cambiado
  return {
    exito: false,
    tipoError: 'ESTRUCTURA_CAMBIADA',
    mensaje: 'No fue posible parsear la respuesta del sitio web. La estructura HTML del sitio fuente puede haber cambiado.'
  };
}
