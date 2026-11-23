-- One person = one (first name, last name, date of birth), ignoring letter case.
-- Names are stored as typed; the index compares them lowercased,
-- so "Ali" and "ali" are the same person.
CREATE UNIQUE INDEX "uq_patients_identity"
  ON "patients" (lower("first_name"), lower("last_name"), "date_of_birth");
