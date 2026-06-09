import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RoomClient } from "./room-client";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { code } = await params;
  return <RoomClient code={code.toUpperCase()} />;
}
