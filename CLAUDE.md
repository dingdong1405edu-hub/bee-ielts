# Bee IELTS — English Learning Platform

> Full-stack web app học tiếng Anh với các module: Vocabulary & Grammar (Duolingo-style), Reading, Listening, Writing, Speaking (IELTS 3-part) được chấm điểm bằng Claude AI.

---

## 1. Mục tiêu sản phẩm

Một nền tảng học tiếng Anh tích hợp giúp người học:
- Học **từ vựng & ngữ pháp** qua các bài học ngắn, gamified như Duolingo (XP, streak, hearts, lessons unlock).
- Luyện **Reading** với passages + multiple choice / fill-in-the-blank (admin upload bài từ trang quản trị).
- Luyện **Listening** với audio + questions.
- Luyện **Writing** (IELTS Task 1 + Task 2) — AI chấm theo 4 tiêu chí band score IELTS.
- Luyện **Speaking** (Part 1, 2, 3 chuẩn IELTS) — ghi âm browser → AI chấm Fluency, Lexical, Grammar, Pronunciation.

Giao diện: **chuyên nghiệp, tối giản, mobile-first**, responsive cho mọi breakpoint.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 15** (App Router) + TypeScript |
| Styling | Tailwind CSS + **shadcn/ui** (Radix primitives) |
| Icons | lucide-react |
| Animation | framer-motion (cho Duolingo-style feedback) |
| Database | **PostgreSQL** (Railway managed) |
| ORM | **Prisma** |
| Auth | **Auth.js (NextAuth v5)** — email/password + Google OAuth |
| AI Grading | **Anthropic Claude API** (`@anthropic-ai/sdk`, model `claude-sonnet-4-6` cho writing/speaking) |
| Speech-to-Text | OpenAI Whisper API hoặc Web Speech API (fallback) |
| File Storage | Railway volume hoặc Cloudflare R2 cho audio uploads |
| State | React Server Components + Zustand cho client UI state |
| Forms | react-hook-form + zod |
| Charts (progress) | recharts |
| Deployment | **Railway** (web + Postgres), **GitHub** (source + CI) |

**Lý do chọn Next.js**: SSR/SSG cho SEO landing page, API routes built-in cho backend (không cần tách service), deploy 1-click lên Railway.

---

## 3. Cấu trúc thư mục

```
bee-ielts/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── audio/                  # Listening files (hoặc dùng R2)
│   └── images/
├── src/
│   ├── app/
│   │   ├── (marketing)/        # Landing page
│   │   ├── (auth)/             # login, register, forgot-password
│   │   ├── (learn)/            # learner-facing routes
│   │   │   ├── dashboard/
│   │   │   ├── vocab/[unitId]/
│   │   │   ├── grammar/[unitId]/
│   │   │   ├── reading/[testId]/
│   │   │   ├── listening/[testId]/
│   │   │   ├── writing/[taskId]/
│   │   │   └── speaking/[setId]/
│   │   ├── admin/              # admin dashboard (role: ADMIN)
│   │   │   ├── reading/
│   │   │   ├── listening/
│   │   │   ├── writing/
│   │   │   ├── speaking/
│   │   │   ├── vocab/
│   │   │   ├── grammar/
│   │   │   └── users/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── grade/writing/route.ts
│   │   │   ├── grade/speaking/route.ts
│   │   │   ├── transcribe/route.ts
│   │   │   └── admin/.../route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn primitives
│   │   ├── learn/              # LessonCard, HeartBar, XPBar, StreakFlame
│   │   ├── admin/
│   │   └── shared/
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── auth.ts             # Auth.js config
│   │   ├── claude.ts           # Anthropic client + grading prompts
│   │   ├── whisper.ts          # Speech-to-text
│   │   └── utils.ts
│   ├── server/
│   │   └── actions/            # Server Actions (Next.js)
│   └── types/
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── railway.toml
└── README.md
```

---

## 4. Database Schema (Prisma)

Các model chính (tóm tắt — đầy đủ trong `prisma/schema.prisma`):

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  passwordHash  String?
  role          Role     @default(LEARNER)   // LEARNER | ADMIN
  xp            Int      @default(0)
  hearts        Int      @default(5)
  streakDays    Int      @default(0)
  lastActiveAt  DateTime?
  createdAt     DateTime @default(now())

  vocabProgress    VocabProgress[]
  grammarProgress  GrammarProgress[]
  attempts         Attempt[]
}

model VocabUnit {
  id          String     @id @default(cuid())
  title       String
  level       CEFRLevel  // A1 | A2 | B1 | B2 | C1 | C2
  order       Int
  lessons     VocabLesson[]
}

model VocabLesson {
  id        String   @id @default(cuid())
  unitId    String
  unit      VocabUnit @relation(fields: [unitId], references: [id])
  order     Int
  exercises Json     // [{ type: "match" | "translate" | "listen" | "type", ... }]
}

model GrammarUnit { /* tương tự VocabUnit */ }
model GrammarLesson { /* tương tự VocabLesson */ }

model ReadingTest {
  id          String   @id @default(cuid())
  title       String
  level       CEFRLevel
  passage     String   @db.Text
  timeLimit   Int      // seconds
  questions   Question[]
  createdAt   DateTime @default(now())
}

model ListeningTest {
  id          String   @id @default(cuid())
  title       String
  audioUrl    String
  transcript  String?  @db.Text
  questions   Question[]
}

model Question {
  id           String       @id @default(cuid())
  type         QuestionType // MCQ | FILL_BLANK | TRUE_FALSE | MATCHING | SHORT_ANSWER
  prompt       String       @db.Text
  options      Json?        // for MCQ / MATCHING
  correctAnswer Json
  readingId    String?
  listeningId  String?
}

model WritingTask {
  id          String   @id @default(cuid())
  taskType    Int      // 1 hoặc 2
  prompt      String   @db.Text
  imageUrl    String?  // cho Task 1 (chart/graph)
  minWords    Int
  timeLimit   Int
}

model SpeakingSet {
  id          String   @id @default(cuid())
  topic       String
  part1Questions  Json   // array of strings
  part2CueCard    Json   // { topic, points: [...] }
  part3Questions  Json
}

model Attempt {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  skill         Skill    // READING | LISTENING | WRITING | SPEAKING | VOCAB | GRAMMAR
  refId         String   // id của test/task tương ứng
  rawAnswer     Json     // user's response (text, audio URL, MCQ answers...)
  score         Float?   // band score 0-9 cho IELTS skills
  feedback      Json?    // AI feedback structured
  durationSec   Int?
  createdAt     DateTime @default(now())
}

enum Role { LEARNER ADMIN }
enum CEFRLevel { A1 A2 B1 B2 C1 C2 }
enum Skill { READING LISTENING WRITING SPEAKING VOCAB GRAMMAR }
enum QuestionType { MCQ FILL_BLANK TRUE_FALSE MATCHING SHORT_ANSWER }
```

---

## 5. Features chi tiết

### 5.1 Vocabulary & Grammar (Duolingo-style)
- **Unit → Lesson → Exercise** tree, unlock theo thứ tự.
- Exercise types: match từ-nghĩa, dịch câu, nghe và gõ, chọn từ đúng điền vào câu.
- **Hearts system**: sai 1 câu mất 1 heart, hết heart → đợi hồi hoặc xem ads (giai đoạn 2).
- **XP & Streak**: mỗi lesson xong cộng XP, hoàn thành ngày để giữ streak.
- Animation feedback (correct = green pulse + sound; wrong = red shake).

### 5.2 Reading
- Hiển thị passage bên trái, questions bên phải (desktop) / accordion (mobile).
- Timer đếm ngược.
- Submit → chấm tự động cho MCQ/Fill/T-F. Show kết quả + giải thích.
- **Admin** có thể tạo bài: nhập passage + nhiều câu hỏi với các type khác nhau.

### 5.3 Listening
- Audio player với speed control (0.75x – 1.5x), giới hạn replay (theo IELTS thật: 1 lần).
- Questions song song giống Reading.
- Admin upload audio file + transcript + questions.

### 5.4 Writing (IELTS)
- **Task 1**: mô tả biểu đồ/biểu bảng (có image) — 150 words, 20 min.
- **Task 2**: essay 250 words, 40 min.
- Editor: textarea với word counter realtime, autosave (localStorage + server every 30s).
- Submit → gọi `/api/grade/writing` → Claude trả về:
  - Band score tổng + 4 tiêu chí (Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
  - Inline comments từng đoạn.
  - Suggested improvements.

### 5.5 Speaking (IELTS 3-part)
- **Part 1**: 4-5 câu hỏi cá nhân, ghi âm từng câu (~30s/câu).
- **Part 2**: cue card, 1 phút chuẩn bị + 2 phút nói (timer cứng).
- **Part 3**: thảo luận sâu, 4-5 câu hỏi.
- Browser **MediaRecorder API** → upload audio → Whisper transcribe → Claude grade.
- Output: band + 4 tiêu chí (Fluency & Coherence, Lexical Resource, Grammatical Range, Pronunciation — phần pronunciation đánh giá dựa trên transcript chất lượng, có disclaimer).

### 5.6 Admin Dashboard
- Routes: `/admin/*` — middleware kiểm tra `role === 'ADMIN'`.
- CRUD đầy đủ cho: Reading tests, Listening tests, Writing tasks, Speaking sets, Vocab units/lessons, Grammar units/lessons.
- Rich content editor cho passage (Tiptap hoặc plain markdown).
- Upload audio: lưu vào Railway volume hoặc R2.
- User management: xem list users, reset hearts, ban, promote to admin.

---

## 6. AI Grading Prompts

Các prompt template trong [src/lib/claude.ts](src/lib/claude.ts) — phải có:
- System prompt: "You are an IELTS examiner with 10+ years of experience..."
- Structured output: yêu cầu Claude trả về **JSON** (dùng tool use hoặc strict JSON instruction) với schema fixed.
- Model: `claude-sonnet-4-6` cho cost/quality balance. Có thể fallback `claude-haiku-4-5` cho vocab feedback nhẹ.
- **Prompt caching** cho system prompt + rubric (giảm cost ~90% với writing/speaking grading).
- Temperature: 0.3 (consistent scoring).

Ví dụ output schema cho Writing:
```json
{
  "overallBand": 6.5,
  "criteria": {
    "taskAchievement": { "band": 6, "feedback": "..." },
    "coherenceCohesion": { "band": 7, "feedback": "..." },
    "lexicalResource": { "band": 6, "feedback": "..." },
    "grammaticalRange": { "band": 6.5, "feedback": "..." }
  },
  "annotations": [
    { "excerpt": "...", "issue": "...", "suggestion": "..." }
  ],
  "improvedVersion": "..."
}
```

---

## 7. UI/UX Guidelines

- **Color palette**: primary indigo/violet, success green-500, danger red-500, neutral zinc.
- **Typography**: Inter (UI), Lexend (đọc lâu — reading passages).
- **Spacing**: tuân theo Tailwind 4/8 scale.
- **Mobile-first**: tất cả layout test bằng Chrome DevTools 375px width trước.
- **Empty states**: minh hoạ + CTA rõ ràng.
- **Loading**: skeleton, không spinner toàn trang.
- **Toasts** cho feedback nhanh (sonner).
- Dark mode optional (giai đoạn 2).

Các component bắt buộc dùng từ shadcn/ui: Button, Card, Dialog, Input, Textarea, Select, Toast, Tabs, Progress, Badge, Sheet (mobile nav).

---

## 8. Environment Variables

File `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/bee_ielts"

# Auth
AUTH_SECRET=""              # openssl rand -base64 32
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# Anthropic
ANTHROPIC_API_KEY=""

# Whisper (OpenAI) cho speech-to-text
OPENAI_API_KEY=""

# Storage (chọn 1)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET=""
# hoặc dùng Railway volume mount tại /data

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

User sẽ cung cấp:
- `ANTHROPIC_API_KEY`
- `RAILWAY_TOKEN` (cho CI deploy)
- `GITHUB_TOKEN` (cho push & Actions)

---

## 9. Deployment — Railway + GitHub

### 9.1 Setup ban đầu
1. `git init` → push lên GitHub repo (public hoặc private).
2. Trên Railway: New Project → Deploy from GitHub repo.
3. Add Postgres plugin → tự inject `DATABASE_URL`.
4. Add env vars còn lại trong Railway dashboard.
5. Set start command: `pnpm start` (sau `pnpm build`).
6. Railway tự detect Next.js và build.

### 9.2 `railway.toml`
```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install --frozen-lockfile && pnpm prisma generate && pnpm prisma migrate deploy && pnpm build"

[deploy]
startCommand = "pnpm start"
healthcheckPath = "/api/health"
restartPolicyType = "ON_FAILURE"
```

### 9.3 CI (GitHub Actions)
- `.github/workflows/ci.yml`: lint + typecheck + prisma validate trên mọi PR.
- Auto deploy: Railway watch nhánh `main`, push = deploy.

---

## 10. Development Commands

```bash
# Setup
pnpm install
cp .env.example .env.local      # điền giá trị
pnpm prisma migrate dev          # tạo DB local
pnpm prisma db seed              # seed sample units + tests

# Dev
pnpm dev                         # http://localhost:3000

# Quality
pnpm typecheck
pnpm lint
pnpm format

# Production
pnpm build
pnpm start

# Prisma
pnpm prisma studio               # GUI cho DB
pnpm prisma migrate dev --name <change>
```

---

## 11. Roadmap thứ tự build

Khi Claude Code làm việc trên repo này, tuân theo thứ tự sau (mỗi bước = 1 PR/commit nhóm):

1. **Skeleton**: init Next.js + TS + Tailwind + shadcn + Prisma + Auth.js. Health route.
2. **Auth**: đăng ký/đăng nhập email + Google. Middleware bảo vệ routes.
3. **DB schema + migrations**: tất cả model ở mục 4. Seed dữ liệu mẫu (2 reading tests, 2 listening, 1 writing, 1 speaking set, 3 vocab units).
4. **Learner dashboard**: trang chính sau login — XP, streak, hearts, list các module.
5. **Vocab & Grammar Duolingo-style**: lesson flow + animations + XP/heart logic.
6. **Reading module**: render passage + questions, auto-grade.
7. **Listening module**: audio player + questions.
8. **Writing module + AI grading**: editor + Claude integration + result page.
9. **Speaking module + AI grading**: recorder + Whisper + Claude.
10. **Admin dashboard**: CRUD đầy đủ cho mọi content type.
11. **Polish**: animations, mobile QA, empty states, error boundaries.
12. **Deploy**: Railway live + custom domain.

---

## 12. Coding Conventions cho Claude Code

- **TypeScript strict**: không dùng `any`, ưu tiên `unknown` + type guard.
- **Server Actions** ưu tiên hơn API routes cho mutations từ form.
- **Validation**: mọi input từ client phải qua zod schema ở boundary.
- **Error handling**: try/catch ở server actions + return structured `{ ok, error }`. UI dùng `toast.error()`.
- **File limits**: 1 component / file. File >300 dòng cần tách.
- **Naming**: PascalCase cho components, camelCase cho utils, kebab-case cho route folders.
- **Imports**: dùng `@/` alias (đã config trong tsconfig).
- **Không tự ý** thêm thư viện mới — hỏi user trước nếu cần lib ngoài stack ở mục 2.
- **Không commit secrets**, kiểm tra `.gitignore` có `.env*` (trừ `.env.example`).
- **Migrations**: mỗi thay đổi schema phải tạo migration mới, không edit migration cũ.
- **Test trước khi báo done**: chạy `pnpm typecheck && pnpm build` ít nhất.

---

## 13. Khi user yêu cầu thay đổi

- Nếu là thay đổi nhỏ (style, copy): làm trực tiếp.
- Nếu là feature mới hoặc thay schema: tóm tắt plan ngắn → đợi xác nhận → làm.
- Khi sửa bug AI grading: kiểm tra prompt + log raw Claude response trước, không vội đổi logic.
- Khi user paste token (Anthropic / Railway / GitHub): **không** echo lại token; chỉ confirm "đã nhận" và lưu vào `.env.local` hoặc hướng dẫn set qua Railway dashboard.

---

## 14. Liên hệ & ghi chú

- Owner: dingdong1405edu@gmail.com
- Tokens cần thiết (user sẽ cung cấp khi triển khai): `ANTHROPIC_API_KEY`, `RAILWAY_TOKEN`, `GITHUB_TOKEN`.
- Mọi quyết định kiến trúc lớn → hỏi user trước.
