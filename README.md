# HEI STDhub v2

Full-stack web platform for HEI students, alumni, teachers, and admin. Access course materials (cours, TD, examens), submit homework, chat in real-time with role badges, suggest improvements to the BDE, and manage the school community — all with a navy/gold glassmorphism UI.

## Stack

**Frontend:** React 19, Vite, Tailwind CSS, React Router 7, Socket.IO Client, Font Awesome, Lucide React, jsPDF, html2canvas, DOMPurify  
**Backend:** Express 5, Socket.IO 4, PostgreSQL (Supabase), JWT (jsonwebtoken + bcryptjs), Nodemailer (Resend/SMTP), Cloudinary (file uploads), Multer, express-rate-limit  
**Testing:** Mocha + Chai (81 frontend tests, 54 backend tests)  
**Deployment:** Vercel (frontend) + Render (backend)

## Features

- **Auth** — Login, register, forgot/reset password with email, invitation codes; alumni/student toggle on both login & register pages
- **Alumni** — Dedicated AlumniHome dashboard with quick links; amber "Alumni · Promo X" badge in Navbar and chat; restricted nav (Home, Chat, Suggestions, Profile only)
- **Dashboard** — Browse cours/TD/examen posts filtered by UE, level, and type
- **Submissions** — Submit homework files/links by level, group, and UE
- **Support links** — Curated external resources per UE (teachers can add/delete)
- **Chat** — Real-time global & private messaging with Socket.IO, online/offline indicators, file/image sharing, seen/delivered status, **role badges** (BDE/Prof/Admin/Alumni)
- **Suggestions** — Submit ideas anonymously or by name; BDE reviews with drag-and-drop Kanban, generates PDF reports shared to chat
- **Admin** — User & invitation management, role changes (including alumni), stats dashboard with live polling; BDE members appear when filtering by "Étudiant"; seasonal forms: **class upgrade** (Sept, with failed refs list) and **L1 registration** (Nov, with manual STD ref entry)
- **BDE** — Kanban board for suggestion triage (received/accepted/to-discuss/refused), PDF report generation with jsPDF
- **Profile** — Avatar upload, pseudo change, password update
- **UI/UX** — Glassmorphism design, smooth micro-animations, responsive mobile layout
