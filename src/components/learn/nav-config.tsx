import {
  Home, Target, Sparkles, BookOpenText, BookOpen, Headphones, PenLine, Mic,
  GraduationCap, User, Users, Layers, TrendingUp, Video, Radio,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Premium-only — shows a lock for free users. */
  premium?: boolean;
};
export type NavGroup = { label?: string; items: NavItem[] };

/**
 * Single source of truth for the app's navigation, grouped into a professional
 * information architecture. Shared by the desktop sidebar and the mobile
 * bottom-sheet so the two stay perfectly in sync.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Trang chủ", icon: Home },
      { href: "/dashboard", label: "Mục tiêu", icon: Target },
    ],
  },
  {
    label: "Luyện kỹ năng",
    items: [
      { href: "/reading", label: "Reading", icon: BookOpen },
      { href: "/listening", label: "Listening", icon: Headphones },
      { href: "/writing", label: "Writing", icon: PenLine },
      { href: "/speaking", label: "Speaking", icon: Mic },
      { href: "/vocab", label: "Từ vựng", icon: Sparkles },
      { href: "/grammar", label: "Ngữ pháp", icon: BookOpenText },
      { href: "/shadowing", label: "Shadowing", icon: Video },
      { href: "/podcasts", label: "Podcasts", icon: Radio },
      { href: "/words", label: "Học từ", icon: Layers },
    ],
  },
  {
    label: "Luyện thi",
    items: [
      { href: "/band-climber", label: "Vượt band", icon: TrendingUp, premium: true },
      { href: "/mock", label: "Thi thử", icon: GraduationCap },
    ],
  },
  {
    label: "Khác",
    items: [
      { href: "/community", label: "Cộng đồng", icon: Users },
      { href: "/profile", label: "Hồ sơ", icon: User },
    ],
  },
];

/** Labelled groups only — used by the mobile "Kỹ năng" sheet (Trang chủ lives in the bar). */
export const SHEET_GROUPS: NavGroup[] = NAV_GROUPS.filter((g) => g.label);

export function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}
