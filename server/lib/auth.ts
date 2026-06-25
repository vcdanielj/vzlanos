import type { Context } from "hono";

// Rescatista = quien tiene el token. Mantiene el MVP simple sin login.
export const isRescuer = (c: Context): boolean => {
	const expected = process.env.RESCUER_TOKEN;
	if (!expected) return false;
	const header =
		c.req.header("x-rescuer-token") ??
		c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
	return header === expected;
};
