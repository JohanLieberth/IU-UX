/**
 * Code.gs - BitFix v3
 * Entry point, router, public helper endpoints, and template inclusion.
 */

function doGet(e) {
  var params = e ? e.parameter : {};
  var page = params.page || 'home';

  var templateName = 'home';
  switch (page) {
    case 'admin':
      templateName = 'admin';
      break;
    case 'admin_usuarios':
      templateName = 'admin_usuarios';
      break;
    case 'tecnico':
      templateName = 'tecnico';
      break;
    case 'portal':
      templateName = 'portal';
      break;
    case 'portal_registro':
      templateName = 'portal_registro';
      break;
    case 'login':
      templateName = 'login';
      break;
    case 'comprobante':
      return renderComprobante(params.ordenId, params.servicioId);
    case 'etiqueta':
      return renderEtiqueta(params.ordenId, params.servicioId);
    case 'home':
    default:
      templateName = 'home';
      break;
  }

  var tpl = HtmlService.createTemplateFromFile(templateName);
  tpl.page = page;
  tpl.params = params;

  return tpl.evaluate()
    .setTitle('BitFix v3 - Taller de Reparación')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Include helper for inline HTML partials.
 * @param {string} filename
 * @returns {string}
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Public service lookup. Does NOT expose sensitive customer details (phone/email).
 * @param {string} servicioId
 * @returns {Object}
 */
function consultarServicioRapido(servicioId) {
  if (!servicioId) {
    throw new Error('Debe proporcionar un ID de servicio válido.');
  }

  var srvIdClean = String(servicioId).trim().toUpperCase();
  var servicios = readSheetAsObjects('Servicios');
  var srv = servicios.find(function(s) { return String(s.ServicioID).toUpperCase() === srvIdClean; });
  if (!srv) {
    throw new Error('Servicio no encontrado: ' + servicioId);
  }

  var detalles = readSheetAsObjects('DetalleOrden');
  var det = detalles.find(function(d) { return String(d.DetalleID) === String(srv.DetalleID); });

  var ordenes = readSheetAsObjects('OrdenServicio');
  var ord = det ? ordenes.find(function(o) { return String(o.OrdenID) === String(det.OrdenID); }) : null;

  var equipos = readSheetAsObjects('Equipos');
  var eq = det ? equipos.find(function(e) { return String(e.EquipoID) === String(det.EquipoID); }) : null;

  var clientes = readSheetAsObjects('Clientes');
  var cli = ord ? clientes.find(function(c) { return String(c.Telefono) === String(ord.Telefono); }) : null;

  var asignaciones = readSheetAsObjects('Asignaciones');
  var meAsigns = asignaciones.filter(function(a) { return String(a.ServicioID) === String(srv.ServicioID); });
  var tecs = meAsigns.map(function(a) { return a.TecnicoID; }).filter(Boolean);

  return {
    ServicioID: srv.ServicioID,
    OrdenID: det ? det.OrdenID : '',
    ClienteNombre: cli ? cli.Nombre : 'Cliente BitFix',
    EquipoTipo: eq ? eq.Tipo : '',
    EquipoMarca: eq ? eq.Marca : '',
    EquipoModelo: eq ? eq.Modelo : '',
    NoSerie: eq ? eq.NoSerie : '',
    Diagnostico: srv.Diagnostico || 'En proceso',
    Solucion: srv.Solucion || 'En proceso',
    EstatusActual: det ? det.Estatus : 'Recibido',
    TecnicosAsignados: tecs.length > 0 ? tecs.join(', ') : 'Sin asignar',
    CostoFinal: srv.CostoFinal ? '$' + Number(srv.CostoFinal).toFixed(2) : 'Pendiente',
    FechaEntregado: det ? det.FechaEntregado : ''
  };
}

/**
 * Returns public app configuration and points table rules.
 * @returns {Object}
 */
function getPublicConfig() {
  var config = readSheetAsObjects('Configuracion');
  var cMap = {};
  config.forEach(function(r) { cMap[r.Parametro] = r.Valor; });

  var puntos = readSheetAsObjects('TablaPuntos');
  return {
    VideoBienvenida: cMap.VideoBienvenida || '',
    DireccionTaller: cMap.DireccionTaller || '',
    TablaPuntos: puntos
  };
}
