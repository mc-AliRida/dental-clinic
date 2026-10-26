import { ConflictError, NotFoundError } from "@/lib/errors";
import type { PatientRepository } from "./patient.repository";
import type { CreatePatientInput, SearchPatientsInput } from "./patient.schema";

// Service layer: business rules only. Depends on the repository interface,
// never on Prisma or HTTP, so it can be unit-tested with a fake repository.
export class PatientService {
  constructor(private readonly repo: PatientRepository) {}

  async create(input: CreatePatientInput) {
    // Rule: the same person (name + date of birth) must not be registered twice.
    const duplicate = await this.repo.findByIdentity(
      input.first_name,
      input.last_name,
      new Date(input.date_of_birth),
    );
    if (duplicate) {
      throw new ConflictError("A patient with the same name and date of birth already exists");
    }
    return this.repo.create(input);
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
