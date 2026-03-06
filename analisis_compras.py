from collections import Counter, OrderedDict

# Datos proporcionados
compras = [
    "Luis", "Ana", "Luis", "Carlos", "Marta", "Ana", "Sofía",
    "Elena", "Luis", "Carlos"
]

registrados = [
    "Ana", "Carlos", "Marta", "Elena"
]

def analizar_compras():
    # 1. Filtrar clientes nuevos: que compraron pero no están registrados
    # Usamos conjuntos y la operación de diferencia para obtener elementos únicos en compras que no están en registrados.
    clientes_nuevos = list(set(compras) - set(registrados))

    # 2. Eliminar duplicados y mantener orden:
    # Elección: OrderedDict (o dict.fromkeys en versiones recientes de Python 3.7+)
    # Justificación: Un set no mantiene el orden de inserción. OrderedDict garantiza que el orden
    # se mantenga mientras se eliminan los duplicados.
    clientes_unicos_ordenados = list(OrderedDict.fromkeys(compras))

    # 3. Contar cuántas veces se repite cada nombre
    conteo_compras = Counter(compras)

    # 4. Crear un resumen personalizado (solo clientes con más de una compra)
    # Usando dict comprehension
    resumen_frecuentes = {
        cliente: f"Ha comprado {cantidad} veces"
        for cliente, cantidad in conteo_compras.items()
        if cantidad > 1
    }

    # 5. Formato final: Imprimir tres bloques
    print("--- Clientes nuevos no registrados ---")
    print(clientes_nuevos)

    print("\n--- Lista de clientes únicos (manteniendo orden) ---")
    print(clientes_unicos_ordenados)

    print("\n--- Resumen por cliente frecuente (más de 1 compra) ---")
    for cliente, mensaje in resumen_frecuentes.items():
        print(f"{cliente}: {mensaje}")

if __name__ == "__main__":
    analizar_compras()
