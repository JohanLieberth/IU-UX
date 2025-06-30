from django.urls import path
from . import views

app_name = 'tracker'

urlpatterns = [
    path('', views.RecomendacionListView.as_view(), name='recomendacion_list'),
    path('recomendacion/<int:pk>/', views.RecomendacionDetailView.as_view(), name='recomendacion_detail'),
    path('recomendacion/nueva/', views.RecomendacionCreateView.as_view(), name='recomendacion_create'),
    path('recomendacion/<int:pk>/editar/', views.RecomendacionUpdateView.as_view(), name='recomendacion_update'),

    path('recomendacion/<int:recomendacion_pk>/agregar_tarea/', views.agregar_tarea, name='agregar_tarea'),

    path('recomendacion/<int:recomendacion_pk>/subir_evidencia/', views.subir_evidencia, name='subir_evidencia_recomendacion'),
    path('recomendacion/<int:recomendacion_pk>/tarea/<int:tarea_pk>/subir_evidencia/', views.subir_evidencia, name='subir_evidencia_tarea'),

    path('recomendacion/<int:recomendacion_pk>/agregar_comentario/', views.agregar_comentario, name='agregar_comentario_recomendacion'),
    path('recomendacion/<int:recomendacion_pk>/tarea/<int:tarea_pk>/agregar_comentario/', views.agregar_comentario, name='agregar_comentario_tarea'),

    path('panel_control/', views.panel_control_view, name='panel_control'),
]
