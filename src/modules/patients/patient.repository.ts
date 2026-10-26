import { prisma } from "@/lib/prisma";
import type { CreatePatientInput, SearchPatientsInput } from "./patient.schema";

type Patient = Awaited<ReturnType<typeof prisma.patient.findFirstOrThrow>>;

export interface PatientRepository {
  create(data: CreatePatientInput): Promise<Patient>;
  findById(id: string): Promise<Patient | null>;
  findByIdentity(first: string, last: string, dob: Date): Promise<Patient | null>;
  search(params: SearchPatientsInput): Promise<{ items: Patient[]; total: number }>;
}

export const patientRepository: PatientRepository = {
  create(data) {
    return prisma.patient.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        email: data.email ?? null,
        date_of_birth: new Date(data.date_of_birth),
        medical_alerts: data.medical_alerts,
      },
    });
  },

  findById(id) {
    return prisma.patient.findUnique({ where: { id } });
  },

  findByIdentity(first, last, dob) {
    return prisma.patient.findFirst({
      where: {
        first_name: { equals: first, mode: "insensitive" },
        last_name: { equals: last, mode: "insensitive" },
        date_of_birth: dob,
      },
    });
  },

  async search({ q, limit, offset }) {
    const where = q
      ? {
          OR: [
            { first_name: { contains: q, mode: "insensitive" as const } },
            { last_name: { contains: q, mode: "insensitive" as const } },
            { phone_number: { contains: q } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.patient.count({ where }),
    ]);

    return { items, total };
  },
};
