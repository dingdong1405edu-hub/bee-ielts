import { prisma } from "@/lib/db";
import { ActivityClient } from "./activity-client";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
  entityType?: string;
  action?: string;
  userEmail?: string;
}

const PAGE_SIZE = 30;

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1"));
  const entityType = sp.entityType || undefined;
  const action = sp.action || undefined;
  const userEmail = sp.userEmail || undefined;

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    ...(userEmail ? { userEmail } : {}),
  };

  const [rows, total, allAdmins] = await Promise.all([
    prisma.adminActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.adminActivity.count({ where }),
    prisma.adminActivity.findMany({
      distinct: ["userEmail"],
      select: { userEmail: true, userName: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ActivityClient
      rows={rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      }))}
      total={total}
      page={page}
      totalPages={totalPages}
      filters={{ entityType, action, userEmail }}
      admins={allAdmins.map((a) => ({ email: a.userEmail, name: a.userName }))}
    />
  );
}
