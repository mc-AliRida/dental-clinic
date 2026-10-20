-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "dentists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dentists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "date_of_birth" DATE NOT NULL,
    "medical_alerts" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "dentist_id" UUID NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "status" "appointment_status" NOT NULL DEFAULT 'SCHEDULED',
    "canceled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "visit_date" DATE NOT NULL,
    "treatment_performed" TEXT NOT NULL,
    "clinical_notes" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID NOT NULL,
    "note_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dentists_email_key" ON "dentists"("email");

-- CreateIndex
CREATE INDEX "idx_patients_name" ON "patients"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "idx_patients_phone" ON "patients"("phone_number");

-- CreateIndex
CREATE INDEX "idx_appointments_week_view" ON "appointments"("dentist_id", "start_time");

-- CreateIndex
CREATE INDEX "idx_appointments_patient" ON "appointments"("patient_id", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "uq_appointments_id_patient" ON "appointments"("id", "patient_id");

-- CreateIndex
CREATE INDEX "idx_reports_patient_newest" ON "health_reports"("patient_id", "visit_date", "created_at");

-- CreateIndex
CREATE INDEX "idx_report_notes_report" ON "report_notes"("report_id", "created_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "dentists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_appointment_id_patient_id_fkey" FOREIGN KEY ("appointment_id", "patient_id") REFERENCES "appointments"("id", "patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_notes" ADD CONSTRAINT "report_notes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "health_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE EXTENSION IF NOT EXISTS btree_gist;


ALTER TABLE "appointments"
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    dentist_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status = 'SCHEDULED');

-- 2. An appointment must end after it starts
ALTER TABLE "appointments"
  ADD CONSTRAINT appointments_time_order
  CHECK (end_time > start_time);

-- 3. canceled_at is set if and only if the status is CANCELED
ALTER TABLE "appointments"
  ADD CONSTRAINT appointments_cancel_consistency
  CHECK ((status = 'CANCELED') = (canceled_at IS NOT NULL));

-- 4. Dentist emails are stored lowercase, so the UNIQUE index is effectively case-insensitive
ALTER TABLE "dentists"
  ADD CONSTRAINT dentists_email_lowercase
  CHECK (email = lower(email));