# Bee IELTS 🐝

Web học tiếng Anh full-stack: từ vựng & ngữ pháp Duolingo-style, IELTS Reading/Listening/Writing/Speaking với AI chấm bằng Claude.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn-style UI
- PostgreSQL + Prisma
- Auth.js (NextAuth v5) — credentials provider
- Anthropic Claude SDK — chấm Writing & Speaking
- Web Speech API — transcribe browser cho Speaking
- Deploy: Railway

## Modules
- **Vocabulary** — Duolingo-style (units → lessons → exercises) với XP, hearts, streak
- **Grammar** — bài lý thuyết + fill-blank
- **Reading** — passage + multiple choice / fill-in-blank / true-false
- **Listening** — audio player + questions
- **Writing** — Task 1 & 2 IELTS, AI chấm 4 tiêu chí band
- **Speaking** — Part 1, 2, 3 IELTS — record → transcribe → AI chấm 4 tiêu chí
- **Admin** — CRUD content (Reading, Writing), thống kê users & attempts

## Tài khoản demo
- Admin: `admin@bee-ielts.com` / `admin123`
- Learner: `demo@bee-ielts.com` / `demo1234`

## Local dev
```bash
npm install --legacy-peer-deps
cp .env.example .env.local   # fill ANTHROPIC_API_KEY, AUTH_SECRET, DATABASE_URL
npx prisma migrate dev
npm run db:seed
npm run dev
```

## Deploy Railway
1. Tạo project mới trên Railway → connect GitHub repo
2. Add PostgreSQL plugin
3. Set env vars: `AUTH_SECRET`, `ANTHROPIC_API_KEY`, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_APP_URL`
4. Railway auto-detect Next.js, build & deploy

Build command (set trong railway.toml): `npm install --include=dev && npx prisma generate && npx prisma migrate deploy && npm run build`

## License
MIT
