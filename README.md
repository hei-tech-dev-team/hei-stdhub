# HEI STDhub v2 — v1.4.0

Full-stack web platform for HEI students, alumni, teachers, and admin. Access course materials (cours, TD, examens), submit homework, chat in real-time with role badges, suggest improvements to the BDE, and manage the school community — all with a navy/gold glassmorphism UI.

## Stack

**Frontend:** React 19, Vite, Tailwind CSS, React Router 7, Socket.IO Client, Font Awesome, Lucide React, jsPDF, html2canvas, DOMPurify  
**Backend:** Express 5, Socket.IO 4, PostgreSQL (Supabase), JWT (jsonwebtoken + bcryptjs), Nodemailer (Resend/SMTP), Cloudinary (file uploads), Multer, express-rate-limit, web-push  
**Testing:** Mocha + Chai (200 backend tests)  
**Documentation:** `FOR_DEV.md` (overview), `FOR_BACK_DEV.md` (backend), `FOR_FRONT_DEV.md` (frontend), `FOR_QA.md` (testing), `FOR_OPS.md` (ops), `FOR_CONTRIBUTING.md` (contribute), `ALL_ABOUT_API.md` (API reference)  
**Deployment:** Vercel (frontend) + Render (backend)

## Features

- **Auth** — Login, register, forgot/reset password with email, invitation codes; alumni/student toggle on both login & register pages
- **Alumni** — Dedicated AlumniHome dashboard with quick links; amber "Alumni · Promo X" badge in Navbar and chat; restricted nav (Home, Chat, Suggestions, Profile only)
- **Dashboard** — Browse cours/TD/examen posts filtered by UE, level, and type
- **Submissions** — Submit homework files/links by level, group, and UE
- **Support links** — Curated external resources per UE (teachers can add/delete)
- **Chat** — Real-time global & private messaging with Socket.IO, online/offline indicators, file/image sharing, seen/delivered status, **message deletion** (own messages only), **unread badges** (global + per-contact), **role badges** (BDE/Prof/Admin/Alumni), push notifications via Web Push API (PWA)
- **Suggestions** — Submit ideas (students, alumni, teachers, admin); BDE reviews with drag-and-drop Kanban, generates PDF reports shared to chat
- **Admin** — User & invitation management, role changes (including alumni), stats dashboard with live polling, **real-time user updates** via Socket.IO; BDE members appear when filtering by "Étudiant"; seasonal forms: **class upgrade** (Sept, with failed refs list) and **L1 registration** (Nov, with manual STD ref entry)
- **BDE** — Kanban board for suggestion triage (received/accepted/to-discuss/refused), PDF report generation with jsPDF
- **Profile** — Avatar upload (Cloudinary/local fallback), **unique pseudo** (checked on register & profile update), password update; glassmorphism redesign with staggered animations, animated cover header, rotating border avatar, role-based badges, password visibility toggles, toast notifications
- **UI/UX** — Glassmorphism design, smooth micro-animations, responsive mobile layout; redesigned OnboardingModal with floating particles, spring transitions, gold sparkle dots; improved error feedback on admin forms; message timestamps always visible on mobile
- **PWA** — Service worker for push notifications; works even when the browser is closed (mobile); Web Push API with VAPID keys; **global chat push notifications** sent to all subscribed users
- **Database migrations** — Invitations table, first_login column, email constraints, multi-use invitations, alumni/bde roles, and chat improvements (seen/seen_at, unique pseudo, avatar, global_chat_read table)
- **Scalability (500+ users)** — Pagination on all list endpoints (`limit`/`offset`/`before` cursors), database indexes (GIN on `users.ues`, composite on `messages`, `suggestions`, `invitations`), batch push notifications with concurrency control, batch bulk invitation INSERT, batch message seen marking, DB pool config (`max: 25`)

---

&copy; 2026 HEI STDhub. All rights reserved.
