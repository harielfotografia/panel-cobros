"use client";
import { useEffect, useState } from "react";

type ClienteSimple = { id: string; nombre: string; rut: string | null; email: string };

type Props = {
  value: { clienteId: string | null; clienteNombre: string; clienteRut: string };
  onChange: (v: { clienteId: string | null; clienteNombre: string; clienteRut: string }) => void;
};

export function ClienteSelectorDoc({ value, onChange }: Props) {
  const [clientes, setClientes] = useState<ClienteSimple[]>([]);
  const [modo, setModo] = useState<"sistema" | "libre">(value.clienteId ? "sistema" : "libre");
  const [clienteIdVisto, setClienteIdVisto] = useState(value.clienteId);

  // Si `value.clienteId` llega DESPUÉS del montaje (ej. una página que precarga el cliente desde
  // un ?clienteId= de la URL con un fetch async), el useState de arriba ya quedó fijo en "libre"
  // para siempre — el dato termina correcto pero el tab visible es el equivocado. Se ajusta el modo
  // en el momento del render (patrón "adjusting state when a prop changes" de React), no dentro de
  // un useEffect — así React re-renderiza antes de pintar en pantalla, sin el parpadeo de un efecto.
  if (value.clienteId !== clienteIdVisto) {
    setClienteIdVisto(value.clienteId);
    if (value.clienteId) setModo("sistema");
  }

  useEffect(() => {
    fetch("/api/clientes").then(r => r.json()).then((data: unknown[]) =>
      setClientes(data.map((c: unknown) => {
        const cl = c as ClienteSimple;
        return { id: cl.id, nombre: cl.nombre, rut: cl.rut, email: cl.email };
      }))
    );
  }, []);

  function seleccionarCliente(id: string) {
    const cl = clientes.find(c => c.id === id);
    if (cl) onChange({ clienteId: cl.id, clienteNombre: cl.nombre, clienteRut: cl.rut ?? "" });
    else onChange({ clienteId: null, clienteNombre: "", clienteRut: "" });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button type="button" onClick={() => setModo("sistema")}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            modo === "sistema" ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}>
          Cliente del sistema
        </button>
        <button type="button" onClick={() => { setModo("libre"); onChange({ clienteId: null, clienteNombre: value.clienteNombre, clienteRut: value.clienteRut }); }}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            modo === "libre" ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}>
          Nombre libre
        </button>
      </div>

      {modo === "sistema" ? (
        <select
          value={value.clienteId ?? ""}
          onChange={e => seleccionarCliente(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Seleccionar cliente...</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}{c.rut ? ` — ${c.rut}` : ""}</option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre / Razón social</label>
            <input
              value={value.clienteNombre}
              onChange={e => onChange({ ...value, clienteNombre: e.target.value })}
              placeholder="Empresa SpA"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">RUT (opcional)</label>
            <input
              value={value.clienteRut}
              onChange={e => onChange({ ...value, clienteRut: e.target.value })}
              placeholder="12.345.678-9"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
