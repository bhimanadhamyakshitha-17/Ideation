
create extension if not exists "pgcrypto";

create type public.user_role as enum ('student', 'management');
create type public.request_status as enum ('pending', 'assigned', 'completed', 'rejected');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role public.user_role not null default 'student',
  domain text default 'General',
  bio text default '',
  skills text[] default '{}',
  avatar_url text default '',
  created_at timestamptz default now()
);

create table if not exists public.hackathons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizer text not null,
  domain text not null,
  description text not null,
  event_date date,
  registration_url text default '',
  status text default 'Upcoming',
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  domain text not null,
  description text not null,
  tech_stack text[] default '{}',
  project_url text default '',
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id)
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  domain text not null,
  hackathon_name text default '',
  likes integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.professors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text not null,
  domain text not null,
  email text default '',
  availability text default 'Available',
  expertise text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.professor_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  professor_id uuid references public.professors(id) on delete set null,
  topic text not null,
  message text default '',
  status public.request_status not null default 'pending',
  created_at timestamptz default now(),
  assigned_at timestamptz
);

create index if not exists experiences_domain_idx on public.experiences(domain);
create index if not exists hackathons_domain_idx on public.hackathons(domain);
create index if not exists projects_domain_idx on public.projects(domain);
create index if not exists professor_requests_status_idx on public.professor_requests(status);

alter table public.profiles enable row level security;
alter table public.hackathons enable row level security;
alter table public.projects enable row level security;
alter table public.experiences enable row level security;
alter table public.professors enable row level security;
alter table public.professor_requests enable row level security;

create or replace function public.is_management()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'management'
  );
$$;

drop policy if exists "profiles select authenticated" on public.profiles;
create policy "profiles select authenticated"
on public.profiles for select to authenticated
using (true);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "hackathons read authenticated" on public.hackathons;
create policy "hackathons read authenticated"
on public.hackathons for select to authenticated using (true);

drop policy if exists "hackathons management insert" on public.hackathons;
create policy "hackathons management insert"
on public.hackathons for insert to authenticated
with check (public.is_management());

drop policy if exists "hackathons management update" on public.hackathons;
create policy "hackathons management update"
on public.hackathons for update to authenticated
using (public.is_management()) with check (public.is_management());

drop policy if exists "hackathons management delete" on public.hackathons;
create policy "hackathons management delete"
on public.hackathons for delete to authenticated
using (public.is_management());

drop policy if exists "projects read authenticated" on public.projects;
create policy "projects read authenticated"
on public.projects for select to authenticated using (true);

drop policy if exists "projects management insert" on public.projects;
create policy "projects management insert"
on public.projects for insert to authenticated
with check (public.is_management());

drop policy if exists "projects management update" on public.projects;
create policy "projects management update"
on public.projects for update to authenticated
using (public.is_management()) with check (public.is_management());

drop policy if exists "projects management delete" on public.projects;
create policy "projects management delete"
on public.projects for delete to authenticated
using (public.is_management());

drop policy if exists "experiences read authenticated" on public.experiences;
create policy "experiences read authenticated"
on public.experiences for select to authenticated using (true);

drop policy if exists "experiences own insert" on public.experiences;
create policy "experiences own insert"
on public.experiences for insert to authenticated
with check (student_id = auth.uid());

drop policy if exists "experiences own update" on public.experiences;
create policy "experiences own update"
on public.experiences for update to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists "experiences own delete" on public.experiences;
create policy "experiences own delete"
on public.experiences for delete to authenticated
using (student_id = auth.uid());

drop policy if exists "professors read authenticated" on public.professors;
create policy "professors read authenticated"
on public.professors for select to authenticated using (true);

drop policy if exists "professors management insert" on public.professors;
create policy "professors management insert"
on public.professors for insert to authenticated
with check (public.is_management());

drop policy if exists "professors management update" on public.professors;
create policy "professors management update"
on public.professors for update to authenticated
using (public.is_management()) with check (public.is_management());

drop policy if exists "professors management delete" on public.professors;
create policy "professors management delete"
on public.professors for delete to authenticated
using (public.is_management());

drop policy if exists "requests student read own" on public.professor_requests;
create policy "requests student read own"
on public.professor_requests for select to authenticated
using (student_id = auth.uid() or public.is_management());

drop policy if exists "requests student insert" on public.professor_requests;
create policy "requests student insert"
on public.professor_requests for insert to authenticated
with check (student_id = auth.uid());

drop policy if exists "requests management update" on public.professor_requests;
create policy "requests management update"
on public.professor_requests for update to authenticated
using (public.is_management())
with check (public.is_management());

drop policy if exists "requests management delete" on public.professor_requests;
create policy "requests management delete"
on public.professor_requests for delete to authenticated
using (public.is_management());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, domain)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', 'New Student'),
    coalesce(new.raw_user_meta_data->>'domain', 'General')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Demo professors. Add your real faculty from the management dashboard.
insert into public.professors (name, department, domain, email, availability, expertise)
values
('Dr. Ananya Rao', 'CSE / AI', 'Artificial Intelligence', 'faculty1@example.edu', 'Available', array['AI','Machine Learning','Python']),
('Prof. Ravi Kumar', 'CSE', 'Web Development', 'faculty2@example.edu', 'Available', array['React','Node.js','Supabase']),
('Dr. Meera Shah', 'ECE', 'IoT & Embedded', 'faculty3@example.edu', 'Busy', array['IoT','Arduino','Sensors'])
on conflict do nothing;
