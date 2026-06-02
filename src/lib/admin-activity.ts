import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export type AdminEntityType =
  | "READING_TEST"
  | "LISTENING_TEST"
  | "WRITING_TASK"
  | "SPEAKING_SET"
  | "BAND_STAGE"
  | "MINI_QUIZ"
  | "VOCAB_UNIT"
  | "VOCAB_LESSON"
  | "GRAMMAR_UNIT"
  | "GRAMMAR_LESSON"
  | "BACKGROUND_MUSIC"
  | "SPEAKING_VOICE";

export type AdminAction = "CREATE" | "UPDATE" | "DELETE";

const HREF_BUILDERS: Partial<Record<AdminEntityType, (id: string) => string>> = {
  READING_TEST: (id) => `/admin/reading/${id}`,
  LISTENING_TEST: (id) => `/admin/listening/${id}`,
  WRITING_TASK: (id) => `/admin/writing/${id}`,
  SPEAKING_SET: (id) => `/admin/speaking/${id}`,
  BAND_STAGE: (id) => `/admin/band-climber/${id}`,
  VOCAB_UNIT: () => `/admin/vocab`,
  VOCAB_LESSON: () => `/admin/vocab`,
  GRAMMAR_UNIT: () => `/admin/grammar`,
  GRAMMAR_LESSON: () => `/admin/grammar`,
  BACKGROUND_MUSIC: () => `/admin/music`,
  SPEAKING_VOICE: () => `/admin/voices`,
};

interface LogParams {
  action: AdminAction;
  entityType: AdminEntityType;
  entityId: string;
  entityTitle: string;
  // Override the default href (e.g. mini-quiz under a band stage).
  entityHref?: string | null;
}

/** Append an audit-log row for an admin content action. Silent on failure
 *  — logging must never break the user-facing write. Resolves the actor
 *  via auth() so callers don't have to thread the session through. */
export async function logAdminActivity(params: LogParams): Promise<void> {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) return;

    const href =
      params.entityHref !== undefined
        ? params.entityHref
        : (HREF_BUILDERS[params.entityType]?.(params.entityId) ?? null);

    await prisma.adminActivity.create({
      data: {
        userId: session.user?.id ?? null,
        userEmail: email,
        userName: session.user?.name ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityTitle: params.entityTitle.slice(0, 500),
        entityHref: href,
      },
    });
  } catch (err) {
    console.error("[logAdminActivity]", err);
  }
}
