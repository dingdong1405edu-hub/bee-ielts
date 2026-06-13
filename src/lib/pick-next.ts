import type { PrismaClient, Skill } from "@prisma/client";

/**
 * Chọn đề luyện tập kế tiếp sao cho người học ÍT bị lặp lại nhất.
 *
 * Thứ tự ưu tiên:
 *   1. Đề chưa từng làm hoặc đã làm từ lâu (ngoài cửa sổ `windowSize` lần gần
 *      nhất) → chọn NGẪU NHIÊN trong nhóm này.
 *   2. Nếu tất cả đề đều vừa làm gần đây (kho nhỏ) → chọn đề đã làm LÂU NHẤT
 *      (least-recently-done), ngẫu nhiên nếu có nhiều đề cùng "tuổi".
 *
 * Nhờ vậy:
 *   - Kho lớn: gần như không bao giờ lặp trong 12 lượt gần nhất.
 *   - Kho nhỏ: xoay vòng đều, không bao giờ ra lại đúng đề vừa làm xong.
 *
 * `recentRefIds` phải được sắp xếp MỚI NHẤT TRƯỚC (lượt vừa làm ở index 0).
 */
export function pickLeastRecentId(
  poolIds: string[],
  recentRefIds: string[],
  windowSize = 12,
): string | null {
  if (poolIds.length === 0) return null;
  if (poolIds.length === 1) return poolIds[0];

  const rnd = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

  // Hạng "độ mới": index trong recentRefIds (0 = vừa làm). Chưa làm → Infinity.
  const rank = new Map<string, number>();
  for (const id of poolIds) rank.set(id, Infinity);
  recentRefIds.forEach((ref, i) => {
    if (rank.get(ref) === Infinity) rank.set(ref, i);
  });

  const recentWindow = new Set(recentRefIds.slice(0, windowSize));
  const fresh = poolIds.filter((id) => !recentWindow.has(id));
  if (fresh.length > 0) return rnd(fresh);

  // Mọi đề đều nằm trong cửa sổ gần đây → lấy đề có hạng lớn nhất (cũ nhất).
  const maxRank = Math.max(...poolIds.map((id) => rank.get(id) ?? 0));
  const oldest = poolIds.filter((id) => (rank.get(id) ?? 0) === maxRank);
  return rnd(oldest);
}

/**
 * Tiện ích: lấy danh sách refId các lượt làm gần đây của 1 kỹ năng (đã bỏ tiền
 * tố "mock-"), mới nhất trước. Dùng chung cho các trang /start.
 */
export async function recentRefIdsForSkill(
  prisma: PrismaClient,
  userId: string,
  skill: Skill,
  take = 30,
): Promise<string[]> {
  const rows = await prisma.attempt.findMany({
    where: { userId, skill },
    orderBy: { createdAt: "desc" },
    take,
    select: { refId: true },
  });
  return rows.map((r) => r.refId.replace(/^mock-/, ""));
}
