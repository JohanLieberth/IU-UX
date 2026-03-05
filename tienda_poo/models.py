from abc import ABC, abstractmethod
from datetime import datetime

# Decorador para registrar acciones
def log_transaccion(func):
    def wrapper(self, *args, **kwargs):
        print(f"[LOG] Ejecutando {func.__name__} en {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        return func(self, *args, **kwargs)
    return wrapper

class Usuario(ABC):
    def __init__(self, nombre, correo):
        self.nombre = nombre
        self.correo = correo

    @abstractmethod
    def mostrar_info(self):
        pass

class Cliente(Usuario):
    def __init__(self, nombre, correo, saldo=0.0):
        super().__init__(nombre, correo)
        self.saldo = saldo

    def mostrar_info(self):
        return f"Cliente: {self.nombre}, Correo: {self.correo}, Saldo: ${self.saldo:.2f}"

class Administrador(Usuario):
    def __init__(self, nombre, correo, nivel_acceso):
        super().__init__(nombre, correo)
        self.nivel_acceso = nivel_acceso

    def mostrar_info(self):
        return f"Admin: {self.nombre}, Correo: {self.correo}, Nivel: {self.nivel_acceso}"

class Producto:
    def __init__(self, nombre, precio, stock):
        self.nombre = nombre
        self._precio = precio
        self.stock = stock

    @property
    def precio(self):
        return self._precio

    @precio.setter
    def precio(self, valor):
        if valor < 0:
            raise ValueError("El precio no puede ser negativo")
        self._precio = valor

    def __str__(self):
        return f"{self.nombre} - ${self.precio:.2f} (Stock: {self.stock})"

class Venta:
    def __init__(self, cliente):
        self.cliente = cliente
        self.productos = []
        self._total = 0.0

    def agregar_producto(self, producto):
        if producto.stock > 0:
            self.productos.append(producto)
            # No restamos stock aquí aún, lo haremos al confirmar la venta
            self._total += producto.precio
        else:
            print(f"Producto {producto.nombre} agotado")

    @property
    def total(self):
        return self._total

class Tienda:
    def __init__(self, nombre):
        self.nombre = nombre
        self.ventas = []

    @log_transaccion
    def registrar_venta(self, venta):
        # Verificar stock de todos los productos en la venta antes de proceder
        for p in venta.productos:
            if p.stock <= 0:
                print(f"Error: El producto {p.nombre} ya no tiene stock.")
                return False

        if venta.cliente.saldo >= venta.total:
            venta.cliente.saldo -= venta.total
            # Descontar stock solo tras confirmar el pago
            for p in venta.productos:
                p.stock -= 1
            self.ventas.append(venta)
            return True
        else:
            print("Saldo insuficiente para completar la venta")
            return False

    def obtener_estadisticas(self):
        return f"Ventas registradas: {len(self.ventas)}"
