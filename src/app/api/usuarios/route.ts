import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await requireAdmin();
    const admins = await prisma.admin.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(admins.map((a) => ({ ...a, password: undefined })));
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { nombre, email, password, rol } = await req.json();
    const hash = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: { nombre, email, password: hash, rol: rol ?? "ADMIN" },
    });
    return NextResponse.json({ id: admin.id, email: admin.email, nombre: admin.nombre, rol: admin.rol }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
