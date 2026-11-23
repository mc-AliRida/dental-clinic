import pino from "pino";

/**
 * One JSON logger for the whole app. Level comes from LOG_LEVEL
 * (default: debug in development, info in production).
 *
 * Never log: passwords, tokens, cookies, the DB certificate, request bodies,
 * or clinical data (medical_alerts, clinical_notes, treatment_performed).
 * The redact list below is a safety net, not permission to log those objects.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: undefined, // no pid/hostname noise
  serializers: { err: pino.stdSerializers.err },
  redact: {
    paths: [
      "*.password",
      "*.password_hash",
      "*.token",
      "*.authorization",
      "*.cookie",
      "*.medical_alerts",
      "*.clinical_notes",
      "*.treatment_performed",
    ],
    censor: "[redacted]",
  },
});
