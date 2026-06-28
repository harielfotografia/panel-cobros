import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { generateServiceKey } from "@/lib/service-key";

export async function GET() {
  try {
    await requireAdmin();
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
