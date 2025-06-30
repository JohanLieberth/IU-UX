from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Responsable(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    nombre_grupo = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        if self.usuario:
            return self.usuario.get_full_name() or self.usuario.username
        return self.nombre_grupo or "Responsable Desconocido"

class Recomendacion(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('en_progreso', 'En Progreso'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
    ]
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    fecha_creacion = models.DateTimeField(default=timezone.now)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    creado_por = models.ForeignKey(User, related_name='recomendaciones_creadas', on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return self.titulo

class Tarea(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('en_progreso', 'En Progreso'),
        ('completada', 'Completada'),
        ('bloqueada', 'Bloqueada'),
    ]
    recomendacion = models.ForeignKey(Recomendacion, related_name='tareas', on_delete=models.CASCADE)
    descripcion = models.CharField(max_length=500)
    responsable = models.ForeignKey(Responsable, on_delete=models.SET_NULL, null=True, blank=True)
    fecha_limite = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    fecha_creacion = models.DateTimeField(default=timezone.now)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.descripcion

def evidencia_upload_path(instance, filename):
    # El archivo se subirá a MEDIA_ROOT/evidencias/recomendacion_<id>/<filename>
    return f'evidencias/recomendacion_{instance.recomendacion.id}/{filename}'

class Evidencia(models.Model):
    recomendacion = models.ForeignKey(Recomendacion, related_name='evidencias_recomendacion', on_delete=models.CASCADE, null=True, blank=True)
    tarea = models.ForeignKey(Tarea, related_name='evidencias_tarea', on_delete=models.CASCADE, null=True, blank=True)
    descripcion = models.CharField(max_length=255, blank=True)
    archivo = models.FileField(upload_to=evidencia_upload_path)
    subido_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    fecha_subida = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Evidencia para {self.tarea or self.recomendacion}: {self.archivo.name}"

class Comentario(models.Model):
    recomendacion = models.ForeignKey(Recomendacion, related_name='comentarios', on_delete=models.CASCADE, null=True, blank=True)
    tarea = models.ForeignKey(Tarea, related_name='comentarios', on_delete=models.CASCADE, null=True, blank=True)
    autor = models.ForeignKey(User, on_delete=models.CASCADE)
    texto = models.TextField()
    fecha_creacion = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Comentario de {self.autor.username} en {self.fecha_creacion.strftime('%Y-%m-%d %H:%M')}"

class HistorialActividad(models.Model):
    ACCION_CHOICES = [
        ('creacion', 'Creación'),
        ('actualizacion', 'Actualización'),
        ('cambio_estado', 'Cambio de Estado'),
        ('subida_evidencia', 'Subida de Evidencia'),
        ('comentario', 'Nuevo Comentario'),
        # ... otras acciones relevantes
    ]
    recomendacion = models.ForeignKey(Recomendacion, on_delete=models.CASCADE, null=True, blank=True)
    tarea = models.ForeignKey(Tarea, on_delete=models.CASCADE, null=True, blank=True)
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    accion = models.CharField(max_length=50, choices=ACCION_CHOICES)
    detalles = models.TextField(blank=True)
    fecha_hora = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.get_accion_display()} por {self.usuario or 'Sistema'} el {self.fecha_hora.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        ordering = ['-fecha_hora']
