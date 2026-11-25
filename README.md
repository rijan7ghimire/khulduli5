# खुल्दुली website

One long static page for khuldulinp.com. No build step.

## Preview

```text
python -m http.server 4173 --directory "D:\Company ideas\khulduli"
```

Open <http://127.0.0.1:4173/>. Opening `index.html` directly also works, but the on-page YouTube player needs a real server, so on `file://` the documentaries open on YouTube instead.

## Files

- `index.html`: structure and all copy (English in the tag, Nepali in `data-ne`).
- `css/styles.css`: the look. Mobile first. Colours are tokens at the top (`:root` for dark, `[data-theme="light"]` for light).
- `js/config.js`: **everything that changes by hand**. Email, social links, reach numbers, films, links, posters, and which film is the latest.
- `js/main.js`: rendering, language and theme switches, animation, player, contact form.
- `assets/`: favicon. Put the real logo and final posters here.

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
## The film at the top

The frame in the hero shows the film marked `latest: true` in `js/config.js` (today छठ, in `moreReels`). Move the flag to the new film when one is out. Only one film should have it.

## To finish

1. **Logo.** The nav mark is drawn in CSS from the खु avatar. Replace `.mark` in `index.html` with the real logo file once it is in `assets/`.
2. **Posters.** Short film cards and the hero use a designed fallback poster until a film starts playing. Save final posters to `assets/posters/` and set `poster:` on that film in `js/config.js`. 9:16 for short films, 16:9 for long form.
3. **Links.** भाइटीका points at its TikTok video. सात मिनेट, मन्थन and इन्द्रजात्रा point at the page profile until the exact post links are added in `js/config.js`.
4. **Email.** One value, `email` in `js/config.js`. Change it when the @khuldulinp.com address is live.
5. **Numbers.** `headline` and `reach` in `js/config.js` feed the Views and reach page. Each film's own result (for example `4.1M+`) is on that film in `shorts`.
6. **Nepali copy.** Written for this pass, needs a read by a native editor.

## Type

Two families, set by role. Each one is drawn for Latin and Devanagari together, so English mode and Nepali mode read as the same brand.

| Role | Family | Used for | Licence |
| --- | --- | --- | --- |
| `--display` | **Vesper Libre** by Mota Italic, weights 400, 500, 700, 900 | brand name, hero title, intro line, section headings, film titles, card and service headings, the about lede, numbers, email address, footer | SIL Open Font License 1.1 ([Google Fonts metadata](https://github.com/google/fonts/tree/main/ofl/vesperlibre)) |
| `--text` | **Anek Devanagari** by Ek Type, variable weight 400 to 700 | body text, nav, buttons, form, captions, chips, and all small labels (same face in capitals, spaced) | SIL Open Font License 1.1 ([Google Fonts metadata](https://github.com/google/fonts/tree/main/ofl/anekdevanagari)) |

Both load from Google Fonts in one `<link>` in `index.html`. The OFL allows free commercial use on a website, including self hosting; the main limits are that the font files are not sold on their own, and that a modified copy may need a new name.

- Tokens are at the top of `css/styles.css`: `--display`, `--text`, `--w-title`, `--w-head`, `--w-num`, `--label-track`. The full role map is the "Type system" block at the end of the file.
- Neither family has an italic, so nothing is set in italic.
- Labels in Nepali mode drop the capitals and tracking (Devanagari has no capitals).
- The gradient brand title and the gradient numbers get extra padding inside their own box, because gradient text only paints inside it and the ii matra and ukar reach far outside the line.
- Why these: Instrument Serif, IBM Plex Mono and Mukta were dropped as generic. Eczar was tried first, but its Nepali language setting does not form reph or the क्ष and ज्ञ conjuncts in the browser, and this page marks its Devanagari as Nepali. Kadwa, Sahitya, Amita and Kurale fail the same test. Vesper Libre and Anek Devanagari pass it.
- Weight: about 250 KB for the Devanagari text face and under 50 KB for each other file. Browsers fetch only the script ranges and weights a page actually uses.

## Copy rules kept

No long dashes in on-page text, no line about how the films are made, no software or company names beyond the four platforms. No font or foundry names on the page.
