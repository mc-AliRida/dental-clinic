import { ConflictError, NotFoundError, UniqueViolationError } from "@/lib/errors";
import type { PatientRepository } from "./patient.repository";
import type {
  CreatePatientInput,
  SearchPatientsInput,
  UpdatePatientInput,
} from "./patient.schema";

const DUPLICATE_MESSAGE = "A patient with the same name and date of birth already exists";

// Service layer: business rules only. Depends on the repository interface,
// never on Prisma or HTTP, so it can be unit-tested with a fake repository.
export class PatientService {
  constructor(private readonly repo: PatientRepository) {}

  async create(input: CreatePatientInput) {
    // Duplicate rule applies only when a date of birth is given:
    // two different people can share a name.
    if (input.date_of_birth) {
      // Friendly fast path: gives the 409 in the normal case.
      const duplicate = await this.repo.findByIdentity(
        input.first_name,
        input.last_name,
        new Date(input.date_of_birth),
      );
      if (duplicate) throw new ConflictError(DUPLICATE_MESSAGE);
    }

    // The database unique index is the real guard. Two simultaneous requests can both
    // pass the check above; the second insert is rejected here and mapped to the same 409.
    try {
      return await this.repo.create(input);
    } catch (error) {
      if (error instanceof UniqueViolationError) throw new ConflictError(DUPLICATE_MESSAGE);
      throw error;
    }
  }

  async update(id: string, input: UpdatePatientInput) {
    const current = await this.getById(id); // 404 if it does not exist

    // Work out the identity the patient would have AFTER the change.
    const first = input.first_name ?? current.first_name;
    const last = input.last_name ?? current.last_name;
    const dob =
      input.date_of_birth === undefined
        ? current.date_of_birth
        : input.date_of_birth === null
          ? null
          : new Date(input.date_of_birth);

    if (dob) {
      const duplicate = await this.repo.findByIdentity(first, last, dob, id);
      if (duplicate) throw new ConflictError(DUPLICATE_MESSAGE);
    }

    try {
      return await this.repo.update(id, input);
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