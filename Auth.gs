/**
 * Auth.gs - BitFix v3
 * Role-based authentication, active Google session validation, client portal auth, and tokens.
 */

/**
 * Validates Google Session active user against Admins sheet.
 * @returns {Object|null}
 */
function getCurrentStaffUser() {
  var email = Session.getActiveUser().getEmail();
  if (!email || String(email).trim() === '') {
    return null;
  }

  var admins = readSheetAsObjects('Admins');
  var found = admins.find(function(a) {
    return String(a.Email || '').toLowerCase() === String(email).toLowerCase();
  });

  if (!found) {
    return null;
  }

  return {
    AdminID: found.AdminID,
    Nombre: found.Nombre,
    Rol: found.Rol,
    Email: found.Email
  };
}

/**
 * Ensures current user has one of the allowed roles.
 * @param {Array<string>} allowedRoles
 * @returns {Object} User profile
 */
function requireRole(allowedRoles) {
  var user = getCurrentStaffUser();
  if (!user || !allowedRoles || allowedRoles.indexOf(user.Rol) === -1) {
    throw new Error('Acceso denegado. Se requiere inicio de sesión con permisos de personal (' + (allowedRoles ? allowedRoles.join(', ') : '') + ').');
  }
  return user;
}

/**
 * Client Portal Login
 * @param {string} telefono
 * @param {string} password
 * @returns {Object} Session info
 */
function loginCliente(telefono, password) {
  if (!telefono || !password) {
    throw new Error('Teléfono y contraseña son requeridos.');
  }

  var cleanTel = String(telefono).trim();
  var passHash = hashSHA256(password);

  var usuarios = readSheetAsObjects('UsuariosPortal');
  var user = usuarios.find(function(u) {
    return String(u.Telefono).trim() === cleanTel;
  });

  if (!user) {
    throw new Error('Usuario o contraseña incorrectos.');
  }

  if (String(user.Activo).toUpperCase() !== 'SI') {
    throw new Error('La cuenta de portal se encuentra inactiva.');
  }

  var validPassword = false;
  if (user.PasswordHash) {
    validPassword = (user.PasswordHash === passHash);
  } else if (user.Password) {
    validPassword = (String(user.Password) === String(password));
    // Auto-migrate plaintext password to hash
    if (validPassword && user._rowIndex) {
      updateRowObject('UsuariosPortal', user._rowIndex, {
        PasswordHash: passHash
      });
    }
  }

  if (!validPassword) {
    throw new Error('Usuario o contraseña incorrectos.');
  }

  var clientes = readSheetAsObjects('Clientes');
  var cliente = clientes.find(function(c) { return String(c.Telefono).trim() === cleanTel; });

  var token = Utilities.getUuid();
  var sessionData = {
    telefono: cleanTel,
    nombre: cliente ? cliente.Nombre : 'Cliente',
    correo: cliente ? cliente.Correo : '',
    tipoCliente: cliente ? cliente.TipoCliente : 'Cliente',
    usuarioId: user.UsuarioID,
    createdAt: new Date().getTime()
  };

  // Store session token in CacheService for 10 hours (36000 seconds)
  var cache = CacheService.getScriptCache();
  cache.put('PORTAL_SESSION_' + token, JSON.stringify(sessionData), 36000);

  return {
    token: token,
    session: sessionData
  };
}

/**
 * Validates portal client session token.
 * @param {string} token
 * @returns {Object}
 */
function requireClientSession(token) {
  if (!token) {
    throw new Error('Sesión no encontrada. Por favor inicie sesión.');
  }
  var cache = CacheService.getScriptCache();
  var raw = cache.get('PORTAL_SESSION_' + token);
  if (!raw) {
    throw new Error('La sesión ha expirado o no es válida. Inicie sesión nuevamente.');
  }
  return JSON.parse(raw);
}
