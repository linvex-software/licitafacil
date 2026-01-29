import { z } from "zod";

export const AlertSeverity = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;

export const AlertStatus = {
  UNSEEN: "UNSEEN",
  SEEN: "SEEN",
  RESOLVED: "RESOLVED",
} as const;

export const createAlertSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200, "Título muito longo"),
  message: z.string().min(1, "Mensagem é obrigatória").max(2000, "Mensagem muito longa"),
  type: z.string().optional(),
  severity: z
    .enum([AlertSeverity.INFO, AlertSeverity.WARNING, AlertSeverity.CRITICAL])
    .optional()
    .default(AlertSeverity.INFO),
  resourceType: z.string().optional().nullable(),
  resourceId: z.string().uuid().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

export const updateAlertSchema = z.object({
  status: z
    .enum([AlertStatus.UNSEEN, AlertStatus.SEEN, AlertStatus.RESOLVED])
    .optional(),
  title: z.string().min(1).max(200).optional(),
  message: z.string().min(1).max(2000).optional(),
  metadata: z.any().optional().nullable(),
});

export const alertSchema = z.object({
  id: z.string().uuid(),
  empresaId: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  type: z.string().nullable(),
  severity: z.string(),
  resourceType: z.string().nullable(),
  resourceId: z.string().uuid().nullable(),
  metadata: z.any().nullable(),
  status: z.string(),
  createdBy: z.string().uuid().nullable(),
  seenAt: z.string().datetime().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Alert = z.infer<typeof alertSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
export type AlertSeverityType = keyof typeof AlertSeverity;
export type AlertStatusType = keyof typeof AlertStatus;

