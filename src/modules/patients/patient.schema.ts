import { z } from "zod";

const name = z.string().trim().min(1, "Required").max(100);

export const createPatientSchema = z.object({
  first_name: name,
  last_name: name,
  phone_number: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{6,30}$/, "Invalid phone number"),
  email: z.string().trim().toLowerCase().email().max(255).nullish(),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .refine((s) => {
      const d = new Date(s);
      return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
    }, "Not a real date")
    .refine((s) => new Date(s) <= new Date(), "Date of birth cannot be in the future")
    .refine((s) => new Date(s).getFullYear() >= 1900, "Date of birth is too old"),
  medical_alerts: z.string().trim().max(2000).default(""),
});

export const searchPatientsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const patientIdSchema = z.string().uuid("Invalid patient id");

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type SearchPatientsInput = z.infer<typeof searchPatientsSchema>;
