from models import Cliente, Administrador, Producto, Venta, Tienda

def simulation():
    # 1. Se crea un administrador para gestionar la tienda (opcional, pero demuestra herencia)
    admin = Administrador("Ana", "ana@techstore.com", "Superusuario")
    print(admin.mostrar_info())

    # 2. Se crea un cliente
    cliente = Cliente("Luis", "luis@mail.com", 1400.0)

    # 3. Se registran algunos productos
    p1 = Producto("Smartphone", 300.0, 10)
    p2 = Producto("Audifonos", 100.0, 20)

    # 4. Se asocian esos productos a una venta
    venta = Venta(cliente)
    venta.agregar_producto(p1)
    venta.agregar_producto(p2)

    # 5. Se registra la venta en una tienda
    tienda = Tienda("Tech Store")
    exito = tienda.registrar_venta(venta)

    # 6. Muestra la información del cliente y el total de la venta si fue exitosa
    if exito:
        print(cliente.mostrar_info())
        print(f"Total de la venta: ${venta.total:.2f}")

    print(tienda.obtener_estadisticas())

    # Demostración de fallo por saldo insuficiente
    print("\n--- Intento de venta con saldo insuficiente ---")
    cliente_pobre = Cliente("Pedro", "pedro@mail.com", 50.0)
    venta2 = Venta(cliente_pobre)
    venta2.agregar_producto(p1)
    tienda.registrar_venta(venta2)
    print(f"Stock de {p1.nombre} tras fallo: {p1.stock} (debería ser 9)")

if __name__ == "__main__":
    simulation()
