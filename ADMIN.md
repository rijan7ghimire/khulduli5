# Admin dashboard: setup and use

The site has a private dashboard at **https://khuldulinp.com/admin**. It is not linked from any page. From it you can:

- **Content**: change everything the site draws from `js/config.js` (email, social links, the views and reach figures, the short films, the reels and the documentaries) and save it. The site shows the change on the next page load.
- **Messages**: read what people send with the contact form, mark them read or unread, reply by email, delete them.
- **Stats**: page views, visits, films played, quote buttons, where visitors came from, language, theme, phone or desktop, for the last 7, 30 or 90 days.

There is one login (your email and a password). Nobody can register. The password lives in the backend, never in this repository, so it stays private even though the repository is public.

The backend is a free hosted database (Supabase). Until you finish the steps below, the site keeps working exactly as before: content from `js/config.js`, the contact form opens the visitor's email app, and no statistics are recorded.

---

## Setup, once (about 20 minutes)

You need: a computer, your email, and a password you choose for the dashboard (long, at least 16 characters; a password manager helps).

### 1. Create the project

1. Go to <https://supabase.com> and sign up (free plan). Signing in with GitHub is fine.
2. Press **New project**.
3. Name: `khulduli`. Database password: press **Generate a password** and keep it in your password manager. The website never uses it; it is the master key to the database, so do not put it anywhere else.
4. Region: the closest one to Nepal, for example **South Asia (Mumbai)** or **Southeast Asia (Singapore)**.
5. Press **Create new project** and wait a minute or two until it is ready.

### 2. (Nothing to do) Know which key is which

In **Project Settings** you will see several keys. Only two values ever go in this repository:

- the **Project URL** (looks like `https://abcdefghijkl.supabase.co`), and
- the **publishable key** (starts with `sb_publishable_`) or, under *Legacy API keys*, the **anon public** key (a long text starting with `eyJ`). Either one works.

**Never** copy the `service_role` key or a **secret** key (`sb_secret_`) into any file. Those skip every access rule. If one ever ends up in the repository, rotate it at once in Project Settings.

### 3. Create the tables

1. In the left bar, open **SQL Editor**, then **New query**.
2. Open `supabase/schema.sql` from this repository, copy **all** of it, paste it into the editor.
3. Press **Run**. It should end with "Success. No rows returned".

This makes the tables, the access rules, the spam limits, and fills the content with today's `js/config.js`. Running it again later is safe: it never deletes anything and never overwrites content you have edited.

### 4. Switch off sign-ups and add yourself

1. **Authentication** (left bar) → **Sign In / Providers** (on older screens: *Providers* or *Settings*).
2. Turn **Allow new users to sign up** OFF and press **Save**. Leave the **Email** provider on: it is how you sign in.
3. **Authentication** → **Users** → **Add user** → **Create new user**.
4. Type your email and the password you chose. Tick **Auto Confirm User**. Press **Create user**.

You type the password here yourself. Nobody else needs to know it.

### 5. Put your email on the admin list

Back in **SQL Editor** → **New query**, paste this line with your own email, in lower case, and press **Run**:

```sql
insert into public.admins (email) values ('you@example.com');
```

Only accounts on this list can see or change anything, so even if sign-ups were ever switched on again by mistake, a new account would see nothing.

### 6. Connect the website

1. In **Project Settings**, copy the **Project URL** (under *Data API*, or from the **Connect** button at the top) and the **publishable** (or **anon public**) key (under *API Keys*).
2. Open `js/backend.js` and replace the two placeholders near the top:

   ```js
   var SUPABASE_URL = "https://abcdefghijkl.supabase.co";
   var SUPABASE_ANON_KEY = "sb_publishable_...";
   ```

3. Commit and push. GitHub Pages publishes it in a minute or two.

### 7. Check it

1. Open <https://khuldulinp.com/admin>, sign in with your email and password.
2. **Content**: change one small thing (for example the source line under the views), press **Save**, then open the site in a new tab: the change is there.
3. **Messages**: send yourself a test message with the contact form on the site (from another browser or a private window). It appears here.
4. **Stats**: visits from other browsers appear here. Your own visits are not counted while you are signed in on that browser, and browsers that ask not to be tracked are never counted.

---

## Everyday use

- **Save** writes to the site at once. **Preview** opens the site in a new tab with your unsaved changes (only in your browser), so you can look before saving. **Discard** throws away unsaved changes.
- Unsaved changes are kept in your browser. If you close the tab by mistake, the dashboard offers them back next time.
- If the content was saved somewhere else (another device) after you opened it, your save stops with a message instead of overwriting it.
- Every text field follows the site rules. A long dash (— or –) stops the save; Nepali script in an English field, a line about AI, or a price shows a warning.
- **Film ids** are filled in for you. Keep them once set: the stats count films by id.
- **The latest film** (the one in the frame at the top) is the round button inside each film.
- Pasting a full YouTube or TikTok link into an id field keeps only the id.

## Change the password

Supabase does not show passwords, and the dashboard here has no "forgot password" link on purpose (it would let strangers send emails to you). To change it:

- **Simplest:** Authentication → Users → your user → **Delete user**, then **Add user** again with the same email and the new password, ticking **Auto Confirm User**. The admin list goes by email, so nothing else changes.
- **Or in SQL Editor** (replace both values):

  ```sql
  update auth.users set encrypted_password = extensions.crypt('the new password', extensions.gen_salt('bf'))
  where email = 'you@example.com';
  ```

  Then clear that query from the editor so the password is not left there.

To add a second admin later: add the user (step 4.3) and insert the email (step 5). To remove one: `delete from public.admins where email = '...';` and delete the user.

## How long things are kept

Set in the privacy policy, section 08, and you can change it there:

- **Messages** stay until you delete them. Delete each one once the conversation and any work from it is done.
- **Visit events** are deleted after 12 months, automatically, each time you open the Stats tab.

If someone asks for their message to be deleted, find it in Messages and press Delete.

## When something goes wrong

- **The site still shows old content**: visitors get the new content on their next page load. One visitor who already had the page open sees it the time after.
- **The dashboard says the backend is not set up**: `js/backend.js` still has the placeholders, or the deploy has not finished.
- **"Wrong email or password"**: check the email is the one in Authentication → Users. After many wrong tries, the backend blocks attempts for a while.
- **"Not on the admin list"**: run step 5 with exactly that email, in lower case.
- **The free project is paused** (Supabase pauses free projects that go unused for about a week; daily visits usually keep it awake): the site keeps working from `js/config.js` and the form opens the email app. Open the project in the Supabase dashboard and press **Restore**.
- **Spam in Messages**: delete it. The limits stop floods (3 messages per visit per hour, 30 an hour in total), but single spam messages can still get through.

## What is protected, and what is not

- **The password and the admin data** are protected by the backend: only a signed in account whose email is on the admin list can read messages and stats or change content. The key in `js/backend.js` is public on purpose and can only do what the rules in `schema.sql` allow: read the content, add a message, add a visit event.
- **Anyone can send a message or add visit events** through that key, the same as through the form. The limits (length checks, a hidden field bots fill in, per visit and per hour caps) keep it small, but a determined person can still send some spam or nudge the stats. The caps also mean that during a flood the form falls back to the visitor's email app.
- **The visit statistics are approximate**: no cookies and no IP addresses means a person on two devices, or who closes and reopens the tab, counts as two visits; browsers that ask not to be tracked are not counted.
- **Sign-in stays on the device** until you press Sign out (the session renews itself). Sign out on any computer that is not yours.
- `robots.txt` asks search engines to stay away from `/admin`, and the page itself says `noindex`. Anyone who types the address sees only the sign in form.

---

## For developers

- **Files:** `admin/index.html`, `admin/admin.js`, `admin/admin.css` (the dashboard), `js/backend.js` (the URL and key, plus the helpers the public pages share: content fetch and checks, the contact form, visit events), `supabase/schema.sql` (tables, rules, functions, seed).
- **No libraries:** the dashboard talks to the backend with plain `fetch` calls (`/auth/v1/token`, `/rest/v1/...`). The session is kept in `localStorage` under `khulduli-admin-session` and refreshed a minute before it expires, like the official client does by default.
- **Content safety:** the public pages run every value from the database through `sanitize()` in `js/backend.js` (https links only, ids checked, colours checked, lengths capped); anything not valid falls back to `js/config.js`. The dashboard runs the same checks before saving, plus the site rules.
- **Once the backend is set, the database copy wins** for everything the dashboard edits. `js/config.js` stays as the fallback for when the backend cannot be reached. Hand edits to `js/config.js` no longer show while the backend is up; make them in the dashboard instead.
- **Content Security Policy:** `admin/index.html` allows only its own files, plus the backend at `https://*.supabase.co`. If the one-line theme script in its `<head>` changes, update the `sha256-...` hash in the policy (`node -e` with `crypto.createHash("sha256")` over the script text, base64). A custom backend domain also needs adding to `connect-src`.
- **The seed** in `schema.sql` is `js/config.js` as of 27 November 2026, as JSON. It is only inserted when the content row does not exist yet.
