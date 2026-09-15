# BTMEDYA V11 Live Structure

## Production target
- Domain: https://btmedya.com.tr/
- Admin: https://btmedya.com.tr/admin/
- Production source: `main`

## Page flow
1. Hero: cinematic video, headline, portfolio CTA
2. Kimiz?: journalism + creative studio positioning
3. Üretim: news/interview, production, brand communication, AI LAB
4. Gerçek İşler: live media from `/api/public/media`
5. Newsroom: live news from `/api/news`
6. Siyah Oda: podcast/interview format
7. AI LAB: explicitly labelled `AI GENERATED / EXPERIMENTAL`
8. Kurucu: existing BTMEDYA founder/profile asset
9. Başlayalım: project CTA
10. Footer: brand, disciplines, admin

## Media policy
Real portfolio media is primary. AI-generated material is isolated and clearly labelled in AI LAB.

## Responsive behavior
Desktop and mobile layouts are included. Reduced-motion mode disables the hero video and uses the poster image.

## Data architecture
The V11 page keeps the existing R2/D1/API architecture. Portfolio and newsroom are loaded from the existing public API routes, while administration remains at `/admin/`.

## Deployment note
V11 is being promoted from the staging branch `v11-award-experience` into `main` for live deployment. Cloudflare deployment must complete after the GitHub production update before the new homepage is considered live.
