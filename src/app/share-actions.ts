"use server";

/**
 * Server Actions for managing read-only share links. Every action is guarded by
 * `requireSession()` — only the authenticated owner can create, revoke, or
 * delete links. Share viewers (no session) are rejected.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth-actions";
import { createShareLink, revokeShareLink, deleteShareLink } from "@/lib/share";
import { SHAREABLE_HREFS } from "@/config/share-tabs";

export type CreateResult =
  | { ok: true; token: string }
  | { ok: false; error: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

const createSchema = z.object({
  label: z.string().max(120).optional().default(""),
  // Only known, shareable tabs are accepted.
  allowedTabs: z.array(z.enum(SHAREABLE_HREFS as [string, ...string[]])).min(1, "Pick at least one tab"),
  // Days until expiry; 0 / empty = never.
  expiresInDays: z.coerce.number().int().min(0).max(3650).optional().default(0),
});

export async function createShareLinkAction(input: unknown): Promise<CreateResult> {
  try {
    await requireSession();
    const v = createSchema.parse(input);
    const expiresAt =
      v.expiresInDays > 0
        ? new Date(Date.now() + v.expiresInDays * 86400_000)
        : null;
    const { token } = await createShareLink({
      label: v.label,
      allowedTabs: v.allowedTabs,
      expiresAt,
    });
    revalidatePath("/dashboard/sharing");
    return { ok: true, token };
  } catch (e) {
    const msg = e instanceof z.ZodError ? e.issues.map((i) => i.message).join(", ") : String(e);
    return { ok: false, error: msg };
  }
}

export async function revokeShareLinkAction(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await revokeShareLink(id);
    revalidatePath("/dashboard/sharing");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function deleteShareLinkAction(id: number): Promise<ActionResult> {
  try {
    await requireSession();
    await deleteShareLink(id);
    revalidatePath("/dashboard/sharing");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
