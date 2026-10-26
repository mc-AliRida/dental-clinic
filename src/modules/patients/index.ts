import { patientRepository } from "./patient.repository";
import { PatientService } from "./patient.service";

// Composition root: wires the real repository into the service.
export const patientService = new PatientService(patientRepository);
