import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";                     
import { handleError } from "@/lib/http";
import { withRequestLog } from "@/lib/request-log";
import { patientService } from "@/modules/patients";
import { createPatientSchema, searchPatientsSchema } from "@/modules/patients/patient.schema";

export const POST = withRequestLog(async (request: NextRequest) => {
  try {
    await requireAuth();                                       
    const body = await request.json();
    const input = createPatientSchema.parse(body);
    const patient = await patientService.create(input);
    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
});

export const GET = withRequestLog(async (request: NextRequest) => {
  try {
    await requireAuth();                                      
    const params = searchPatientsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    const result = await patientService.search(params);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
});