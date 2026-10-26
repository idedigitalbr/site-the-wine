import { NextResponse } from "next/server";
import {
  adminReservationOperationSchema,
  adminReservationStatusSchema,
} from "@/modules/admin/schemas/admin-schema";
import {
  changeAdminReservationStatus,
  loadAdminReservation,
  operateReservation,
} from "@/server/admin/composition";
import { AdminAuthError, requireAdminSession } from "@/server/admin/auth";

type RouteContext = { params: Promise<{ id: string }> };

function parseReservationId(rawId: string): number {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1)
    throw new Error("Invalid reservation id");
  return id;
}

function reservationUpdateError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "";
  const knownResponses = [
    {
      matches: error instanceof AdminAuthError,
      body: "unauthorized",
      status: 401,
    },
    {
      matches: message === "Invalid reservation id",
      body: "invalid_id",
      status: 400,
    },
    {
      matches: message === "Reservation not found",
      body: "not_found",
      status: 404,
    },
    {
      matches: message.startsWith("Invalid reservation transition"),
      body: "invalid_transition",
      status: 409,
    },
    {
      matches:
        message.startsWith("Invalid reservation operation") ||
        message === "Reservation operation could not be applied",
      body: "invalid_operation",
      status: 409,
    },
    {
      matches: message === "Reservation state changed",
      body: "state_changed",
      status: 409,
    },
    {
      matches: error instanceof SyntaxError,
      body: "invalid_json",
      status: 400,
    },
  ];
  const response = knownResponses.find((item) => item.matches);
  if (response)
    return NextResponse.json(
      { error: response.body },
      { status: response.status },
    );
  console.error("Admin reservation update failed", error);
  return NextResponse.json({ error: "admin_unavailable" }, { status: 503 });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const { id: rawId } = await context.params;
    const id = parseReservationId(rawId);
    const payload = await request.json();
    const operation = adminReservationOperationSchema.safeParse(payload);
    if (operation.success) {
      await operateReservation(id, operation.data.operation);
      return NextResponse.json({ ok: true });
    }
    const status = adminReservationStatusSchema.safeParse(payload);
    if (!status.success)
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    await changeAdminReservationStatus(id, status.data.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return reservationUpdateError(error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const { id: rawId } = await context.params;
    const id = parseReservationId(rawId);
    const reservation = await loadAdminReservation(id);
    if (!reservation)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(reservation);
  } catch (error) {
    return reservationUpdateError(error);
  }
}
