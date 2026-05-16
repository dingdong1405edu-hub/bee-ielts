/** Chủ sở hữu hệ thống — luôn có quyền admin, là người duy nhất cấp/thu quyền. */
export const OWNER_EMAIL = "nguyenminhsantafe@gmail.com";

/** True nếu email là owner (so sánh không phân biệt hoa thường). */
export function isOwner(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === OWNER_EMAIL;
}
