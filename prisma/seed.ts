
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("sslmode"); // pg would otherwise override the ssl option below

const adapter = new PrismaPg({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false }, // DEV/SEED ONLY: Railway proxy cert is self-signed. Never copy this into the app.
});
const prisma = new PrismaClient({ adapter });

// ---------- date helpers (everything is relative to Monday of the current week) ----------
const weekStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
})();

/** dayOffset 0 = this Monday, -7 = last Monday, 7 = next Monday */
function at(dayOffset: number, time: string): Date {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
}

// ---------- tiny test helpers ----------
let failures = 0;

async function expectFail(name: string, fn: () => Promise<unknown>) {
    try {
        await fn();
        failures++;
        console.log(`  ✗ ${name}: was ACCEPTED but should have been rejected`);
    } catch (e) {
        const msg = String((e as Error).message).trim().split("\n").pop()?.trim() ?? "";
        console.log(`  ✓ ${name}: rejected  (${msg.slice(0, 90)})`);
    }
}

async function expectOk(name: string, fn: () => Promise<unknown>) {
    try {
        await fn();
        console.log(`  ✓ ${name}: accepted`);
    } catch (e) {
        failures++;
        console.log(`  ✗ ${name}: should have been accepted -> ${(e as Error).message.slice(0, 120)}`);
    }
}

async function main() {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Refusing to seed: NODE_ENV is production");
    }
    // ---------- 0. clean (child tables first because of ON DELETE RESTRICT) ----------
    await prisma.reportNote.deleteMany();
    await prisma.healthReport.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.dentist.deleteMany();

    // ---------- 1. dentist (login) ----------
    const dentist = await prisma.dentist.create({
        data: {
            email: "dr.manal@clinic.test", // must be lowercase (CHECK constraint)
            password_hash: await bcrypt.hash("Password123!", 10),
            first_name: "Manal",
            last_name: "Nahleh",
        },
    });

    // ---------- 2. patients (profiles) ----------
    const [rami, lina, georges, nour, maya, omar] = await Promise.all([
        prisma.patient.create({
            data: {
                first_name: "Rami", last_name: "Haddad", phone_number: "+961 70 111 222",
                email: "rami.haddad@example.com", date_of_birth: new Date("1985-03-14"),
                medical_alerts: "Penicillin allergy; takes blood thinners",
            },
        }),
        prisma.patient.create({
            data: {
                first_name: "Lina", last_name: "Khoury", phone_number: "+961 71 333 444",
                email: null, // email is optional
                date_of_birth: new Date("1992-11-02"),
                // medical_alerts left out -> defaults to ""
            },
        }),
        prisma.patient.create({
            data: {
                first_name: "Georges", last_name: "Saab", phone_number: "+961 03 555 666",
                email: "georges.saab@example.com", date_of_birth: new Date("1970-07-21"),
                medical_alerts: "Type 2 diabetes",
            },
        }),
        prisma.patient.create({
            data: {
                first_name: "Nour", last_name: "Daher", phone_number: "+961 76 777 888",
                email: "nour.daher@example.com", date_of_birth: new Date("2015-05-30"),
                medical_alerts: "",
            },
        }),
        prisma.patient.create({
            data: {
                first_name: "Maya", last_name: "Haddad", // same surname as Rami -> search test
                phone_number: "+961 81 999 000",
                email: "maya.haddad@example.com", date_of_birth: new Date("1990-01-09"),
                medical_alerts: "Latex allergy",
            },
        }),
        prisma.patient.create({
            data: {
                first_name: "Omar", last_name: "Itani", phone_number: "+961 70 123 456",
                email: null, date_of_birth: new Date("2001-09-17"),
                medical_alerts: "", // new patient with no appointments yet
            },
        }),
    ]);

    const appt = (
        patient_id: string, start: Date, end: Date,
        status: "SCHEDULED" | "COMPLETED" | "CANCELED" = "SCHEDULED",
    ) =>
        prisma.appointment.create({
            data: {
                patient_id, dentist_id: dentist.id, start_time: start, end_time: end, status,
                canceled_at: status === "CANCELED" ? new Date() : null,
            },
        });

    // ---------- 3. past appointments (last week) -> completed, used for reports ----------
    const ramiPast = await appt(rami.id, at(-6, "10:00"), at(-6, "10:45"), "COMPLETED");
    const ramiPast2 = await appt(rami.id, at(-20, "09:00"), at(-20, "09:30"), "COMPLETED");
    const linaPast = await appt(lina.id, at(-5, "11:00"), at(-5, "11:30"), "COMPLETED");
    await appt(georges.id, at(-4, "15:00"), at(-4, "15:30"), "COMPLETED"); // completed, NO report yet

    // ---------- 4. this week's schedule (weekly view) ----------
    await appt(nour.id, at(0, "09:00"), at(0, "09:30")); // Mon
    await appt(maya.id, at(0, "09:30"), at(0, "10:00")); // Mon, back-to-back with Nour (allowed)
    await appt(rami.id, at(1, "10:00"), at(1, "11:00")); // Tue
    await appt(lina.id, at(1, "10:00"), at(1, "11:00"), "CANCELED"); // Tue, same slot, canceled (does not block)
    await appt(georges.id, at(2, "14:00"), at(2, "14:30"), "CANCELED"); // Wed, canceled ...
    await appt(georges.id, at(3, "15:00"), at(3, "15:30")); // ... and rescheduled to Thu
    await appt(maya.id, at(2, "14:00"), at(2, "14:30")); // Wed, REBOOKS the canceled slot (allowed)
    await appt(lina.id, at(4, "09:00"), at(4, "09:45")); // Fri
    await appt(rami.id, at(7, "10:00"), at(7, "10:30")); // next week

    // ---------- 5. health reports + notes ----------
    const report1 = await prisma.healthReport.create({
        data: {
            patient_id: rami.id, appointment_id: ramiPast.id, visit_date: at(-6, "00:00"),
            treatment_performed: "Root canal, lower left molar",
            clinical_notes: "Patient tolerated procedure well. Temporary filling placed.",
        },
    });
    await prisma.healthReport.create({
        data: {
            patient_id: rami.id, appointment_id: ramiPast2.id, visit_date: at(-20, "00:00"),
            treatment_performed: "Routine cleaning and check-up",
            clinical_notes: "Mild gum inflammation. Recommended flossing daily.",
        },
    });
    await prisma.healthReport.create({
        data: {
            patient_id: lina.id, appointment_id: linaPast.id, visit_date: at(-5, "00:00"),
            treatment_performed: "Composite filling, upper right premolar",
            clinical_notes: "No complications.",
        },
    });
    await prisma.reportNote.createMany({
        data: [
            { report_id: report1.id, note_text: "Called patient the next day: no pain." },
            { report_id: report1.id, note_text: "Follow-up for permanent crown booked." },
        ],
    });

    // ---------- 6. read use cases ----------
    console.log("\n=== Read use cases ===");

    const weekEnd = at(7, "00:00");
    const week = await prisma.appointment.findMany({
        where: { dentist_id: dentist.id, status: "SCHEDULED", start_time: { gte: at(0, "00:00"), lt: weekEnd } },
        include: { patient: true },
        orderBy: { start_time: "asc" },
    });
    console.log("\nWeekly schedule (SCHEDULED only):");
    for (const a of week) {
        console.log(
            `  ${a.start_time.toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}` +
            ` - ${a.patient.first_name} ${a.patient.last_name}`,
        );
    }

    const haddads = await prisma.patient.findMany({
        where: { last_name: { contains: "haddad", mode: "insensitive" } },
        orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
    });
    console.log(`\nSearch "haddad": ${haddads.map((p) => `${p.first_name} ${p.last_name}`).join(", ")}`);

    const byPhone = await prisma.patient.findFirst({ where: { phone_number: { contains: "70 123" } } });
    console.log(`Search phone "70 123": ${byPhone?.first_name} ${byPhone?.last_name}`);

    const ramiReports = await prisma.healthReport.findMany({
        where: { patient_id: rami.id },
        include: { report_notes: { orderBy: { created_at: "asc" } } },
        orderBy: [{ visit_date: "desc" }, { created_at: "desc" }],
    });
    console.log("\nRami's reports (newest first):");
    for (const r of ramiReports) {
        console.log(`  ${r.visit_date.toISOString().slice(0, 10)} - ${r.treatment_performed} (${r.report_notes.length} notes)`);
    }

    const noReport = await prisma.appointment.findMany({
        where: { status: "COMPLETED", health_reports: { none: {} } },
        include: { patient: true },
    });
    console.log(`\nCompleted appointments still missing a report: ${noReport.map((a) => a.patient.last_name).join(", ")}`);

    // ---------- 7. constraint tests (every one of these writes must be REJECTED) ----------
    console.log("\n=== Constraint tests ===");

    await expectFail("overlap with Rami's Tue 10:00-11:00 slot", () =>
        appt(omar.id, at(1, "10:30"), at(1, "11:30")));

    await expectFail("overlap fully inside an existing appointment", () =>
        appt(omar.id, at(1, "10:15"), at(1, "10:45")));

    await expectOk("back-to-back appointment right after Rami's", () =>
        appt(omar.id, at(1, "11:00"), at(1, "11:30")));

    await expectFail("end_time before start_time", () =>
        appt(omar.id, at(3, "12:00"), at(3, "11:00")));

    await expectFail("end_time equal to start_time", () =>
        appt(omar.id, at(3, "12:00"), at(3, "12:00")));

    await expectFail("CANCELED without canceled_at", () =>
        prisma.appointment.create({
            data: { patient_id: omar.id, dentist_id: dentist.id, start_time: at(3, "13:00"), end_time: at(3, "13:30"), status: "CANCELED" },
        }));

    await expectFail("SCHEDULED with canceled_at set", () =>
        prisma.appointment.create({
            data: { patient_id: omar.id, dentist_id: dentist.id, start_time: at(3, "13:00"), end_time: at(3, "13:30"), canceled_at: new Date() },
        }));

    await expectFail("uppercase dentist email", () =>
        prisma.dentist.create({
            data: { email: "DR.NEW@clinic.test", password_hash: "x", first_name: "A", last_name: "B" },
        }));

    await expectFail("duplicate dentist email", () =>
        prisma.dentist.create({
            data: { email: "dr.manal@clinic.test", password_hash: "x", first_name: "A", last_name: "B" },
        }));

    await expectFail("report whose patient differs from the appointment's patient", () =>
        prisma.healthReport.create({
            data: {
                patient_id: lina.id, appointment_id: ramiPast.id, visit_date: at(-6, "00:00"),
                treatment_performed: "x", clinical_notes: "x",
            },
        }));

    await expectFail("second report for the same appointment", () =>
        prisma.healthReport.create({
            data: {
                patient_id: rami.id, appointment_id: ramiPast.id, visit_date: at(-6, "00:00"),
                treatment_performed: "x", clinical_notes: "x",
            },
        }));
    await expectFail("delete a patient who has appointments (Restrict)", () =>
        prisma.patient.delete({ where: { id: rami.id } }));

    await expectFail("delete an appointment that has reports (Restrict)", () =>
        prisma.appointment.delete({ where: { id: ramiPast.id } }));

    await expectFail("delete a report that has notes (Restrict)", () =>
        prisma.healthReport.delete({ where: { id: report1.id } }));

    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
    process.exitCode = failures === 0 ? 0 : 1;
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());