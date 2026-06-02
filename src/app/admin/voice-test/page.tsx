import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { VoiceTestClient } from "./voice-test-client";

export const dynamic = "force-dynamic";

export default async function VoiceTestPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/dashboard");
  }
  return <VoiceTestClient />;
}
