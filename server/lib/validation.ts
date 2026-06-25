import { z } from "zod";
import { REPORT_STATUSES, REPORT_TYPES } from "../../shared/types.ts";

const trimmedString = (max: number) =>
	z.string().trim().max(max).optional().nullable();

export const createReportSchema = z
	.object({
		type: z.enum(REPORT_TYPES),
		lat: z.number().min(-90).max(90).optional().nullable(),
		lng: z.number().min(-180).max(180).optional().nullable(),
		accuracy: z.number().nonnegative().optional().nullable(),
		peopleCount: z.number().int().min(0).max(10000).optional().nullable(),
		floor: trimmedString(50),
		injured: z.boolean().optional().nullable(),
		foundAt: trimmedString(50),
		description: trimmedString(2000),
		// Auto-reporte "estoy a salvo": único status que el público puede fijar al crear.
		selfSafe: z.boolean().optional(),
		personName: trimmedString(200),
		// Foto base64 (sin prefijo), ~máx 6MB de string ≈ 4.5MB de imagen.
		photo: z.string().max(6_000_000).optional().nullable(),
		photoMime: z.string().max(50).optional().nullable(),
		lastKnownAddress: trimmedString(500),
		relation: trimmedString(100),
		reporterName: trimmedString(200),
		reporterContact: trimmedString(200),
		reporterCountry: trimmedString(100),
	})
	.superRefine((data, ctx) => {
		// SOS y tercero requieren coordenadas para que el rescate sirva.
		if (data.type === "sos" || data.type === "tercero") {
			if (data.lat == null || data.lng == null) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Se requiere ubicación (lat/lng) para SOS o reporte de terceros",
					path: ["lat"],
				});
			}
		}
		// Búsqueda de persona requiere al menos un nombre.
		if (data.type === "busqueda_persona" && !data.personName) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Se requiere el nombre de la persona buscada",
				path: ["personName"],
			});
		}
	});

export type CreateReportBody = z.infer<typeof createReportSchema>;

export const updateReportSchema = z.object({
	status: z.enum(REPORT_STATUSES).optional(),
	verified: z.boolean().optional(),
	claimedBy: z.string().trim().max(200).optional().nullable(),
});

export const geocodeSchema = z.object({
	address: z.string().trim().min(3).max(500),
});

export const searchSchema = z.object({
	name: z.string().trim().min(2).max(200),
});
