from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse_lazy
from django.views.generic import ListView, DetailView, CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin # Para proteger vistas
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from .models import Recomendacion, Tarea, Evidencia, Comentario, Responsable, HistorialActividad
from .forms import RecomendacionForm, TareaForm, EvidenciaForm, ComentarioForm # Los crearemos luego

# Vista de Lista de Recomendaciones
class RecomendacionListView(LoginRequiredMixin, ListView):
    model = Recomendacion
    template_name = 'tracker/recomendacion_list.html' # Crearemos esta plantilla
    context_object_name = 'recomendaciones'
    ordering = ['-fecha_creacion']

    def get_queryset(self):
        # Por ahora, todas las recomendaciones. Podríamos filtrar por usuario o estado.
        return Recomendacion.objects.all()

# Vista de Detalle de Recomendación
class RecomendacionDetailView(LoginRequiredMixin, DetailView):
    model = Recomendacion
    template_name = 'tracker/recomendacion_detail.html' # Crearemos esta plantilla
    context_object_name = 'recomendacion'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        recomendacion = self.get_object()
        context['tareas'] = Tarea.objects.filter(recomendacion=recomendacion).order_by('fecha_limite', 'fecha_creacion')
        context['evidencias'] = Evidencia.objects.filter(recomendacion=recomendacion).order_by('-fecha_subida')
        context['comentarios'] = Comentario.objects.filter(recomendacion=recomendacion).order_by('-fecha_creacion')
        context['historial'] = HistorialActividad.objects.filter(recomendacion=recomendacion).order_by('-fecha_hora')
        # Formularios para añadir elementos directamente desde el detalle
        context['tarea_form'] = TareaForm(initial={'recomendacion': recomendacion})
        context['evidencia_form'] = EvidenciaForm(initial={'recomendacion': recomendacion})
        context['comentario_form'] = ComentarioForm() # El 'initial' se manejará en el POST
        return context

# Vista para Crear Recomendación
class RecomendacionCreateView(LoginRequiredMixin, CreateView):
    model = Recomendacion
    form_class = RecomendacionForm # Crearemos este formulario
    template_name = 'tracker/recomendacion_form.html' # Crearemos esta plantilla
    success_url = reverse_lazy('tracker:recomendacion_list') # Redirigir a la lista después de crear

    def form_valid(self, form):
        form.instance.creado_por = self.request.user
        response = super().form_valid(form) # Guardar primero para obtener el self.object.pk
        HistorialActividad.objects.create(
            recomendacion=self.object,
            usuario=self.request.user,
            accion='creacion',
            detalles=f"Recomendación creada: {self.object.titulo}"
        )
        return response

# Vista para Actualizar Recomendación
class RecomendacionUpdateView(LoginRequiredMixin, UpdateView):
    model = Recomendacion
    form_class = RecomendacionForm
    template_name = 'tracker/recomendacion_form.html'

    def get_success_url(self):
        return reverse_lazy('tracker:recomendacion_detail', kwargs={'pk': self.object.pk})

    def form_valid(self, form):
        # Detectar cambios para un historial más detallado (opcional, más complejo)
        # old_instance = Recomendacion.objects.get(pk=self.object.pk)
        # changed_fields = []
        # for field in form.changed_data:
        #     changed_fields.append(field)

        response = super().form_valid(form)
        HistorialActividad.objects.create(
            recomendacion=self.object,
            usuario=self.request.user,
            accion='actualizacion',
            # detalles=f"Recomendación actualizada. Campos cambiados: {', '.join(changed_fields) if changed_fields else 'Ninguno (o solo fecha_actualizacion)'}"
            detalles=f"Recomendación actualizada: {self.object.titulo}" # Detalle simple por ahora
        )
        return response

# Vista para Crear Tarea (se podría llamar desde el detalle de recomendación)
@login_required
def agregar_tarea(request, recomendacion_pk):
    recomendacion = get_object_or_404(Recomendacion, pk=recomendacion_pk)
    if request.method == 'POST':
        form = TareaForm(request.POST)
        if form.is_valid():
            tarea = form.save(commit=False)
            tarea.recomendacion = recomendacion
            tarea.save()
            HistorialActividad.objects.create(
                recomendacion=recomendacion,
                tarea=tarea,
                usuario=request.user,
                accion='creacion',
                detalles=f"Tarea creada: {tarea.descripcion}"
            )
            return redirect('tracker:recomendacion_detail', pk=recomendacion_pk)
    else:
        form = TareaForm(initial={'recomendacion': recomendacion})
    # Esta vista podría no tener su propia plantilla si siempre se usa desde el detalle
    # o podríamos tener una plantilla simple para ella.
    # Por ahora, asumimos que se maneja dentro del template de detalle o redirige.
    return redirect('tracker:recomendacion_detail', pk=recomendacion_pk)


# Vista para Subir Evidencia
@login_required
def subir_evidencia(request, recomendacion_pk, tarea_pk=None):
    recomendacion = get_object_or_404(Recomendacion, pk=recomendacion_pk)
    tarea = None
    if tarea_pk:
        tarea = get_object_or_404(Tarea, pk=tarea_pk, recomendacion=recomendacion)

    if request.method == 'POST':
        form = EvidenciaForm(request.POST, request.FILES)
        if form.is_valid():
            evidencia = form.save(commit=False)
            evidencia.recomendacion = recomendacion
            if tarea:
                evidencia.tarea = tarea
            evidencia.subido_por = request.user
            evidencia.save()
            HistorialActividad.objects.create(
                recomendacion=recomendacion,
                tarea=tarea,
                usuario=request.user,
                accion='subida_evidencia',
                detalles=f"Evidencia subida: {evidencia.archivo.name}"
            )
            return redirect('tracker:recomendacion_detail', pk=recomendacion_pk)
    else:
        initial_data = {'recomendacion': recomendacion}
        if tarea:
            initial_data['tarea'] = tarea
        form = EvidenciaForm(initial=initial_data)

    # Esta vista podría no tener su propia plantilla si siempre se usa desde el detalle
    # o podríamos tener una plantilla simple para ella.
    # Por ahora, asumimos que se maneja dentro del template de detalle o redirige.
    # Considerar renderizar un template si hay errores de formulario y no se está en un modal.
    return redirect('tracker:recomendacion_detail', pk=recomendacion_pk)


# Vista para Añadir Comentario
@login_required
def agregar_comentario(request, recomendacion_pk, tarea_pk=None):
    recomendacion = get_object_or_404(Recomendacion, pk=recomendacion_pk)
    tarea = None
    if tarea_pk:
        tarea = get_object_or_404(Tarea, pk=tarea_pk, recomendacion=recomendacion)

    if request.method == 'POST':
        form = ComentarioForm(request.POST)
        if form.is_valid():
            comentario = form.save(commit=False)
            comentario.recomendacion = recomendacion
            if tarea:
                comentario.tarea = tarea
            comentario.autor = request.user
            comentario.save()
            HistorialActividad.objects.create(
                recomendacion=recomendacion,
                tarea=tarea,
                usuario=request.user,
                accion='comentario',
                detalles=f"Comentario añadido: {comentario.texto[:50]}..."
            )
            return redirect('tracker:recomendacion_detail', pk=recomendacion_pk)
    else:
        form = ComentarioForm()

    # Esta vista podría no tener su propia plantilla si siempre se usa desde el detalle.
    return redirect('tracker:recomendacion_detail', pk=recomendacion_pk)


from datetime import date, timedelta

# (Placeholder) Vista para el Panel de Control
@login_required
def panel_control_view(request):
    # Lógica para obtener datos para el panel
    num_recomendaciones_total = Recomendacion.objects.count()
    num_pendientes = Recomendacion.objects.filter(estado='pendiente').count()
    num_en_progreso = Recomendacion.objects.filter(estado='en_progreso').count()
    num_completadas = Recomendacion.objects.filter(estado='completada').count()

    # Tareas próximas a vencer (en los próximos 7 días) o vencidas y no completadas
    hoy = date.today()
    proxima_semana = hoy + timedelta(days=7)

    tareas_proximas_vencer = Tarea.objects.filter(
        fecha_limite__isnull=False,
        fecha_limite__gte=hoy,
        fecha_limite__lte=proxima_semana,
        estado__in=['pendiente', 'en_progreso']
    ).order_by('fecha_limite')

    tareas_vencidas = Tarea.objects.filter(
        fecha_limite__isnull=False,
        fecha_limite__lt=hoy,
        estado__in=['pendiente', 'en_progreso']
    ).order_by('fecha_limite')

    # Actividad reciente (últimos 10 items)
    actividad_reciente = HistorialActividad.objects.all().order_by('-fecha_hora')[:10]

    context = {
        'num_recomendaciones_total': num_recomendaciones_total,
        'num_pendientes': num_pendientes,
        'num_en_progreso': num_en_progreso,
        'num_completadas': num_completadas,
        'tareas_proximas_vencer': tareas_proximas_vencer,
        'tareas_vencidas': tareas_vencidas,
        'actividad_reciente': actividad_reciente,
        # ... más datos
    }
    return render(request, 'tracker/panel_control.html', context) # Crearemos esta plantilla
