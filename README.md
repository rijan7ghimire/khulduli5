# खुल्दुली website

One long static page for khuldulinp.com. No build step.

## Preview

```text
python -m http.server 4173 --directory "D:\Company ideas\khulduli"
```

Open <http://127.0.0.1:4173/>. Opening `index.html` directly also works, but the on-page YouTube player needs a real server, so on `file://` the documentaries open on YouTube instead.

## Files

- `index.html`: structure and all copy (English in the tag, Nepali in `data-ne`).
- `privacy.html`, `terms.html`: privacy policy and terms of use, same look, same switches, English and Nepali.
- `404.html`: the page the host shows for any address that does not exist. Every path in it starts at the site root (`/css/...`), because it is served at whatever address was asked for.
- `css/styles.css`: the look, for every page. Mobile first. Colours are tokens at the top (`:root` for dark, `[data-theme="light"]` for light). The `@font-face` rules are the first block.
- `js/config.js`: **everything that changes by hand**. Email, social links, reach numbers, films, links, posters, and which film is the latest. Once the backend is set up (see Admin below), the dashboard edits a copy of this in the database and that copy wins; this file stays as the fallback.
- `js/backend.js`: the backend's address and public key (placeholders until set up), and what every page shares with it: fetching the current content, sending the contact form, anonymous visit events.
- `js/main.js`: the home page: rendering, language and theme switches, animation, player, contact form.
- `js/page.js`: the plain pages (privacy, terms, 404): language and theme switches with the same saved choices as the home page, and the email from `js/config.js` (or the backend's copy).
- `admin/`: the private dashboard at `/admin` (content, messages, stats). Not linked anywhere. See `ADMIN.md`.
- `supabase/schema.sql`: the database tables and access rules, pasted once into the backend. See `ADMIN.md`.
- `assets/`: favicon, `og-image.png` (the 1200x630 picture shown when the site is shared), and `fonts/`. Put the real logo and final posters here.
- `robots.txt`, `sitemap.xml`: for search engines, for https://khuldulinp.com/. Add a line to the sitemap when a page is added. `/admin` is kept out of both on purpose. There is no `CNAME` file on purpose: the domain is set in the hosting settings.

## The page as one scroll

The page has no hard edges between sections. Every section sits on the same page colour, and any glow or tint (the hero light, the cold tint behind the documentaries, the contact glow) fades out before it reaches a section edge. Keep it that way when adding a section: no section background colour, no border lines between sections.

## Diyo intro

The page opens on an unlit diyo. Scrolling lights it: the flame grows, a soft light spreads, then the line "Every story begins with a question." appears, and the intro hands over to the hero.

- The diyo is one inline SVG drawing (`.diyo` in `index.html`), used twice: in the intro and, small, in the hero backdrop on wide screens. Its shared gradients live in the hidden `<svg class="defs">` at the top of `<body>`.
- `js/main.js` (`scrubTick`) sets `--L` (0 unlit, 1 lit) and `--C` (what the light reveals) on `#intro` while it scrolls. The CSS uses them for the flame size, the warm light on the clay, the soft light behind it and the line of text. The nav also fades in with `--L`.
- With reduced motion turned on, the intro is a single screen with the diyo already lit.

## Light and dark theme

Dark is the default. The round button left of EN / NE switches to the light theme and back. The choice is saved in the browser (`localStorage`, key `khulduli-theme`), and a small script in `<head>` applies it before the styles load, so the page never flashes the wrong theme. Reel mode and the full screen player stay dark in both themes, like a cinema.

## Reel mode (films play on the page)

Tapping a short film card, the hero poster, or "Watch in reel mode" opens a phone style viewer. Scroll, swipe or use the arrow keys to move between reels, tap for sound, Esc to close.

Each film in `js/config.js` (`shorts` and `moreReels`) plays from the first of these that is set:

- `video: "assets/reels/name.mp4"` your own file. Cleanest result: no platform frame and no platform labels.
- `yt: "id"` a YouTube Short, through the YouTube player.
- `tiktok: "id"` through the TikTok player.

A film with none of them opens its `link` in a new tab (सात मिनेट today). Keep MP4s small: 720x1280, H.264, about 2 to 4 MB each.

Films also play by themselves, silently, as soon as they scroll into view: the hero, each reel card (a looping preview), and the two documentaries inside their own frames. A documentary only leaves its frame when "Full screen" is pressed, which also turns the sound on.

## Page order

Intro (the diyo), the landing (brand name, one line, two buttons, the latest film), then 01 Views and reach, 02 Short films, 03 Long form, 04 About, 05 Services, 06 Contact. The nav links follow the same order.

## Views and reach

A full screen straight after the landing, where the numbers are the page: the total views very large, then the four platforms as large figures, with their details, a share bar and the source line set small underneath. The figures, decimals and the source line all come from `headline`, `reach` and `statsNote` in `js/config.js`.

The motion is one quiet entrance, the first time the page scrolls into view: each figure rises a few pixels, fades in and counts up from zero to its exact value, one platform a beat after the other (`data-delay` on each figure, `countUp` in `js/main.js`). Nothing loops. With reduced motion turned on, the final figures show at once. Switching language redraws the platform figures and counts them again.

## Buttons

One system on every page (the "Buttons" block near the end of `css/styles.css`):

- Actions are pills with **no outline**. Their shape is a soft tonal fill (`--tone`, stronger `--tone-hi` on hover), which reads in both themes. The main action on a screen is the ember fill (`.btn-fill`). In the documentaries the same pills use the cold palette.
- Icon only controls (theme, reel mode, player close) are circles with the same fill. Over films they use a darker fill instead of a hairline.
- Keyboard focus is one ember ring, 3px outside the shape, following the pill or circle.
- The small nav controls and the Copy button keep a 44px tall touch area with an invisible margin, so the nav row still fits a 390px phone.
- Icons inside buttons are drawn SVG (play, arrows, close, "opens elsewhere"), never font glyphs.

Why labels looked off centre before, and the fix: the text face (Anek Devanagari) has a very deep descender, kept for Devanagari marks below the line. A browser centres the font's ascender to descender box in the line box, so the middle of every line sat only 0.16em above the baseline, while the middle of a capital, and of the Devanagari headline (both about 0.64em tall), is 0.32em above it. Every label therefore sat about 0.16em high: 2.5px in a 16px button, 2.1px in the 13px language switch. Arrows and the close cross also came from fallback fonts with their own heights. The ascender and descender in the self-hosted files were rebalanced to keep the same total but put the line's middle at half the cap height (see Type), so labels centre in every browser, Safari included, without nudges. Measured after the change, at 1440 and 390 wide, both themes, English and Nepali: the middle of the capitals or the Devanagari headline is within 1px of the middle of every button (0.5px for 48px buttons, 1px for the 40px nav button), icons are exactly centred, and the content is horizontally centred to 0.2px.

## Admin, contact form and visit statistics

A private dashboard at `/admin` edits the content, shows contact form messages and shows visit statistics. It needs a free hosted backend; **`ADMIN.md` is the step by step setup** (create the project, run `supabase/schema.sql`, switch off sign-ups, add yourself, put the URL and public key in `js/backend.js`).

How the public pages behave:

- **Backend not set up** (placeholders in `js/backend.js`): exactly as before. Content from `js/config.js`, the form opens the visitor's email app, no statistics.
- **Backend set up:** the page is drawn at once from `js/config.js`, or from the copy fetched on the visitor's previous page view (kept in `localStorage`, `khulduli-content`). The current copy is fetched in the background (2.5 second limit). It is swapped in only while nothing drawn from it is on screen, that is while the visitor is still on the diyo intro, so nothing visibly changes or jumps; if it arrives later it is kept for the next page view. Slow, down or broken: the page stays as drawn. Every value from the database is checked (`sanitize` in `js/backend.js`); anything not valid falls back to `js/config.js`.
- **Contact form:** sends the message to the database and says so (English and Nepali). If that fails, it says so and opens the email app as before. A hidden field catches bots; a filled one skips the database and opens the email app.
- **Visit statistics:** page views, films played or opened, reel mode opened, quote buttons pressed. Each event holds the page path, the film, which button, the referring site's name only, language, theme, a phone/tablet/desktop bucket, and a random per-tab id kept in `sessionStorage` (`khulduli-sid`). No IP address, no cookies, no fingerprinting. Nothing is sent when the browser sends Do Not Track or Global Privacy Control, in the admin preview, or while the owner is signed in to the dashboard in that browser. Events are sent in the background and never hold up the page.

## Privacy, terms and the other pages

- `privacy.html` and `terms.html` are linked from the footer of every page. The privacy policy is dated 27 November 2026, the terms 26 November 2026; change the date at the top of the page and in `sitemap.xml` when the text changes.
- The privacy policy describes what the code does: contact form messages are stored in a hosted database so we can reply (or, when it cannot be reached, the form opens the visitor's email app), anonymous visit events as listed above, theme and language in `localStorage` (`khulduli-theme`, `khulduli-lang`) with a copy of the site's own text, the visit id in `sessionStorage`, films load YouTube (privacy enhanced mode) and TikTok players when they scroll into view, in reel mode or on Full screen, some posters load from YouTube's image server, the host and the database service keep standard server logs, and there are no cookies of our own, ads, visitor accounts or payments. Retention: messages until handled, visit events 12 months. The database service is not named on the page (site rule). **If any of that changes (a new tool, a new embed, a new field), the policy must change with it.**
- No cookie banner: the site sets no cookies, and stores only the choices and the content copy above on the visitor's device. The embedded players may set their own cookies once they load. Nepal's law has no cookie consent rule; a banner would be worth adding only if the site starts to target visitors in the EU or the UK.
- The home page has a description, a canonical link, Open Graph and Twitter card tags, with `assets/og-image.png` (drawn from the site's own diyo and type) as the share picture.

## The film at the top

The frame in the hero shows the film marked `latest: true` in `js/config.js` (today छठ, in `moreReels`). Move the flag to the new film when one is out. Only one film should have it.

## To finish

1. **Logo.** The nav mark is drawn in CSS from the खु avatar. Replace `.mark` in `index.html` with the real logo file once it is in `assets/`.
2. **Posters.** Short film cards and the hero use a designed fallback poster until a film starts playing. Save final posters to `assets/posters/` and set `poster:` on that film in `js/config.js`. 9:16 for short films, 16:9 for long form.
3. **Links.** भाइटीका points at its TikTok video. सात मिनेट, मन्थन and इन्द्रजात्रा point at the page profile until the exact post links are added in `js/config.js`.
4. **Email.** One value, `email` in `js/config.js` (or in the dashboard once the backend is set up). Change it when the @khuldulinp.com address is live.
5. **Numbers.** `headline` and `reach` in `js/config.js` feed the Views and reach page. Each film's own result (for example `4.1M+`) is on that film in `shorts`.
6. **Nepali copy.** Written for this pass, needs a read by a native editor.
7. **Backend.** Follow `ADMIN.md` to switch on the dashboard, the contact form's direct sending and the visit statistics.
8. **Privacy policy and terms.** Drafts in plain language, written from what the code does. They need a read by a lawyer in Nepal before launch, in both languages (the Nepali is our own rendering, and the names of the Acts in it, वैयक्तिक गोपनीयतासम्बन्धी ऐन, २०७५ and प्रतिलिपि अधिकार ऐन, २०५९, should be checked against the official titles). Points to confirm: the contact email (still the gmail address from `js/config.js`), whether a registered business name or address must be shown, the retention periods in section 08, and that storing messages with a hosted database outside Nepal is fine.

## Type

Two families, set by role. Each one is drawn for Latin and Devanagari together, so English mode and Nepali mode read as the same brand.

| Role | Family | Used for | Licence |
| --- | --- | --- | --- |
| `--display` | **Vesper Libre** by Mota Italic, weights 400, 500, 700, 900 | brand name, hero title, intro line, section headings, film titles, card and service headings, the about lede, numbers, email address, footer | SIL Open Font License 1.1 ([Google Fonts metadata](https://github.com/google/fonts/tree/main/ofl/vesperlibre)) |
| `--text` | **Anek Devanagari** by Ek Type, variable weight 400 to 700 | body text, nav, buttons, form, captions, chips, and all small labels (same face in capitals, spaced) | SIL Open Font License 1.1 ([Google Fonts metadata](https://github.com/google/fonts/tree/main/ofl/anekdevanagari)) |

Both are self-hosted in `assets/fonts/` (no font service is contacted), with the `@font-face` rules at the top of `css/styles.css` and `font-display: swap`. Only the Latin and Devanagari subsets are there, as woff2: Anek Devanagari as one variable file per script, Vesper Libre at 400, 500 and 700 for both scripts and 900 for Devanagari only (900 sets only the Devanagari brand name). The browser downloads a file only when a page uses that script and weight. Each page preloads the Latin text file; the home page also preloads the 900 Devanagari file for the brand name. The licence texts are `assets/fonts/OFL-AnekDevanagari.txt` and `OFL-VesperLibre.txt`, and must stay next to the files. The OFL allows free commercial use on a website, including self hosting and modified copies; the limits are that the font files are not sold on their own and stay under the OFL. Neither family declares a Reserved Font Name, so the modified Anek files keep their name.

**The Anek Devanagari files are modified** (see Buttons below): in both files the ascender and descender in `hhea` and `OS/2` (typo and win) were changed from 2026 / 1385 to 2345 / 1066 units (2000 units per em). Nothing else changed: same total height, same glyphs. If the files are ever downloaded again, apply the same change (fontTools: set `hhea.ascent`, `OS/2.sTypoAscender`, `OS/2.usWinAscent` to 2345, the descenders to 1066, save as woff2), or every button label will sit high again.

- Tokens are at the top of `css/styles.css`: `--display`, `--text`, `--w-title`, `--w-head`, `--w-num`, `--label-track`. The full role map is the "Type system" block at the end of the file.
- Neither family has an italic, so nothing is set in italic.
- Labels in Nepali mode drop the capitals and tracking (Devanagari has no capitals).
- The gradient brand title and the gradient numbers get extra padding inside their own box, because gradient text only paints inside it and the ii matra and ukar reach far outside the line.
- Why these: Instrument Serif, IBM Plex Mono and Mukta were dropped as generic. Eczar was tried first, but its Nepali language setting does not form reph or the क्ष and ज्ञ conjuncts in the browser, and this page marks its Devanagari as Nepali. Kadwa, Sahitya, Amita and Kurale fail the same test. Vesper Libre and Anek Devanagari pass it.
- Weight: about 250 KB for the Devanagari text face and under 50 KB for each other file. Browsers fetch only the script ranges and weights a page actually uses.

## Copy rules kept

No long dashes in on-page text, no line about how the films are made, no software or company names beyond the four platforms. No font or foundry names on the page.
