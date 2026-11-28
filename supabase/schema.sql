-- =====================================================================
-- khuldulinp.com backend: tables, access rules and the first content.
--
-- How to use (ADMIN.md, step 3): open your project's SQL editor, paste
-- ALL of this file, press Run. Running it again later is safe: it never
-- deletes data and never overwrites content you have edited.
--
-- Who can do what (every table has row level security switched on):
--   site_content  anyone may read it; only an admin may change it.
--   messages      anyone may send one (insert only, with limits);
--                 only an admin may read, mark read/unread or delete.
--   page_events   anyone may add one (insert only, with limits);
--                 only an admin may read them (as totals, see admin_stats).
--   admins        nobody can read or change it through the website;
--                 only this SQL editor can.
--
-- "Admin" means: signed in, email confirmed, and that email is in the
-- admins table. So even if sign-ups were ever switched back on by
-- mistake, a new account would see and change nothing.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. The admin list
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  email    text primary key check (email = lower(btrim(email)) and position('@' in email) > 1),
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;
-- No policies on purpose: the website key can neither read nor change this list.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a on a.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. Site content: one row, the editable parts of js/config.js as JSON
-- ---------------------------------------------------------------------
create table if not exists public.site_content (
  id         smallint primary key default 1 check (id = 1),
  content    jsonb not null check (jsonb_typeof(content) = 'object' and pg_column_size(content) < 262144),
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.site_content enable row level security;
revoke all on table public.site_content from anon, authenticated;
grant select on table public.site_content to anon, authenticated;
grant update (content) on table public.site_content to authenticated;

drop policy if exists "Anyone can read the site content" on public.site_content;
create policy "Anyone can read the site content"
  on public.site_content for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can change the site content" on public.site_content;
create policy "Admins can change the site content"
  on public.site_content for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.site_content_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := left(coalesce(auth.jwt() ->> 'email', ''), 254);
  return new;
end;
$$;
drop trigger if exists site_content_stamp on public.site_content;
create trigger site_content_stamp
  before update on public.site_content
  for each row execute function public.site_content_stamp();


-- ---------------------------------------------------------------------
-- 3. Messages from the contact form
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  email      text not null check (char_length(email) <= 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  brand      text not null default '' check (char_length(brand) <= 160),
  service    text not null default '' check (char_length(service) <= 80),
  message    text not null check (char_length(btrim(message)) between 1 and 5000),
  lang       text not null default 'en' check (lang in ('en', 'ne')),
  session_id text check (session_id is null or session_id ~ '^[a-z0-9]{8,40}$'),
  read       boolean not null default false
);
create index if not exists messages_created_at_idx on public.messages (created_at desc);
create index if not exists messages_session_idx on public.messages (session_id, created_at);
alter table public.messages enable row level security;
revoke all on table public.messages from anon, authenticated;
-- Visitors may only add a message, and only these columns (not `read`, not the date).
grant insert (name, email, brand, service, message, lang, session_id) on table public.messages to anon;
grant select, delete on table public.messages to authenticated;
grant update (read) on table public.messages to authenticated;

drop policy if exists "Visitors can send a message" on public.messages;
create policy "Visitors can send a message"
  on public.messages for insert
  to anon
  with check (read = false);

drop policy if exists "Admins can read messages" on public.messages;
create policy "Admins can read messages"
  on public.messages for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins can mark messages" on public.messages;
create policy "Admins can mark messages"
  on public.messages for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete messages" on public.messages;
create policy "Admins can delete messages"
  on public.messages for delete
  to authenticated
  using ((select public.is_admin()));

-- Limits that need no server of our own: at most 3 messages per visit per
-- hour, and at most 30 messages an hour in total. Over the limit the form
-- falls back to opening the visitor's email app.
create or replace function public.messages_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  new.read := false;
  new.name := btrim(new.name);
  new.email := lower(btrim(new.email));
  if new.session_id is not null and (
    select count(*) from public.messages m
    where m.session_id = new.session_id and m.created_at > now() - interval '1 hour'
  ) >= 3 then
    raise exception 'Too many messages from this visit' using errcode = 'P0001';
  end if;
  if (select count(*) from public.messages m where m.created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many messages right now' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists messages_guard on public.messages;
create trigger messages_guard
  before insert on public.messages
  for each row execute function public.messages_guard();


-- ---------------------------------------------------------------------
-- 4. Anonymous visit statistics
--    No IP address, no cookies, no fingerprint. The session id is a random
--    value kept in the visitor's tab (sessionStorage) and gone when it closes.
-- ---------------------------------------------------------------------
create table if not exists public.page_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  type       text not null check (type in ('page_view', 'film_play', 'reel_open', 'quote_click')),
  path       text not null check (char_length(path) between 1 and 200 and left(path, 1) = '/'),
  film       text check (film is null or film ~ '^[A-Za-z0-9_-]{1,80}$'),
  detail     text check (detail is null or char_length(detail) <= 80),
  referrer   text check (referrer is null or referrer ~ '^[a-z0-9.-]{1,120}$'),  -- the host name only, never the full address
  lang       text check (lang is null or lang in ('en', 'ne')),
  theme      text check (theme is null or theme in ('dark', 'light')),
  screen     text check (screen is null or screen in ('phone', 'tablet', 'desktop')),
  session_id text not null check (session_id ~ '^[a-z0-9]{8,40}$')
);
create index if not exists page_events_created_at_idx on public.page_events (created_at);
create index if not exists page_events_session_idx on public.page_events (session_id, created_at);
alter table public.page_events enable row level security;
revoke all on table public.page_events from anon, authenticated;
grant insert (type, path, film, detail, referrer, lang, theme, screen, session_id) on table public.page_events to anon;
grant select on table public.page_events to authenticated;

drop policy if exists "Visitors can add a visit event" on public.page_events;
create policy "Visitors can add a visit event"
  on public.page_events for insert
  to anon
  with check (true);

drop policy if exists "Admins can read visit events" on public.page_events;
create policy "Admins can read visit events"
  on public.page_events for select
  to authenticated
  using ((select public.is_admin()));

-- Limits: at most 200 events per visit a day, and 1,000 events in any
-- 10 minutes in total, so junk cannot fill the free database quickly.
create or replace function public.page_events_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  if (
    select count(*) from public.page_events e
    where e.session_id = new.session_id and e.created_at > now() - interval '1 day'
  ) >= 200 then
    raise exception 'Too many events from this visit' using errcode = 'P0001';
  end if;
  if (select count(*) from public.page_events e where e.created_at > now() - interval '10 minutes') >= 1000 then
    raise exception 'Too many events right now' using errcode = 'P0001';
  end if;
  -- About once per 500 inserts, drop events older than 12 months, so the
  -- retention promised in the privacy policy holds even if Stats is never opened.
  if random() < 0.002 then
    delete from public.page_events where created_at < now() - interval '12 months';
  end if;
  return new;
end;
$$;
drop trigger if exists page_events_guard on public.page_events;
create trigger page_events_guard
  before insert on public.page_events
  for each row execute function public.page_events_guard();

-- Keeps statistics for 12 months. The admin page calls this each time the
-- Stats tab opens, so no scheduled job is needed.
create or replace function public.prune_page_events()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  delete from public.page_events where created_at < now() - interval '12 months';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.prune_page_events() from public, anon;
grant execute on function public.prune_page_events() to authenticated;

-- Trigger functions are never called directly; nobody needs EXECUTE on them.
revoke all on function public.messages_guard(), public.page_events_guard(), public.site_content_stamp() from public, anon, authenticated;

-- Totals for the admin page's Stats tab, for the last `days` days counted in
-- the time zone `tz` (today included). Admins only.
create or replace function public.admin_stats(days integer default 30, tz text default 'Asia/Kathmandu')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  local_today date;
  first_day   date;
  since       timestamptz;
  result      jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if days is null or days < 1 or days > 366 then
    raise exception 'days must be between 1 and 366' using errcode = '22023';
  end if;
  if tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then
    tz := 'Asia/Kathmandu';
  end if;

  local_today := (now() at time zone tz)::date;
  first_day := local_today - (days - 1);
  since := first_day::timestamp at time zone tz;

  with ev as (
    select * from public.page_events e where e.created_at >= since
  ),
  views as (
    select * from ev where ev.type = 'page_view'
  ),
  firsts as (  -- each visit counted once, by its first page view
    select distinct on (v.session_id) v.lang, v.theme, v.screen
    from views v
    order by v.session_id, v.created_at
  )
  select jsonb_build_object(
    'days', days,
    'tz', tz,
    'from', first_day,
    'to', local_today,
    'page_views', (select count(*) from views),
    'sessions', (select count(distinct ev.session_id) from ev),
    'film_plays', (select count(*) from ev where ev.type = 'film_play'),
    'reel_opens', (select count(*) from ev where ev.type = 'reel_open'),
    'quote_clicks', (select count(*) from ev where ev.type = 'quote_click'),
    'per_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'views', coalesce(c.views, 0), 'sessions', coalesce(c.sessions, 0)) order by d.day), '[]'::jsonb)
      from (select (first_day + g)::date as day from generate_series(0, days - 1) as g) d
      left join (
        select (v.created_at at time zone tz)::date as day, count(*) as views, count(distinct v.session_id) as sessions
        from views v group by 1
      ) c on c.day = d.day
    ),
    'films', (
      select coalesce(jsonb_agg(jsonb_build_object('film', t.film, 'n', t.n) order by t.n desc, t.film), '[]'::jsonb)
      from (select ev.film, count(*) as n from ev where ev.type = 'film_play' and ev.film is not null group by ev.film order by n desc, ev.film limit 12) t
    ),
    'quote_from', (
      select coalesce(jsonb_agg(jsonb_build_object('k', t.k, 'n', t.n) order by t.n desc, t.k), '[]'::jsonb)
      from (select coalesce(ev.detail, '') as k, count(*) as n from ev where ev.type = 'quote_click' group by 1 order by n desc, 1 limit 12) t
    ),
    'referrers', (
      select coalesce(jsonb_agg(jsonb_build_object('k', t.k, 'n', t.n) order by t.n desc, t.k), '[]'::jsonb)
      from (select coalesce(v.referrer, '') as k, count(*) as n from views v group by 1 order by n desc, 1 limit 12) t
    ),
    'pages', (
      select coalesce(jsonb_agg(jsonb_build_object('k', t.k, 'n', t.n) order by t.n desc, t.k), '[]'::jsonb)
      from (select v.path as k, count(*) as n from views v group by 1 order by n desc, 1 limit 12) t
    ),
    'lang', (
      select coalesce(jsonb_agg(jsonb_build_object('k', t.k, 'n', t.n) order by t.n desc, t.k), '[]'::jsonb)
      from (select coalesce(f.lang, '') as k, count(*) as n from firsts f group by 1) t
    ),
    'theme', (
      select coalesce(jsonb_agg(jsonb_build_object('k', t.k, 'n', t.n) order by t.n desc, t.k), '[]'::jsonb)
      from (select coalesce(f.theme, '') as k, count(*) as n from firsts f group by 1) t
    ),
    'screen', (
      select coalesce(jsonb_agg(jsonb_build_object('k', t.k, 'n', t.n) order by t.n desc, t.k), '[]'::jsonb)
      from (select coalesce(f.screen, '') as k, count(*) as n from firsts f group by 1) t
    )
  ) into result;

  return result;
end;
$$;
revoke all on function public.admin_stats(integer, text) from public, anon;
grant execute on function public.admin_stats(integer, text) to authenticated;


-- ---------------------------------------------------------------------
-- 5. The first content: today's js/config.js. Only inserted when the row
--    does not exist yet, so running this file again keeps your edits.
-- ---------------------------------------------------------------------
insert into public.site_content (id, content)
values (1, $seed$
{
  "email": "khulduli5@gmail.com",
  "socials": {
    "facebook": "https://www.facebook.com/khulduli.np",
    "instagram": "https://www.instagram.com/khulduli_/",
    "tiktok": "https://www.tiktok.com/@khulduli.np",
    "youtube": "https://www.youtube.com/@khulduli_np"
  },
  "statsNote": {
    "en": "Figures from platform dashboards, Nov 2026",
    "ne": "तथ्याङ्क प्लेटफर्म ड्यासबोर्डबाट, नोभेम्बर २०२६"
  },
  "headline": {
    "value": 22,
    "suffix": "M+"
  },
  "reach": [
    {
      "key": "tiktok",
      "name": "TikTok",
      "value": 13.1,
      "decimals": 1,
      "suffix": "M",
      "share": 1,
      "en": "15K followers · 832K likes · 179K shares",
      "ne": "15K फलोअर · 832K लाइक · 179K सेयर"
    },
    {
      "key": "instagram",
      "name": "Instagram",
      "value": 4.87,
      "decimals": 2,
      "suffix": "M",
      "share": 0.372,
      "en": "2.1M accounts reached · 772K interactions",
      "ne": "2.1M अकाउन्टसम्म पहुँच · 772K अन्तरक्रिया"
    },
    {
      "key": "facebook",
      "name": "Facebook",
      "value": 4.3,
      "decimals": 1,
      "suffix": "M",
      "share": 0.328,
      "en": "2.3M viewers · 97% non-followers",
      "ne": "2.3M दर्शक · 97% फलो नगर्नेहरू"
    },
    {
      "key": "youtube",
      "name": "YouTube",
      "value": 284,
      "decimals": 0,
      "suffix": "K",
      "share": 0.022,
      "en": "1,873 subscribers · Partner Program member",
      "ne": "1,873 सब्स्क्राइबर · पार्टनर प्रोग्राम सदस्य"
    }
  ],
  "shorts": [
    {
      "id": "bhaitika",
      "title": "भाइटीका",
      "titleEn": "Bhai Tika",
      "en": "The ring of oil",
      "platform": "TikTok + Instagram",
      "result": "4.1M+",
      "unit": {
        "en": "TikTok views",
        "ne": "TikTok भ्युज"
      },
      "extra": "429K likes · 350K+ Instagram views",
      "link": "https://www.tiktok.com/@khulduli.np/video/7705068120838294791",
      "video": "",
      "yt": "",
      "tiktok": "7705068120838294791",
      "poster": "",
      "tone": [
        "#ff7a1a",
        "#5a1206"
      ],
      "lead": true
    },
    {
      "id": "saat-minute",
      "title": "सात मिनेट",
      "titleEn": "Seven Minutes",
      "en": "A short film",
      "platform": "Facebook",
      "result": "1.41M",
      "unit": {
        "en": "views",
        "ne": "भ्युज"
      },
      "extra": "",
      "link": "https://www.facebook.com/khulduli.np",
      "video": "",
      "yt": "",
      "tiktok": "",
      "poster": "",
      "tone": [
        "#3f7cff",
        "#0a1436"
      ]
    },
    {
      "id": "manthan",
      "title": "मन्थन",
      "titleEn": "Manthan",
      "en": "The churning of the ocean",
      "platform": "Facebook",
      "result": "280K",
      "unit": {
        "en": "views",
        "ne": "भ्युज"
      },
      "extra": "",
      "link": "https://www.facebook.com/khulduli.np",
      "video": "",
      "yt": "efWy-iv3lMc",
      "tiktok": "",
      "poster": "",
      "tone": [
        "#19c3a6",
        "#04201f"
      ]
    },
    {
      "id": "indrajatra",
      "title": "इन्द्रजात्रा",
      "titleEn": "Indra Jatra",
      "en": "Why is Indra tied up every year?",
      "platform": "Instagram",
      "result": "146.7K",
      "unit": {
        "en": "views",
        "ne": "भ्युज"
      },
      "extra": "",
      "link": "https://www.instagram.com/khulduli_/",
      "video": "",
      "yt": "FApswtvrHIE",
      "tiktok": "",
      "poster": "",
      "tone": [
        "#e5484d",
        "#2a0508"
      ]
    }
  ],
  "moreReels": [
    {
      "title": "छठ",
      "titleEn": "Chhath",
      "en": "Why is the first offering made to the setting sun?",
      "platform": "TikTok",
      "tiktok": "7707235293102968065",
      "latest": true,
      "link": "https://www.tiktok.com/@khulduli.np/video/7707235293102968065"
    },
    {
      "title": "शेकल्टन इफेक्ट",
      "titleEn": "The Shackleton Effect",
      "en": "Why Dashain no longer feels the same",
      "yt": "RedeIJitdlQ",
      "link": "https://www.youtube.com/shorts/RedeIJitdlQ"
    },
    {
      "title": "फूलपाती",
      "titleEn": "Phulpati",
      "en": "What is inside the palanquin that gets a cannon salute?",
      "yt": "-oUA4C8lpTQ",
      "link": "https://www.youtube.com/shorts/-oUA4C8lpTQ"
    },
    {
      "title": "भँगेरा",
      "titleEn": "The Sparrow",
      "en": "Father asked three times",
      "yt": "hPxqFqyjmRc",
      "link": "https://www.youtube.com/shorts/hPxqFqyjmRc"
    },
    {
      "title": "पर्खाल",
      "titleEn": "The Wall",
      "en": "This Dashain, take one step",
      "yt": "LJlekUMUNXM",
      "link": "https://www.youtube.com/shorts/LJlekUMUNXM"
    },
    {
      "title": "गँगटो मानसिकता",
      "titleEn": "Crab Mentality",
      "en": "Why do we pull each other down?",
      "yt": "ZTaIwb86X4g",
      "link": "https://www.youtube.com/shorts/ZTaIwb86X4g"
    }
  ],
  "longform": [
    {
      "id": "sky-caves",
      "title": "1,500 Year Old Bones With Knife Marks",
      "ne": "मुस्ताङमा हजारौँ मानव हड्डी",
      "tag": {
        "en": "The channel's top video",
        "ne": "च्यानलको सबैभन्दा धेरै हेरिएको भिडियो"
      },
      "meta": "Nepal's Sky Caves · 23:53",
      "coords": "29.18°N 83.96°E · MUSTANG",
      "youtube": "pMsSViqJbnE",
      "link": "https://www.youtube.com/watch?v=pMsSViqJbnE",
      "poster": "https://i.ytimg.com/vi/pMsSViqJbnE/maxresdefault.jpg"
    },
    {
      "id": "yeti",
      "title": "The Hunt for the Yeti",
      "ne": "यतीको टाउकोको छाला साँच्चै के हो?",
      "tag": {
        "en": "Latest documentary",
        "ne": "नयाँ डकुमेन्ट्री"
      },
      "meta": "Himalaya · 18:04",
      "coords": "27.83°N 86.72°E · KHUMBU",
      "youtube": "h9xF1wWUhJw",
      "link": "https://www.youtube.com/watch?v=h9xF1wWUhJw",
      "poster": "https://i.ytimg.com/vi/h9xF1wWUhJw/maxresdefault.jpg"
    }
  ]
}
$seed$::jsonb)
on conflict (id) do nothing;


-- ---------------------------------------------------------------------
-- 6. After running this file: add yourself as the admin (ADMIN.md, step 5).
--    Use the same email as the user you created, in lower case:
--
--    insert into public.admins (email) values ('you@example.com');
-- ---------------------------------------------------------------------
