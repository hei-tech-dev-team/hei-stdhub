# HEI STDhub v2

Full-stack web platform for HEI students and teachers. Access course materials (cours, TD, examens), submit homework, chat in real-time, suggest improvements, and manage the school community — all with a navy/gold glassmorphism UI.

## Stack

**Frontend:** React 19, Vite, Tailwind CSS, React Router 7, Socket.IO Client, Font Awesome, Lucide React, jsPDF, html2canvas, DOMPurify  
**Backend:** Express 5, Socket.IO 4, PostgreSQL (Supabase), JWT (jsonwebtoken + bcryptjs), Nodemailer (Resend/SMTP), Cloudinary (file uploads), Multer, express-rate-limit  
**Testing:** Mocha + Chai (61 frontend tests, 54 backend tests)  
**Deployment:** Vercel (frontend) + Render (backend)

## Features

- **Auth** — Login, register, forgot/reset password with email
- **Posts** — Browse cours/TD/examen files by UE
- **Submissions** — Submit homework files/links by level & group
- **Support links** — Curated external resources per UE
- **Chat** — Real-time global & private messaging with Socket.IO, online indicators, file sharing, seen status
- **Suggestions** — Submit and upvote platform improvements
- **Admin** — User management, role changes, invitation codes, stats dashboard
- **BDE** — Student government section
- **Profile** — Edit personal info and avatar
