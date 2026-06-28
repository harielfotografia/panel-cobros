const ESTADOS: Record<string, { label: string; clase: string }> = {
  // Cotización
  BORRADOR:          { label: "Borrador",     clase: "bg-gray-100 text-gray-600" },
  ENVIADA:           { label: "Enviada",      clase: "bg-blue-100 text-blue-700" },
  APROBADA:          { label: "Aprobada",     clase: "bg-green-100 text-green-700" },
  RECHAZADA:         { label: "Rechazada",    clase: "bg-red-100 text-red-700" },
  FACTURADA:         { label: "Facturada",    clase: "bg-purple-100 text-purple-700" },
  CONVERTIDA_BOLETA: { label: "Con boleta",   clase: "bg-purple-100 text-purple-700" },
  // Factura / Boleta
  PENDIENTE:         { label: "Pendiente",    clase: "bg-yellow-100 text-yellow-700" },
  PAGADA:            { label: "Pagada",       clase: "bg-green-100 text-green-700" },
  VENCIDA:           { label: "Vencida",      clase: "bg-red-100 text-red-700" },
  ANULADA:           { label: "Anulada",      clase: "bg-gray-100 text-gray-500" },
};

export function EstadoBadgeDocs({ estado }: { estado: string }) {
  const e = ESTADOS[estado] ?? { label: estado, clase: "bg-gray-100 text-gray-500" };
  return (
    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${e.clase}`}>
      {e.label}
    </span>
  );
}
