# CampusHub — Student & Management Collaboration Platform

A full-stack starter project for:
- Student + Management login
- Student profiles with domain/hackathon experience
- Hackathon and project discovery
- Student experience posts
- Professor requests and management assignment
- AI learning chatbot powered by Google Gemini API
- Management CRUD for hackathons, projects, professors
- Supabase Auth + PostgreSQL + Row Level Security

## Stack
Frontend: React + Vite + React Router + Supabase JS
Backend: Node.js + Express
Database/Auth: Supabase
AI: Google Gemini API through the backend

## 1. Supabase setup
1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. In Authentication > Providers, enable Email.
5. Copy the Project URL and anon key.

Create a `.env` in `frontend/`:
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_API_URL=http://localhost:5000/api

Create a `.env` in `backend/`:
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
PORT=5000

IMPORTANT: Never put SUPABASE_SERVICE_ROLE_KEY or GEMINI_API_KEY in the frontend.

## 2. Create the first management account
Register a normal account through the website first.
Then in Supabase SQL Editor run:

update public.profiles
set role = 'management'
where email = 'management@example.com';

For better security, use the exact email of the staff account. Management registration is intentionally not exposed in the UI.

## 3. Run backend
cd backend
npm install
npm run dev

## 4. Run frontend
cd frontend
npm install
npm run dev

Open the URL shown by Vite.

## AI
The `/api/ai/chat` endpoint sends the student's question to Gemini. The model can answer general learning questions. It does not magically access every Google service. If you later want Google Search grounding, Drive, YouTube, Calendar, etc., those services need their respective APIs/OAuth permissions and should be added server-side.

## Production notes
- Configure Supabase redirect URLs for your deployed frontend.
- Use HTTPS.
- Store secrets only in server environment variables.
- Add email verification and password reset before production.
- Review RLS policies before opening the app publicly.
