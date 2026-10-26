# BitFix v3 - Sistema de Gestión de Taller de Reparaciones

Aplicación web completa construida con Google Apps Script (`HtmlService` + `SpreadsheetApp` + `GmailApp`) para la gestión integral de un taller de reparación de equipos electrónicos (consolas, laptops, etc.).

## 📊 Modelo de Datos (Excel BitFix_V3_Operacion_Taller.xlsx)

La base de datos utiliza las 17 hojas organizadas en Google Sheets:
1. **Clientes** (`Telefono`): Registro de clientes y talleres (badge morado `TALLER` si `TipoCliente = "Taller"`).
2. **UsuariosPortal** (`UsuarioID`): Autenticación con contraseña hasheada SHA-256 (`PasswordHash`).
3. **Equipos** (`EquipoID`): Catálogo de dispositivos asociados por teléfono (incluye `NoSerie` en col F).
4. **OrdenServicio** (`OrdenID`): Encabezado de orden (`FechaHoraRecepcion` ISO, `CostoEstimado`, `TotalFinal`, `Eliminada`).
5. **DetalleOrden** (`DetalleID`): Relación 1 orden -> N dispositivos (`TecnicoAsignadoID` en col G).
6. **Servicios** (`ServicioID`): Servicio de diagnóstico/solución (`CostoDiagnostico`, `CostoFinal`, `FallaReportada`, `ListoParaRecoleccion`).
7. **Asignaciones** (`AsignacionID`): Bitácora de técnicos asignados por dispositivo (permite multi-técnico).
8. **ActividadesTecnico** (`ActividadID`): Bitácora de minutos e intervenciones.
9. **HistorialServicio** (`HistorialID`): Auditoría de cambios de estatus.
10. **Pagos** (`PagoID`): Registro de anticipos y liquidaciones por orden.
11. **NFC** (`NFC_ID`): Vinculación UID de tarjeta NFC ↔ Teléfono del cliente.
12. **MovimientosPuntos** (`MovimientoID`): Histórico de puntos por servicio o bonificación.
13. **SaldoPuntos** (`Telefono`): Vista materializada del saldo de puntos.
14. **Talleres** (`Telefono`): Datos extendidos de talleres distribuidores.
15. **Admins** (`AdminID`): Personal con roles (`Administrador`, `Recepcion`, `Tecnico`).
16. **TablaPuntos** (`Accion`): Reglas de otorgamiento de puntos.
17. **Configuracion** (`Parametro`): Configuración global (`URLPortal`, `DireccionTaller`, `VideoBienvenida`, plantillas de correo).

### Hojas y Columnas Faltantes Creadas por `setupSchema()`
* `Equipos.NoSerie` (col F)
* `OrdenServicio.FechaHoraRecepcion` (col E)
* `OrdenServicio.CostoEstimado` (col F)
* `OrdenServicio.TotalFinal` (col G)
* `Servicios.CostoDiagnostico` (col F)
* `Servicios.CostoFinal` (col G)
* `Servicios.FallaReportada` (col H)
* `Servicios.ListoParaRecoleccion` (col I)
* `DetalleOrden.TecnicoAsignadoID` (col G)
* `UsuariosPortal.PasswordHash` (col E)
* `UsuariosPortal.FechaRegistro` (col F)
* **NotificacionesLog** (Hoja nueva): `NotifID | FechaHora | Telefono | OrdenID | Tipo | Destinatario | Asunto | Estado | MensajeError`
* **EtiquetasImpresas** (Hoja nueva): `EtiquetaID | OrdenID | DetalleID | Tipo | FechaHora | AdminID`

---

## 🚀 Guía de Despliegue e Inicialización

### 1. Preparar el proyecto en Google Apps Script
1. Crea un nuevo proyecto en [script.google.com](https://script.google.com) o en un Google Sheet en blanco.
2. Sube/copia todos los archivos `.gs` y `.html` contenidos en este repositorio.
3. Asegúrate de incluir la propiedad `SPREADSHEET_ID` en **Propiedades del proyecto / ScriptProperties** apuntando al ID de tu hoja de cálculo con los datos de BitFix v3.

### 2. Autorizar Scopes y Ejecutar Inicialización del Esquema
1. Abre la hoja de cálculo vinculada. Se creará automáticamente un menú superior llamado **BitFix**.
2. Selecciona **BitFix → Inicializar sistema**.
3. Acepta los permisos solicitados para acceder a **Google Sheets** y **Gmail**.
4. La función `setupSchema()` creará de forma **idempotente** todas las columnas y hojas faltantes, además de sembrar las plantillas de correo y configuración por defecto en la hoja `Configuracion`.

### 3. Desplegar como Web App
1. En el editor de Apps Script, haz clic en **Implementar > Nueva implementación**.
2. Selecciona el tipo **Aplicación web**.
3. Configura:
   * **Ejecutar como:** Tu cuenta (`USER_DEPLOYING`)
   * **Quién tiene acceso:** Cualquier usuario (`ANYONE_ANONYMOUS`)
4. Haz clic en **Implementar** y copia la URL proporcionada.
5. Pega esta URL en la hoja `Configuracion` en la fila del parámetro `URLPortal`.

---

## 🔐 Perfiles y Credenciales de Prueba Preexistentes

Puedes probar los 3 perfiles utilizando los datos preexistentes en la base de datos:

| Perfil | Ruta / Acceso | Credencial de Prueba | Permisos / Características |
| :--- | :--- | :--- | :--- |
| **Inicio Público** | `?page=home` | Acceso libre | Hero video, consulta rápida por `ServicioID` (sin datos sensibles), tabla de reglas de puntos. |
| **Administrador** | `?page=admin` | Sesión Google (`ADM001`) | Gestión total de órdenes, cambio de estatus, modificación de costos finales, reasignación multi-técnico, registro de pagos, reenvío manual de correos, impresión de tickets/etiquetas y soft/hard delete. |
| **Técnico** | `?page=tecnico` | Sesión Google (`ADM003`) | Vista restringida a sus asignaciones, edición de diagnóstico/costo inicial/falla reportada, bitácora de minutos e inversión de tiempo, cambio a *Listo para Recolección* (dispara correo automático). |
| **Portal Cliente** | `?page=portal` | Tel: `9991000001`<br>Pass: La configurada en registro | Autenticación SHA-256 + CacheService, consulta de equipos en reparación, saldo de puntos, historial de movimientos, tarjetas NFC vinculadas y pagos. |

---

## 🖨 Funciones de Impresión Térmica
* **Comprobante (Ticket 58mm):** Abre en ventana nueva formateado en `@media print` con tamaño `@page { size: 58mm auto; margin: 2mm; }` dividiendo tickets por dispositivo con saldos y totales de orden.
* **Etiqueta (50x30mm):** Imprime etiqueta adhesiva con datos del servicio y un código QR generado mediante `api.qrserver.com`.
