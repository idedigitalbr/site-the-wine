import { NextRequest, NextResponse } from "next/server";
import { adminDashboardQuerySchema } from "@/modules/admin/schemas/admin-schema";
import { loadAdminDashboard } from "@/server/admin/composition";
import { AdminAuthError, requireAdminSession } from "@/server/admin/auth";

function todayIso(): string {
  const timeZone =
    process.env.RESERVATION_ESTABLISHMENT_TIMEZONE?.trim() ||
    "America/Sao_Paulo";
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

function dashboardInput(request: NextRequest): Record<string, string> {
  const input: Record<string, string> = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  );
  const date = input.date || todayIso();
  if (!input.from) input.from = date;
  if (!input.to) input.to = date;
  return input;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = adminDashboardQuerySchema.safeParse(dashboardInput(request));
    if (!parsed.success)
      return NextResponse.json(
        { error: "invalid_dashboard_query" },
        { status: 400 },
      );
    const dashboard = await loadAdminDashboard({
      fromDate: parsed.data.from,
      toDate: parsed.data.to,
      search: parsed.data.search,
      time: parsed.data.time,
      status: parsed.data.status,
      areaId: parsed.data.areaId,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
    return NextResponse.json(dashboard.reservations);
  } catch (error) {
    if (error instanceof AdminAuthError)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    console.error("Admin dashboard reservations failed", error);
    return NextResponse.json({ error: "admin_unavailable" }, { status: 503 });
  }
}
