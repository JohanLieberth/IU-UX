# Guía de Despliegue y Configuración - Aplicación Web de Validación de CURP

Esta guía contiene los pasos detallados para crear, configurar y desplegar la aplicación web de validación de CURP utilizando **Google Apps Script**.

---

## 📋 Arquitectura de Archivos

La aplicación consta de dos archivos principales en el entorno de Google Apps Script:

1. `Code.gs`: Código fuente del servidor en JavaScript (Google Apps Script) para la gestión del servicio HTTP, scraping con `UrlFetchApp` y manejo de errores.
2. `Index.html`: Interfaz de usuario responsiva construida con HTML5, CSS3 moderno y JavaScript ES6 (`google.script.run`).

---

## 🚀 Pasos para el Despliegue como Web App

### Paso 1: Crear un nuevo proyecto en Google Apps Script

1. Ingrese a [Google Apps Script](https://script.google.com/) e inicie sesión con su cuenta de Google.
2. Haga clic en el botón **"Nuevo proyecto"** (New Project).
3. Asigne un nombre al proyecto (ej. `Validador-CURP-Web`).

---

### Paso 2: Agregar el Código Servidor (`Code.gs`)

1. Seleccione el archivo por defecto `Código.gs` (o cree uno nuevo denominado `Code.gs`).
2. Copie y pegue todo el contenido del archivo `Code.gs` provisto en este repositorio.
3. Asegúrese de configurar la variable `URL_CONSULTA` según la fuente deseada:

```javascript
const URL_CONSULTA = "https://www.gob.mx/curp/";
```

---

### Paso 3: Crear la Interfaz HTML (`Index.html`)

1. En el menú lateral izquierdo de Apps Script, haga clic en el botón **"+"** junto a **Archivos**.
2. Seleccione **HTML**.
3. Nombre el archivo como **`Index`** (Google Apps Script añadirá la extensión `.html` automáticamente).
4. Reemplace todo el contenido predeterminado por el código del archivo `Index.html` de este repositorio.

---

### Paso 4: Publicar y Desplegar como Aplicación Web (Web App)

1. En la esquina superior derecha del editor, haga clic en el botón **"Implementar"** (Deploy) y seleccione **"Nueva implementación"** (New deployment).
2. En la ventana emergente, haga clic en el ícono de engranaje ⚙️ junto a *Seleccionar tipo* y elija **"Aplicación web"** (Web app).
3. Configure los siguientes parámetros:
   - **Descripción**: `Versión 1.0 - Validador de CURP por Web Scraping`.
   - **Ejecutar como**: **`Yo`** (`Me` / su cuenta de correo).
   - **Quién tiene acceso**: **`Cualquier usuario`** (`Anyone`).
4. Haga clic en **"Implementar"** (Deploy).

---

### Paso 5: Autorización de Permisos

1. Al implementar por primera vez, Google solicitará autorizar el acceso.
2. Haga clic en **"Revisar permisos"** (Review permissions).
3. Seleccione su cuenta de Google.
4. Si aparece la advertencia *"Google no ha verificado esta aplicación"*, haga clic en **"Configuración avanzada"** (Advanced) y luego en **"Ir a Validador-CURP-Web (no seguro)"**.
5. Conceda los permisos necesarios (fetch/acceso a sitios externos).

---

### Paso 6: Obtener y Compartir la URL Pública

1. Una vez completado el despliegue, Google Apps Script le proporcionará una **URL de la aplicación web** (que termina en `/exec`).
2. Copie esa URL y compártala con cualquier usuario. Cuenten o no con cuenta de Google, podrán ingresar y validar CURPs directamente desde su navegador.

---

## 🛠️ Pruebas y Diagnóstico de Errores

| Tipo de Respuesta / Mensaje | Causa Probable | Solución Recomendada |
| :--- | :--- | :--- |
| `✅ CURP encontrada` | La CURP existe y fue localizada en la respuesta del sitio remoto. | Operación exitosa. |
| `❌ CURP no encontrada` | La CURP no coincide con los registros del sitio remoto. | Verificar que la CURP esté escrita correctamente. |
| `⚠️ Error de Formato` | La CURP no cumple con los 18 caracteres o la estructura estricta. | Corregir la entrada según el formato oficial AAAAYYMMDDSEXOETCCCD1. |
| `⏳ Tiempo de Espera Agotado` | El servidor remoto tardó más de 30-60 segundos en responder. | Reintentar la consulta en unos momentos. |
| `🌐 Sitio No Disponible` | El sitio fuente devolvió un error HTTP 5xx o 404. | Verificar el estado de la URL de consulta configurada. |
| `🔌 Error de Conexión` | Falla de resolución DNS o de conectividad de la red de Google Apps Script. | Verificar conectividad o cambiar la URL de consulta. |
| `⚠️ Cambio de Estructura HTML` | El sitio remoto modificó sus etiquetas o clases CSS. | Actualizar los patrones de expresiones regulares en `Code.gs`. |
