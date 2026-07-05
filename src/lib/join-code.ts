/**
 * Class join codes — short, human-typable codes a student enters to self-enrol
 * (like Google Classroom). Uppercase, no visually-ambiguous characters
 * (0/O, 1/I/L) so they're easy to read off a board or a chat message.
 */
import { prisma } from "@/lib/db";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no O, I, L, 0, 1

function randomCode(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Generate a code not already used by another class. Retries a few times on
 *  the (astronomically unlikely) collision, then gives up loudly. */
export async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const clash = await prisma.class.findUnique({ where: { joinCode: code }, select: { id: true } });
    if (!clash) return code;
  }
  throw new Error("Không tạo được mã lớp duy nhất");
}
