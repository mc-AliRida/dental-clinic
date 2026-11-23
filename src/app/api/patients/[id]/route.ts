import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { withRequestLog } from "@/lib/request-log";
import { patientService } from "@/modules/patients";
import { patientIdSchema } from "@/modules/patients/patient.schema";

/** GET /api/patients/:id: fetch one patient */
export const GET = withRequestLog(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await requireAuth(request);
      const id = patientIdSchema.parse((await params).id);
      const patient = await patientService.getById(id);
      return NextResponse.json(patient);
    } catch (error) {
      return handleError(error);
    }
  },
);