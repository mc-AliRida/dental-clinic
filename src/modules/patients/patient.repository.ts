import { prisma } from "@/lib/prisma";
import { UniqueViolationError } from "@/lib/errors";
import type {
  CreatePatientInput,
  SearchPatientsInput,
  UpdatePatientInput,
} from "./patient.schema";

// Repository layer: the ONLY place that talks to Prisma for patients.
// No business rules, no HTTP, no validation. Just queries.

type Patient = Awaited<ReturnType<typeof prisma.patient.findFirstOrThrow>>;

export interface PatientRepository {
  create(data: CreatePatientInput): Promise<Patient>;
  update(id: string, data: UpdatePatientInput): Promise<Patient>;
  findById(id: string): Promise<Patient | null>;
  findByIdentity(first: string, last: string, dob: Date, excludeId?: string): Promise<Patient | null>;
  search(params: SearchPatientsInput): Promise<{ items: Patient[]; total: number }>;
}

/** Prisma reports a unique-index violation as P2002. */
function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export const patientRepository: PatientRepository = {
  async create(data) {
    try {
      return await prisma.patient.create({
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
          email: data.email,
          date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : null,
          medical_alerts: data.medical_alerts,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UniqueViolationError();
      throw error;
    }
  },

  async update(id, data) {
    try {
      return await prisma.patient.update({
        where: { id },
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
          email: data.email,
          date_of_birth:
            data.date_of_birth === undefined
              ? undefined
              : data.date_of_birth === null
                ? null
                : new Date(data.date_of_birth),
          medical_alerts: data.medical_alerts,
        },
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new UniqueViolationError();
      throw error;
    }
  },

  findById(id) {
    return prisma.patient.findUnique({ where: { id } });
  },

  findByIdentity(first, last, dob, excludeId) {
    return prisma.patient.findFirst({
      where: {
        first_name: { equals: first, mode: "insensitive" },
        last_name: { equals: last, mode: "insensitive" },
        date_of_birth: dob,
        ...(excludeId ? { id: { not: excludeId } } : {}),
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