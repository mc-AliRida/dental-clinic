import { ConflictError, NotFoundError, UniqueViolationError } from "@/lib/errors";
import type { PatientRepository } from "./patient.repository";
import type { CreatePatientInput, SearchPatientsInput } from "./patient.schema";

const DUPLICATE_MESSAGE = "A patient with the same name and date of birth already exists";

// Service layer: business rules only. Depends on the repository interface,
// never on Prisma or HTTP, so it can be unit-tested with a fake repository.
export class PatientService {
  constructor(private readonly repo: PatientRepository) {}

  async create(input: CreatePatientInput) {
    // Friendly fast path: gives the 409 in the normal case.
    const duplicate = await this.repo.findByIdentity(
      input.first_name,
      input.last_name,
      new Date(input.date_of_birth),
    );
    if (duplicate) throw new ConflictError(DUPLICATE_MESSAGE);

    // The database unique index is the real guard. Two simultaneous requests can both
    // pass the check above; the second insert is rejected here and mapped to the same 409.
    try {
      return await this.repo.create(input);
    } catch (error) {
      if (error instanceof UniqueViolationError) throw new ConflictError(DUPLICATE_MESSAGE);
      throw error;
    }
  }

  async getById(id: string) {
    const patient = await this.repo.findById(id);
    if (!patient) throw new NotFoundError("Patient");
    return patient;
  }

  async search(params: SearchPatientsInput) {
    const { items, total } = await this.repo.search(params);
    return { items, total, limit: params.limit, offset: params.offset };
  }
}
