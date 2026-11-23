import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/http";
import { patientService } from "@/modules/patients";
import { createPatientSchema, searchPatientsSchema } from "@/modules/patients/patient.schema";

// POST /api/patients: create a patient profile
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const input = createPatientSchema.parse(body)
        const patient = await patientService.create(input)
        return NextResponse.json(patient, { status: 201 })
    }
    catch (error) {
        return handleError(error)
    }
}

// GET search by name or phone
export async function GET(request: NextRequest) {
    try {
        const params = searchPatientsSchema.parse(
            Object.fromEntries(request.nextUrl.searchParams)
        )
        const result = await patientService.search(params)
        return NextResponse.json(result)
    } catch (error) {
        return handleError(error)
    }
}