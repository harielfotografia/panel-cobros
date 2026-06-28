"use client";
import { Plus, Trash2 } from "lucide-react";
import { calcularTotalItem, formatCLP, itemVacio } from "@/lib/documentos";
import type { ItemDoc } from "@/lib/documentos";

type Props = {
  items: ItemDoc[];
  onChange: (items: ItemDoc[]) => void;
};

export function ItemsEditor({ items, onChange }: Props) {
  function actualizar(idx: number, campo: keyof ItemDoc, valor: string | number) {
    const nuevo = items.map((it, i) => {
      if (i !== idx) return it;
      const actualizado = { ...it, [campo]: valor };
      actualizado.total = calcularTotalItem(actualizado);
      return actualizado;
    });
    onChange(nuevo);
  }

  function agregar() { onChange([...items, itemVacio()]); }
  function eliminar(idx: number) { onChange(items.filter((_, i) => i !== idx)); }

  const subtotal = items.reduce((a, it) => a + it.total, 0);
  const iva = Math.round(subtotal * 0.19);
  const total = subtotal + iva;

  return (
    <div className="space-y-3">
      {/* Cabecera tabla */}
      <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-1">
        <span className="col-span-5">Descripción</span>
        <span className="col-span-2 text-right">Cantidad</span>
        <span className="col-span-2 text-right">Precio unit.</span>
        <span className="col-span-1 text-right">Desc.%</span>
        <span className="col-span-1 text-right">Total</span>
        <span className="col-span-1" />
      </div>

      {items.map((it, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
          <input
            className="col-span-12 sm:col-span-5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descripción del servicio o producto"
            value={it.descripcion}
            onChange={e => actualizar(idx, "descripcion", e.target.value)}
          />
          <input type="number" min={1}
            className="col-span-4 sm:col-span-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1"
            value={it.cantidad || ""}
            onChange={e => actualizar(idx, "cantidad", Number(e.target.value))}
          />
          <input type="number" min={0}
            className="col-span-4 sm:col-span-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            value={it.precioUnitario || ""}
            onChange={e => actualizar(idx, "precioUnitario", Number(e.target.value))}
          />
          <input type="number" min={0} max={100}
            className="col-span-3 sm:col-span-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
            value={it.descuento || ""}
            onChange={e => actualizar(idx, "descuento", Number(e.target.value))}
          />
          <div className="col-span-4 sm:col-span-1 text-right text-sm font-medium text-gray-700">
            {formatCLP(it.total)}
          </div>
          <button type="button" onClick={() => eliminar(idx)}
            disabled={items.length === 1}
            className="col-span-1 p-1.5 text-gray-300 hover:text-red-400 disabled:opacity-20 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button type="button" onClick={agregar}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 transition-colors mt-1">
        <Plus size={15} />
        Agregar ítem
      </button>

      {/* Totales */}
      <div className="border-t border-gray-100 pt-3 space-y-1">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Subtotal (neto)</span>
          <span>{formatCLP(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>IVA 19%</span>
          <span>{formatCLP(iva)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
          <span>Total</span>
          <span>{formatCLP(total)}</span>
        </div>
      </div>
    </div>
  );
}
