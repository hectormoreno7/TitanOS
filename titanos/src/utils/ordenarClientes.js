export function compararClientesPorNombre(a, b) {
  return String(a.nombre || "").trim().localeCompare(
    String(b.nombre || "").trim(),
    "es",
    { sensitivity: "base" }
  );
}

export function ordenarClientes(clientes) {
  return [...clientes].sort(compararClientesPorNombre);
}
