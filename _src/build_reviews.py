"""Regenerate the Google-reviews UI from a single source (reviews.json).

- Sliders on the 10 service pages get a curated subset (SLIDER_COUNT) plus a
  "see all" card linking to reviews.html.
- reviews.html gets the full set.

Run from C:\\Users\\bzik2\\makovki.
"""
import glob, json, os

SP = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(SP, "reviews.json"), encoding="utf-8"))
SLIDER_COUNT = 15

G_SVG = ('<svg class="review-card__g" viewBox="0 0 24 24">'
         '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.19 3.32v2.76h3.54c2.08-1.91 3.28-4.73 3.28-8.09z"/>'
         '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.54-2.76c-.98.66-2.23 1.06-3.74 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>'
         '<path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>'
         '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>')


def card(r, indent="          "):
    av = f'<span class="review-av" style="background:{r["color"]};">{r["initial"]}'
    if r.get("img"):
        av += f'<img src="assets/real/reviews/{r["img"]}" alt="{r["name"]}" onerror="this.remove()">'
    av += '</span>'
    stars = int(r.get("stars", 5))
    star_txt = '\u2605' * stars + '<span class="review-stars__off">' + '\u2605' * (5 - stars) + '</span>' if stars < 5 else '\u2605' * 5
    i = indent
    return (
        f'{i}<article class="review-card">\n'
        f'{i}  <div class="review-card__top">\n'
        f'{i}    {av}\n'
        f'{i}    <div class="review-card__who"><b>{r["name"]}</b><span>{r["role"]}</span></div>\n'
        f'{i}    {G_SVG}\n'
        f'{i}  </div>\n'
        f'{i}  <div class="review-stars">{star_txt}</div>\n'
        f'{i}  <p class="review-text">{r["text"]}</p>\n'
        f'{i}</article>\n'
    )


def build_sliders():
    subset = DATA[:SLIDER_COUNT]
    more = ('          <article class="review-card review-card--all">\n'
            f'            <b>{len(DATA)} ביקורות בגוגל</b>\n'
            '            <p>כולן אמיתיות, כולן מלקוחות שעבדו איתנו. אפשר לקרוא את כולן במקום אחד.</p>\n'
            '            <a class="btn btn--primary" href="reviews.html">לכל הביקורות <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 12H5M11 18l-6-6 6-6"/></svg></a>\n'
            '          </article>\n')
    body = '<div class="reviews-track">\n\n' + '\n'.join(card(r) for r in subset) + '\n' + more
    body = body.rstrip('\n')
    changed = []
    for p in sorted(glob.glob('*.html')):
        if p == 'reviews.html':
            continue
        s = open(p, encoding='utf-8').read()
        if '<div class="reviews-track">' not in s:
            continue
        i = s.index('<div class="reviews-track">')
        end = s.index('</article>', s.rindex('<article class="review-card">')) + len('</article>')
        open(p, 'w', encoding='utf-8').write(s[:i] + body + s[end:])
        changed.append(p)
    return changed


def build_reviews_page():
    p = 'reviews.html'
    s = open(p, encoding='utf-8').read()
    start = s.index('<!--REVIEWS_START-->')
    end = s.index('<!--REVIEWS_END-->')
    grid = ('<!--REVIEWS_START-->\n      <div class="rev-wall">\n'
            + '\n'.join(card(r, indent="        ") for r in DATA)
            + '      </div>\n      ')
    open(p, 'w', encoding='utf-8').write(s[:start] + grid + s[end:])


if __name__ == "__main__":
    pages = build_sliders()
    print(f"sliders: {SLIDER_COUNT} reviews + CTA on {len(pages)} pages")
    for x in pages:
        print("  ", x)
    if os.path.exists('reviews.html'):
        build_reviews_page()
        print(f"reviews.html: {len(DATA)} reviews")
