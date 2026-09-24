# Sistema de Control y Seguimiento de Acuerdos y Ajustes de Proyecto (PMO) - Google Apps Script

Aplicación web completa desarrollada en Google Apps Script para el control, gestión y seguimiento de acuerdos, observaciones y ajustes de proyecto derivados de minutas de reunión en entornos de gestión de proyectos (PMO).

---

## 📌 Características Principales

- **Dashboard Integrado:** Tarjetas KPI con totales de acuerdos, pendientes, resueltos, vencidos (`FECHA COMPROMISO < hoy` y `ESTATUS = Pendiente`), por firmar e informativos.
- **Tabla Interactiva:** Búsqueda libre en texto de acuerdo, ordenamiento multinivel por columna y filtros dinámicos (Estatus, Módulo, Prioridad, Tipo de Sesión, Responsable).
- **Código de Colores por Estatus:**
  - 🔴 **Rojo:** Pendiente Vencido (`FECHA COMPROMISO < hoy` y `ESTATUS = Pendiente`)
  - 🟡 **Amarillo:** Pendiente
  - 🟢 **Verde:** Resuelto
  - ⚪ **Gris:** Informativo
- **Edición Rápida de Estatus:** Doble clic o botón de acción rápida para modificar `ESTATUS` y `ESTATUS DE FIRMA`. Al marcar como *Resuelto*, se registra automáticamente la `FECHA CIERRE`.
- **Formulario Completo y Captura Masiva:** Formulario modal para registro/edición individual y captura en lote para registrar múltiples acuerdos de una misma minuta.
- **Generación Automática de Folio Minuta:** Formato estandarizado `MIN_{PROYECTO}_{TIPO}_{YYYYMMDD}_{SIGLAS_MODULO}`.
- **Historial de Auditoría:** Registro de cambios en la hoja `Historial` (Fecha, Usuario, No. Gral, Campo Modificado, Valor Anterior, Valor Nuevo).
- **Tablas de Resumen Automático:** Cálculo dinámico por Módulo y Responsable.
- **Seguridad Concurrente:** Uso de `LockService` para prevenir colisiones en lecturas/escrituras.

---

## 📊 Estructura de Google Sheets

La aplicación opera sobre una hoja de cálculo con las siguientes pestañas creadas automáticamente por la función `setup()`:

1. **`Registros`** (Tabla Maestra de Acuerdos):
   `NO. GRAL` | `NO. EN MIN` | `TIPO DE SESIÓN` | `FECHA DE SESIÓN` | `FOLIO MINUTA` | `NOMBRE DE MINUTA` | `ORIGEN DEL ACUERDO` | `FECHA SOLICITUD` | `ETAPA PROYECTO` | `MÓDULO` | `TIPO DE OBSERVACIÓN` | `ACUERDO O AJUSTE SOLICITADO` | `SOL` | `RESP` | `FECHA COMPROMISO` | `PRIORIDAD` | `COMENTARIOS PROVEEDOR` | `OBSERVACIONES PMO` | `ESTATUS` | `TRACKING COMENTARIOS` | `ESTATUS DE FIRMA` | `NUBE` | `FECHA CIERRE`

2. **`Catalogos`** (Listas Desplegables):
   - **TIPO DE SESIÓN:** DPR, TYP, ESZ, PMO, OPE
   - **TIPO DE OBSERVACIÓN:** Ajuste Técnico, Acuerdo, Informativo, Duda
   - **ESTATUS:** Pendiente, Resuelto, Informativo
   - **ESTATUS DE FIRMA:** Pendiente por Firmar, Firmado
   - **PRIORIDAD:** Alta, Media, Baja
   - **ORIGEN:** Minuta, Correo, Oficio
   - **MÓDULO:** Centro Estatal de Solución de Controversias, Fondo Auxiliar, Interacción con FGE, Secretaría Ejecutiva, Servicios Electrónicos Jurisdiccionales
   - **ETAPA PROYECTO:** Modelo Simplificado, Diagnóstico, Agenda Legislativa

3. **`Participantes`**:
   `CLAVE INICIALES` | `NOMBRE` | `MÓDULO` | `ROL` | `ACTIVO`

4. **`Minutas`**:
   `FOLIO MINUTA` | `FECHA SESIÓN` | `TIPO DE SESIÓN` | `NOMBRE MINUTA` | `TOTAL ACUERDOS` | `TOTAL AJUSTES TÉCNICOS` | `TOTAL INFORMATIVOS` | `TOTAL DUDAS` | `TOTAL GENERAL` | `FIRMA`

5. **`Historial`**:
   `FECHA` | `USUARIO` | `NO. GRAL` | `CAMPO MODIFICADO` | `VALOR ANTERIOR` | `VALOR NUEVO`

6. **`Resumen`**:
   Tablas consolidadas calculadas por script (Acuerdos por Módulo y Cumplimiento por Responsable).

---

## 📂 Archivos del Proyecto

```text
gas_tracking_acuerdos/
├── Code.gs            # Entradas de Web App (doGet), include y función setup()
├── Catalogos.gs       # Lectura de catálogos, participantes y generación de Folios
├── Registros.gs       # CRUD, LockService, validaciones, lote e historial
├── Minutas.gs         # Métricas por folio de minuta y detalle imprimible
├── Resumen.gs         # Tablas consolidadas por Módulo / Responsable y PDF
├── Index.html         # Plantilla maestra HTML, librerías y controlador JS
├── Dashboard.html     # Tarjetas de métricas KPI
├── Tabla.html         # Tabla interactiva, filtros, búsqueda y quick edit
├── Formulario.html    # Modales de captura única, masiva, detalle e importación
├── Reportes.html     # Vista imprimible de minuta y resumen
└── README.md          # Manual de instalación y despliegue
```

---

## 🚀 Instrucciones de Instalación y Despliegue

### Paso 1: Crear o Vincular un Proyecto Google Apps Script
1. Abre una nueva Google Sheet (o utiliza una existente).
2. Ve al menú superior: **Extensiones > Apps Script**.
3. Cambia el nombre del proyecto a `PMO_Tracking_Acuerdos`.

### Paso 2: Copiar los Archivos de Código
Crea cada uno de los archivos en el editor de Apps Script con sus nombres exactos:

- **Archivos de Script (.gs):**
  - `Code.gs`
  - `Catalogos.gs`
  - `Registros.gs`
  - `Minutas.gs`
  - `Resumen.gs`
- **Archivos HTML (.html):**
  - `Index.html`
  - `Dashboard.html`
  - `Tabla.html`
  - `Formulario.html`
  - `Reportes.html`

### Paso 3: Ejecutar la Configuración Inicial (`setup`)
1. En el editor de Apps Script, selecciona el archivo `Code.gs`.
2. En el desplegable de funciones, selecciona `setup`.
3. Haz clic en **Ejecutar**.
4. Autoriza los permisos requeridos por el script para acceder a la Hoja de Cálculo.
5. Verifica en tu Google Sheet que se hayan creado las 6 pestañas (`Registros`, `Catalogos`, `Participantes`, `Minutas`, `Historial`, `Resumen`) y que se hayan insertado los 5 registros de prueba iniciales.

---

## 🌐 Despliegue como Aplicación Web (Web App)

1. En la esquina superior derecha del editor de Apps Script, haz clic en **Desplegar > Nuevo despliegue**.
2. Selecciona el tipo de despliegue: **Aplicación web**.
3. Configura los parámetros:
   - **Descripción:** `PMO Tracking Acuerdos v1.0`
   - **Ejecutar como:** `Yo` (`me@tu-dominio.com`)
   - **Quién tiene acceso:** `Cualquier persona dentro de la organización` (o *Cualquier persona con una cuenta de Google* según tus políticas corporativas).
4. Haz clic en **Desplegar**.
5. Copia la URL de la aplicación web generada para compartirla con los usuarios.

---

## 🛠️ Funciones Destacadas para Integraciones Programáticas

- `appendRegistro(registroObj)`: Inserta un único registro de forma segura validando campos obligatorios (`ACUERDO`, `RESP`, `PRIORIDAD`, `FECHA COMPROMISO`).
- `appendRegistrosBatch(batchData)`: Permite insertar en un solo lote todos los acuerdos de una misma minuta manteniendo la concurrencia protegida mediante `LockService`.
- `importarDesdeHoja(dataArray)`: Función mapeadora para importar arreglos de datos externos o tablas copiadas.
- `updateEstatusRapido(noGral, nuevoEstatus, nuevoEstatusFirma)`: Actualización directa de estatus que calcula la `FECHA CIERRE` en caso de resoluciones.
