/**
 * ==============================================================================
 * APLICACIÓN WEB DE VALIDACIÓN DE CURP EN GOOGLE APPS SCRIPT
 * ==============================================================================
 *
 * Lógica backend del servidor (Google Apps Script) para la consulta del servicio
 * oficial API REST de RENAPO incorporando el token de reCAPTCHA Enterprise.
 */

// ==============================================================================
// CONFIGURACIÓN GLOBAL
// ==============================================================================

/**
 * URL del servicio API REST oficial para la consulta de CURP.
 */
const URL_CONSULTA = "https://www.gob.mx/v1/renapoCURP/consulta";

/**
 * Expresión regular estándar para la validación del formato oficial de la CURP mexicana.
 */
const REGEX_CURP = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/i;


// ==============================================================================
// VISTAS Y SERVIDOR WEB (HTTP GET)
// ==============================================================================

/**
 * Función principal que sirve la aplicación web.
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
 * Función auxiliar para incluir archivos HTML dentro de plantillas.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


// ==============================================================================
// FUNCIONES AUXILIARES DE VALIDACIÓN
// ==============================================================================

/**
 * Valida si una cadena cumple con la longitud y formato estricto de una CURP.
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
// LOGICA PRINCIPAL DE CONSULTA A SERVICIO API REST (JSON)
// ==============================================================================

/**
 * Función principal expuesta al frontend para validar la CURP utilizando
 * el token de reCAPTCHA Enterprise generado legítimamente.
 *
 * @param {string} curp - CURP capturada por el usuario.
 * @param {string} recaptchaToken - Token de reCAPTCHA Enterprise.
 * @returns {Object} Resultado con la respuesta formateada.
 */
function validarCurp(curp, recaptchaToken) {
  // 1. Validar formato de CURP
  const validacion = validarFormatoCurp(curp);
  if (!validacion.esValido) {
    return {
      exito: false,
      tipoError: 'FORMATO_INVALIDO',
      mensaje: validacion.mensaje
    };
  }

  const curpLimpia = validacion.curpLimpia;

  // 2. Validar presencia del token de reCAPTCHA
  if (!recaptchaToken || typeof recaptchaToken !== 'string' || recaptchaToken.trim() === '') {
    return {
      exito: false,
      tipoError: 'TOKEN_NULO',
      mensaje: '⚠️ No fue posible validar reCAPTCHA'
    };
  }

  // 3. Preparar payload JSON para el servicio
  const payload = {
    curp: curpLimpia,
    tipoBusqueda: "curp",
    token: recaptchaToken.trim(),
    ip: "127.0.0.1"
  };

  const opcionesNavegacion = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  };

  try {
    const respuesta = UrlFetchApp.fetch(URL_CONSULTA, opcionesNavegacion);
    const codigoEstado = respuesta.getResponseCode();
    const contenidoRespuesta = respuesta.getContentText();

    Logger.log("HTTP Code: " + codigoEstado);
    Logger.log("Respuesta recibida: " + (contenidoRespuesta ? contenidoRespuesta.substring(0, 500) : "Vacia"));

    // Manejo de errores HTTP
    if (codigoEstado === 428 || codigoEstado === 403) {
      return {
        exito: false,
        tipoError: 'TOKEN_EXPIRADO',
        mensaje: '⚠️ El token de seguridad expiró, intenta nuevamente'
      };
    }

    if (codigoEstado !== 200) {
      return {
        exito: false,
        tipoError: 'ERROR_COMUNICACION',
        mensaje: '⚠️ Error de comunicación con el servicio'
      };
    }

    return analizarRespuestaJson(contenidoRespuesta, curpLimpia);

  } catch (error) {
    const errorStr = error.toString().toLowerCase();
    Logger.log("Error en UrlFetchApp: " + errorStr);

    if (errorStr.includes('timeout') || errorStr.includes('exceeded maximum execution time') || errorStr.includes('deadline')) {
      return {
        exito: false,
        tipoError: 'TIMEOUT',
        mensaje: '⚠️ Error de comunicación con el servicio (tiempo de espera agotado)'
      };
    }

    return {
      exito: false,
      tipoError: 'ERROR_COMUNICACION',
      mensaje: '⚠️ Error de comunicación con el servicio'
    };
  }
}

/**
 * Alias de compatibilidad para mantener soporte con llamadas anteriores.
 */
function validarCurpEnServicio(curp, token) {
  return validarCurp(curp, token);
}

/**
 * Analiza la respuesta JSON del servidor de RENAPO.
 */
function analizarRespuestaJson(contenido, curp) {
  if (!contenido || contenido.trim() === '') {
    return {
      exito: false,
      tipoError: 'RESPUESTA_VACIA',
      mensaje: '⚠️ Error de comunicación con el servicio'
    };
  }

  let datos;
  try {
    datos = JSON.parse(contenido);
  } catch (e) {
    return {
      exito: false,
      tipoError: 'JSON_INVALIDO',
      mensaje: '⚠️ Error de comunicación con el servicio'
    };
  }

  // Validaciones del mensaje devuelto por el servicio remoto sobre el token
  if (datos.mensaje && (datos.mensaje.toLowerCase().includes('token') || datos.mensaje.toLowerCase().includes('captcha') || datos.mensaje.toLowerCase().includes('expirado'))) {
    return {
      exito: false,
      tipoError: 'TOKEN_EXPIRADO',
      mensaje: '⚠️ El token de seguridad expiró, intenta nuevamente'
    };
  }

  // Criterios oficiales:
  // 1. CURP existente: codigo === "01" y registros.length > 0
  if (datos.codigo === "01" && datos.registros && datos.registros.length > 0) {
    return {
      exito: true,
      existe: true,
      curp: curp,
      mensaje: '✅ CURP encontrada'
    };
  }

  // 2. CURP no existente
  return {
    exito: true,
    existe: false,
    curp: curp,
    mensaje: '❌ CURP no encontrada'
  };
}

/**
 * Función de compatibilidad para parsear respuestas.
 */
function analizarRespuestaHtml(contenido, curp) {
  return analizarRespuestaJson(contenido, curp);
}
