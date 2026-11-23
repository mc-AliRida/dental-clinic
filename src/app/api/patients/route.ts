import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleError } from "@/lib/http";
import { withRequestLog } from "@/lib/request-log";
import { patientService } from "@/modules/patients";
import { createPatientSchema, searchPatientsSchema } from "@/modules/patients/patient.schema";
import { toPatientDto, toPatientSummary } from "@/modules/patients/patient.mapper";



export const POST = withRequestLog(async (request: NextRequest) => {
  try {
    await requireAuth(request);
    const body = await request.json();
    const input = createPatientSchema.parse(body);
    const patient = await patientService.create(input);
    return NextResponse.json(toPatientDto(patient), { status: 201 });
  } catch (error) {
    return handleError(error);
  }
});

export const GET = withRequestLog(async (request: NextRequest) => {
  try {
    await requireAuth(request);
    const params = searchPatientsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const result = await patientService.search(params);
    return NextResponse.json(result.items.map(toPatientSummary));
  } catch (error) {
    return handleError(error);
  }
});