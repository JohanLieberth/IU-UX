# Gestor de Seguimiento de Recomendaciones

Este proyecto es una aplicación web desarrollada en Django para facilitar el seguimiento de recomendaciones y la subida de evidencias. Permite asignar tareas, establecer fechas límite, adjuntar archivos como evidencia, mantener un historial de actividad y fomentar la colaboración.

## Características Principales

*   **Gestión de Recomendaciones:** Crear, listar, ver detalles y actualizar recomendaciones.
*   **Gestión de Tareas:** Asignar tareas específicas a recomendaciones, con responsables y fechas límite.
*   **Subida de Evidencias:** Adjuntar archivos (PDF, imágenes, etc.) a recomendaciones o tareas como prueba de cumplimiento.
*   **Historial de Actividad:** Seguimiento de cambios importantes y acciones realizadas en el sistema.
*   **Comentarios:** Permitir a los usuarios comentar sobre recomendaciones o tareas.
*   **Panel de Control:** Visualizar un resumen del estado de las recomendaciones, tareas vencidas/próximas a vencer y actividad reciente.
*   **Autenticación de Usuarios:** Basado en el sistema de usuarios de Django.

## Requisitos Previos

*   Python (versión 3.8 o superior recomendada)
*   pip (gestor de paquetes de Python)
*   Opcional: Git para clonar el repositorio.

## Configuración y Ejecución (Desarrollo Local)

1.  **Clonar el Repositorio (si aplica):**
    ```bash
    git clone <url-del-repositorio>
    cd <directorio-del-proyecto>
    ```

2.  **Crear un Entorno Virtual (Recomendado):**
    ```bash
    python -m venv venv
    ```
    Activar el entorno virtual:
    *   En macOS y Linux: `source venv/bin/activate`
    *   En Windows: `venv\Scripts\activate`

3.  **Instalar Dependencias:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configurar la Base de Datos y Migraciones:**
    Por defecto, se utiliza SQLite, que no requiere configuración adicional.
    ```bash
    python manage.py migrate
    ```

5.  **Crear un Superusuario (Administrador):**
    Esto te permitirá acceder al panel de administración de Django y a la aplicación.
    ```bash
    python manage.py createsuperuser
    ```
    Sigue las instrucciones para crear un nombre de usuario, correo (opcional) y contraseña.

6.  **Ejecutar el Servidor de Desarrollo:**
    Para acceso solo desde tu máquina local:
    ```bash
    python manage.py runserver
    ```
    Para acceso desde otras máquinas en tu red local (asegúrate de que `ALLOWED_HOSTS` en `recommendation_tracker/settings.py` esté configurado apropiadamente, por ejemplo, añadiendo tu IP o `'*'` para desarrollo):
    ```bash
    python manage.py runserver 0.0.0.0:8000
    ```

7.  **Acceder a la Aplicación:**
    Abre tu navegador web y ve a `http://127.0.0.1:8000` (o `http://<IP-de-tu-maquina>:8000` si usaste `0.0.0.0`).
    Serás redirigido a la página de inicio de sesión del administrador. Usa las credenciales del superusuario creado.

## Estructura del Proyecto

*   `recommendation_tracker/`: Directorio principal del proyecto Django.
    *   `settings.py`: Configuración del proyecto.
    *   `urls.py`: URLs principales del proyecto.
*   `tracker/`: Aplicación Django que contiene la lógica principal del gestor de recomendaciones.
    *   `models.py`: Definición de los modelos de datos.
    *   `views.py`: Lógica de las vistas (controladores).
    *   `forms.py`: Formularios de Django.
    *   `urls.py`: URLs específicas de la aplicación `tracker`.
    *   `templates/`: Plantillas HTML.
        *   `tracker/`: Plantillas específicas de la app.
        *   `registration/`: Plantillas de autenticación (ej. login).
    *   `migrations/`: Archivos de migración de la base de datos.
    *   `static/` (si se añadieran archivos estáticos específicos de la app)
*   `media/`: Directorio donde se almacenarán los archivos subidos (evidencias) durante el desarrollo local. Este directorio se crea automáticamente al subir el primer archivo.
*   `manage.py`: Script de utilidad de Django.
*   `README.md`: Este archivo.

## Consideraciones para Producción

*   **DEBUG:** En `settings.py`, `DEBUG` debe ser `False`.
*   **ALLOWED_HOSTS:** Debe configurarse explícitamente con los dominios/IPs permitidos.
*   **SECRET_KEY:** Usar una clave secreta única y segura (no la de desarrollo).
*   **Base de Datos:** Cambiar de SQLite a una base de datos más robusta como PostgreSQL o MySQL.
*   **Servidor WSGI:** Usar un servidor WSGI como Gunicorn o uWSGI.
*   **Servidor Web:** Usar Nginx o Apache como proxy inverso, para servir archivos estáticos y de medios, y para HTTPS.
*   **Archivos Estáticos y de Medios:** Configurar el servidor web para servir archivos desde `STATIC_ROOT` y `MEDIA_ROOT` respectivamente. No usar el servidor de desarrollo de Django para esto. `collectstatic` deberá ejecutarse.
*   **HTTPS:** Configurar SSL/TLS para asegurar la comunicación.

## Mejoras Futuras (Ideas)

*   Notificaciones por correo electrónico (recordatorios de fechas límite, etc.).
*   Roles y permisos más granulares para usuarios.
*   Edición y eliminación de tareas y comentarios directamente desde la interfaz.
*   Informes más avanzados y gráficos en el panel de control.
*   Integraciones con otras herramientas (CRM, sistemas de soporte) vía API o Webhooks.
*   Internacionalización y localización.
*   Tests automatizados.

Este README proporciona una buena base. Los comentarios en el código se han ido añadiendo a lo largo del desarrollo en los archivos `models.py`, `views.py`, `settings.py` y algunas plantillas.
```
