import { Prisma } from "@prisma/client";

/**
 * Coerce an array (or null/undefined) coming from an admin form into the
 * shape Prisma expects for an optional Json column.
 *  - undefined → don't change the column (Prisma treats undefined as "skip")
 *  - null / empty array → clear the column (Prisma.JsonNull)
 *  - non-empty array → store as JSON
 */
export function toNullableJsonArray(
  v: unknown[] | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (v === undefined) return undefined;
  if (v === null || (Array.isArray(v) && v.length === 0)) return Prisma.JsonNull;
  return v as Prisma.InputJsonValue;
}
