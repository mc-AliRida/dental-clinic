
interface PatientRecord {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string | null;
  date_of_birth: Date;
  medical_alerts: string;
  created_at: Date;
  updated_at: Date;
}

/** Contract: Patient */
export function toPatientDto(p: PatientRecord) {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    phoneNumber: p.phone_number,
    email: p.email,
    dateOfBirth: p.date_of_birth.toISOString().slice(0, 10), // "1990-05-01", not a timestamp
    medicalAlerts: p.medical_alerts,
    createdAt: p.created_at.toISOString(),
    updatedAt: p.updated_at.toISOString(),
  };
}

/** Contract: PatientSummary (search results) */
export function toPatientSummary(p: PatientRecord) {
  return {
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    phoneNumber: p.phone_number,
  };
}