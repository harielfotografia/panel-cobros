import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAdminOrContador } from "@/lib/auth";
import { generateServiceKey } from "@/lib/service-key";

export async function GET() {
  try {
    // Lectura: también accesible para CONTADOR (necesita ver el estado de cuenta de cada cliente).
    await requireAdminOrContador();
    const clientes = await prisma.cliente.findMany({
      include: {
        plan: true,
        suscripciones: {
          where: { activa: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(clientes);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { nombre, email, telefono, rut, dominio, coolifyAppId, apiUrl, planId, vendedoraId, monto, metodoPago, diasGracia } = body;

    // Misma validación que ya existía solo en PUT /api/clientes/[id] — sin esto, un cliente
    // podía crearse con apiUrl http:// y clinic-api.ts enviaría la service key en texto plano.
    if (apiUrl) {
      try {
        if (new URL(apiUrl).protocol !== "https:") {
          return NextResponse.json({ error: "apiUrl debe usar HTTPS" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "apiUrl inválida" }, { status: 400 });
      }
    }

    const plan = planId ? await prisma.plan.findUnique({ where: { id: planId } }) : null;

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        email,
        telefono,
        rut: rut || undefined,
        vendedoraId: vendedoraId || undefined,
        dominio,
        coolifyAppId: coolifyAppId || undefined,
        serviceKey: generateServiceKey(),
        apiUrl: apiUrl || undefined,
        planId: planId || undefined,
        suscripciones: {
          create: {
            monto: plan ? plan.precio : Number(monto),
            metodoPago,
            planId: planId || undefined,
            diasGracia: diasGracia ?? 3,
            fechaInicio: new Date(),
            fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { suscripciones: true, plan: true },
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
