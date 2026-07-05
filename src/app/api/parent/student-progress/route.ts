/**
 * GET /api/parent/student-progress — MOCK endpoint.
 *
 * Trả về tiến độ học của con (dành cho màn hình ParentDashboard). Hiện đang trả
 * DỮ LIỆU GIẢ để dựng/kiểm thử UI trước khi nối thật vào Prisma
 * (ParentStudent → ClassMember → Submission). Shape đã khớp với model thật để
 * sau này chỉ cần thay phần thân hàm bằng truy vấn DB, UI không phải sửa.
 *
 * `cheatCount` = số sự kiện trong Submission.cheatLogs (con thoát tab khi làm
 * bài). > 0 → frontend hiển thị Warning Badge.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface ParentSkillAverages {
  reading: number | null;
  listening: number | null;
  writing: number | null;
  speaking: number | null;
}

export interface ParentOverdueItem {
  id: string;
  title: string;
  className: string;
  skill: string;
  deadline: string; // ISO
}

export interface ParentRecentSubmission {
  id: string;
  assignmentTitle: string;
  className: string;
  skill: string;
  band: number | null;
  scorePercent: number | null;
  status: "PENDING" | "SUBMITTED" | "GRADED";
  submittedAt: string | null; // ISO
  cheatCount: number;
}

export interface ParentStudentProgress {
  student: { id: string; name: string; avatarUrl: string | null };
  summary: {
    completedCount: number;
    totalAssigned: number;
    avgBand: number | null;
    skillAverages: ParentSkillAverages;
  };
  overdue: ParentOverdueItem[];
  recent: ParentRecentSubmission[];
}

const MOCK: ParentStudentProgress = {
  student: { id: "stu_mock_1", name: "Minh Anh", avatarUrl: null },
  summary: {
    completedCount: 18,
    totalAssigned: 23,
    avgBand: 6.5,
    skillAverages: { reading: 7.0, listening: 6.5, writing: 5.5, speaking: 6.0 },
  },
  overdue: [
    {
      id: "asg_ov_1",
      title: "Reading — The History of Tea",
      className: "IELTS Foundation A",
      skill: "READING",
      deadline: "2026-07-02T15:00:00.000Z",
    },
    {
      id: "asg_ov_2",
      title: "Writing Task 2 — Technology & Society",
      className: "IELTS Foundation A",
      skill: "WRITING",
      deadline: "2026-07-03T09:00:00.000Z",
    },
    {
      id: "asg_ov_3",
      title: "Listening — Section 3 Practice",
      className: "IELTS Intensive B",
      skill: "LISTENING",
      deadline: "2026-07-04T12:00:00.000Z",
    },
  ],
  recent: [
    {
      id: "sub_1",
      assignmentTitle: "Reading — Renewable Energy",
      className: "IELTS Foundation A",
      skill: "READING",
      band: 7.0,
      scorePercent: 85,
      status: "GRADED",
      submittedAt: "2026-07-04T14:20:00.000Z",
      cheatCount: 0,
    },
    {
      id: "sub_2",
      assignmentTitle: "Listening — Section 2",
      className: "IELTS Foundation A",
      skill: "LISTENING",
      band: 6.0,
      scorePercent: 70,
      status: "GRADED",
      submittedAt: "2026-07-03T16:45:00.000Z",
      cheatCount: 3,
    },
    {
      id: "sub_3",
      assignmentTitle: "Writing Task 1 — Bar Chart",
      className: "IELTS Foundation A",
      skill: "WRITING",
      band: 5.5,
      scorePercent: null,
      status: "GRADED",
      submittedAt: "2026-07-02T10:10:00.000Z",
      cheatCount: 0,
    },
    {
      id: "sub_4",
      assignmentTitle: "Reading — Ocean Life",
      className: "IELTS Intensive B",
      skill: "READING",
      band: 6.5,
      scorePercent: 78,
      status: "GRADED",
      submittedAt: "2026-07-01T13:30:00.000Z",
      cheatCount: 1,
    },
    {
      id: "sub_5",
      assignmentTitle: "Speaking — Part 2 Cue Card",
      className: "IELTS Intensive B",
      skill: "SPEAKING",
      band: null,
      scorePercent: null,
      status: "SUBMITTED",
      submittedAt: "2026-06-30T08:00:00.000Z",
      cheatCount: 0,
    },
  ],
};

export async function GET() {
  return NextResponse.json(MOCK);
}
