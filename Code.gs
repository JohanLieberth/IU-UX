/**
 * ==============================================================================
 * APLICACIÓN WEB DE VALIDACIÓN DE CURP EN GOOGLE APPS SCRIPT
 * ==============================================================================
 *
 * Este archivo contiene la lógica backend del servidor (Google Apps Script)
 * encargada de consultar el servicio API REST oficial en formato JSON para validar
 * la existencia de una CURP.
 */

// ==============================================================================
// CONFIGURACIÓN GLOBAL
// ==============================================================================

/**
 * URL del servicio API REST oficial de RENAPO para la consulta de CURP.
 */
const URL_CONSULTA = "https://www.gob.mx/v1/renapoCURP/consulta";

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
// LOGICA PRINCIPAL DE CONSULTA A SERVICIO API REST (JSON)
// ==============================================================================

/**
 * Realiza la consulta directa al servicio API REST en formato JSON mediante UrlFetchApp,
 * incluyendo el token de reCAPTCHA Enterprise generado legítimamente en el cliente.
 *
 * @param {string} curpIngresada - CURP capturada por el usuario en el frontend.
 * @param {string} [tokenRecaptcha=""] - Token de reCAPTCHA Enterprise generado en el navegador.
 * @returns {Object} Resultado estructurado para ser procesado en el cliente.
 */
function validarCurpEnServicio(curpIngresada, tokenRecaptcha) {
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

  // 2. Construcción del payload JSON para el servicio oficial
  const payload = {
    curp: curp,
    tipoBusqueda: "curp",
    ip: "127.0.0.1"
  };

  if (tokenRecaptcha && typeof tokenRecaptcha === 'string') {
    payload.token = tokenRecaptcha;
  }

  // 3. Configuración de la petición POST HTTP mediante UrlFetchApp
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

    // REGISTROS DE DEPURACIÓN
    Logger.log("Código de respuesta HTTP: " + codigoEstado);
    Logger.log("URL final consultada: " + URL_CONSULTA);
    Logger.log("Respuesta recibida: " + (contenidoRespuesta ? contenidoRespuesta.substring(0, 1000) : "Vacia"));

    // 4. Manejo de códigos de respuesta HTTP de error o restricciones
    if (codigoEstado === 428 || codigoEstado === 403) {
      return {
        exito: false,
        tipoError: 'RESTRICCION_SERVICIO',
        mensaje: 'El servicio requiere una verificación reCAPTCHA Enterprise legítima desde el dominio oficial del portal.'
      };
    }

    if (codigoEstado >= 500) {
      return {
        exito: false,
        tipoError: 'SITIO_NO_DISPONIBLE',
        mensaje: `El servicio remoto no está disponible actualmente (Error HTTP ${codigoEstado}). Por favor intente más tarde.`
      };
    }

    if (codigoEstado !== 200) {
      return {
        exito: false,
        tipoError: 'ERROR_HTTP',
        mensaje: `El servicio devolvió un código de estado HTTP ${codigoEstado}.`
      };
    }

    // 5. Analizar y procesar la respuesta JSON del servicio
    return analizarRespuestaJson(contenidoRespuesta, curp);

  } catch (error) {
    const errorStr = error.toString().toLowerCase();

    // Diagnóstico de excepciones de red
    if (errorStr.includes('timeout') || errorStr.includes('exceeded maximum execution time') || errorStr.includes('deadline')) {
      return {
        exito: false,
        tipoError: 'TIMEOUT',
        mensaje: 'El tiempo de espera para consultar el servicio remoto ha agotado el límite. Intente de nuevo.'
      };
    } else if (errorStr.includes('dns') || errorStr.includes('connection reset') || errorStr.includes('failed to connect') || errorStr.includes('address')) {
      return {
        exito: false,
        tipoError: 'ERROR_CONEXION',
        mensaje: 'Error de conexión con el servicio remoto. Verifique su acceso a internet o el estado del endpoint.'
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
 * Analiza la respuesta en formato JSON proveniente del servicio API.
 *
 * @param {string} contenido - Respuesta del servidor en formato texto/JSON.
 * @param {string} curp - CURP consultada.
 * @returns {Object} Objeto con resultado de la consulta.
 */
function analizarRespuestaJson(contenido, curp) {
  if (!contenido || contenido.trim() === '') {
    return {
      exito: false,
      tipoError: 'RESPUESTA_VACIA',
      mensaje: 'El servicio remoto devolvió una respuesta vacía.'
    };
  }

  let datos;
  try {
    datos = JSON.parse(contenido);
  } catch (e) {
    return {
      exito: false,
      tipoError: 'JSON_INVALIDO',
      mensaje: 'La respuesta devuelta por el servicio no tiene un formato JSON válido.'
    };
  }

  // Evaluación de token expirado o inválido
  if (datos.mensaje && (datos.mensaje.toLowerCase().includes('token') || datos.mensaje.toLowerCase().includes('captcha'))) {
    return {
      exito: false,
      tipoError: 'TOKEN_INVALIDO',
      mensaje: `Error de validación de seguridad: ${datos.mensaje}`
    };
  }

  // Criterios de evaluación del servicio oficial:
  // 1. CURP existente: codigo === "01" y registros.length > 0
  if (datos.codigo === "01" && datos.registros && datos.registros.length > 0) {
    return {
      exito: true,
      existe: true,
      curp: curp,
      mensaje: '✅ CURP encontrada'
    };
  }

  // 2. CURP no existente: registros vacíos o código de no localización ("02", "03")
  if ((datos.registros && datos.registros.length === 0) || datos.codigo === "02" || datos.codigo === "03" || (datos.mensaje && /no (se )?encontr/i.test(datos.mensaje))) {
    return {
      exito: true,
      existe: false,
      curp: curp,
      mensaje: '❌ CURP no encontrada'
    };
  }

  return {
    exito: true,
    existe: false,
    curp: curp,
    mensaje: '❌ CURP no encontrada'
  };
}

/**
 * Función de compatibilidad.
 */
function analizarRespuestaHtml(contenido, curp) {
  return analizarRespuestaJson(contenido, curp);
}
