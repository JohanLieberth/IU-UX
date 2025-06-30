from django import forms
from .models import Recomendacion, Tarea, Evidencia, Comentario, Responsable

class DateInput(forms.DateInput):
    input_type = 'date'

class RecomendacionForm(forms.ModelForm):
    class Meta:
        model = Recomendacion
        fields = ['titulo', 'descripcion', 'estado']
        widgets = {
            'descripcion': forms.Textarea(attrs={'rows': 4}),
        }

class TareaForm(forms.ModelForm):
    # recomendacion se asignará en la vista, no es necesario en el formulario si se crea desde el detalle.
    # Si se quisiera un formulario independiente, se añadiría aquí.
    # recomendacion = forms.ModelChoiceField(queryset=Recomendacion.objects.all(), widget=forms.HiddenInput())

    class Meta:
        model = Tarea
        fields = ['descripcion', 'responsable', 'fecha_limite', 'estado']
        widgets = {
            'descripcion': forms.TextInput(attrs={'placeholder': 'Descripción de la tarea'}),
            'fecha_limite': DateInput(),
        }

    def __init__(self, *args, **kwargs):
        # El initial para 'recomendacion' se puede pasar desde la vista
        # Si se pasa 'initial={'recomendacion': objeto_recomendacion}' a TareaForm en la vista
        # y 'recomendacion' no está en fields, no causa problemas.
        # Se usa para la lógica de guardado en la vista.
        super().__init__(*args, **kwargs)
        self.fields['responsable'].queryset = Responsable.objects.all()
        self.fields['responsable'].required = False


class EvidenciaForm(forms.ModelForm):
    # recomendacion y tarea se asignarán en la vista
    class Meta:
        model = Evidencia
        fields = ['descripcion', 'archivo']
        widgets = {
            'descripcion': forms.TextInput(attrs={'placeholder': 'Descripción breve de la evidencia'}),
        }

class ComentarioForm(forms.ModelForm):
    # recomendacion, tarea y autor se asignarán en la vista
    class Meta:
        model = Comentario
        fields = ['texto']
        widgets = {
            'texto': forms.Textarea(attrs={'rows': 3, 'placeholder': 'Escribe tu comentario...'}),
        }
