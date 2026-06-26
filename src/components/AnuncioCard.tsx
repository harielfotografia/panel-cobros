import { ESTILO_ANUNCIO } from "@/lib/anuncios";
import type { TipoAnuncio } from "@prisma/client";

type Props = {
  titulo: string;
  mensaje: string;
  tipo: TipoAnuncio;
  fecha?: Date;
  destino?: string; // "Global" o nombre del cliente, para vista admin
};

export function AnuncioCard({ titulo, mensaje, tipo, fecha, destino }: Props) {
  const e = ESTILO_ANUNCIO[tipo];
  return (
    <div className={`rounded-xl border p-4 ${e.borde} ${e.fondo}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${e.texto}`}>{e.etiqueta}</span>
        {destino && <span className="text-xs text-gray-500">{destino}</span>}
      </div>
      <p className="font-medium text-sm text-gray-100">{titulo}</p>
      <p className="text-sm text-gray-400 mt-1">{mensaje}</p>
      {fecha && (
        <p className="text-xs text-gray-600 mt-2">{fecha.toLocaleDateString("es-CL")}</p>
      )}
    </div>
  );
}
