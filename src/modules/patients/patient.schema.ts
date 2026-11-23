import { z } from "zod";

const name = z
  .string()
  .trim()
  .min(1, "Required")
  .max(100)
  .transform((s) => s.replace(/\s+/g, " "));

const phoneNumber = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{6,30}$/, "Invalid phone number");

const email = z.string().trim().toLowerCase().email().max(255);

const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(s);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Not a real date")
  .refine((s) => new Date(s) <= new Date(), "Date of birth cannot be in the future")
  .refine((s) => new Date(s).getFullYear() >= 1900, "Date of birth is too old");

const medicalAlerts = z.string().trim().max(2000);

export const createPatientSchema = z
  .object({
    firstName: name,
    lastName: name,
    phoneNumber,
    email: email.nullish(),
    dateOfBirth: dateOfBirth.nullish(),
    medicalAlerts: medicalAlerts.nullish(),
  })
  // The API speaks camelCase; the service and repository keep their snake_case input.
  .transform((v) => ({
    first_name: v.firstName,
    last_name: v.lastName,
    phone_number: v.phoneNumber,
    email: v.email ?? null,
    date_of_birth: v.dateOfBirth ?? null,
    medical_alerts: v.medicalAlerts ?? "",
  }));

/** PATCH: every field optional, at least one required. undefined means "leave unchanged". */
export const updatePatientSchema = z
  .object({
    firstName: name.optional(),
    lastName: name.optional(),
    phoneNumber: phoneNumber.optional(),
    email: email.nullable().optional(),
    dateOfBirth: dateOfBirth.nullable().optional(),
    medicalAlerts: medicalAlerts.nullable().optional(),
  })
  .refine(
    (v) => Object.values(v).some((x) => x !== undefined),
    "at least one field is required",
  )
  .transform((v) => ({
    first_name: v.firstName,
    last_name: v.lastName,
    phone_number: v.phoneNumber,
    email: v.email,
    date_of_birth: v.dateOfBirth,
    medical_alerts: v.medicalAlerts === null ? "" : v.medicalAlerts, // column is not nullable
  }));

export const searchPatientsSchema = z.object({
  q: z.string().trim().min(2, "must be at least 2 characters").max(100),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const patientIdSchema = z.string().uuid("Invalid patient id");

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type SearchPatientsInput = z.infer<typeof searchPatientsSchema>;