# Deploying Office Utilities

The app is a static site — 23 MB, 560 files, no backend, no Node runtime. Any static host can serve it. This guide covers the recommended path and the alternatives.

## Recommended: Cloudflare Pages

Chosen because it has **unlimited bandwidth** on the free tier (this app ships ~2.5 MB to a visitor who opens the PDF tools), supports **unlimited custom domains** per project, and natively reads the `_headers` and `_redirects` files already in `public/`.

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Office Utilities"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Create the Pages project

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Pick the repository, then set:

| Setting | Value |
|---|---|
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `dist/office-utility/browser` |
| Node version | `20` or later (set `NODE_VERSION` env var if the default is older) |

3. Add an environment variable **before** the first build:

| Name | Value |
|---|---|
| `OU_SITE_ORIGIN` | `https://your-primary-domain.com` |

This one variable drives `sitemap.xml`, `robots.txt`, canonical tags, Open Graph URLs and JSON-LD. Set it to the domain you want search engines to index.

4. **Save and Deploy.** First build takes ~3–5 minutes.

### 3. Add your domains

In the project → **Custom domains** → **Set up a domain**. Add each one:

- `your-primary-domain.com`
- `www.your-primary-domain.com`
- `your-alternate-domain.com`

If the domain's nameservers are already on Cloudflare, DNS records are created automatically and SSL is issued in a minute or two. If the domain is registered elsewhere, Cloudflare shows you the exact `CNAME` to add at your registrar.

### 4. Point the alternates at the primary

All the domains now serve the same content, which search engines treat as duplicates. Fix it by editing `public/_redirects` and uncommenting the canonical block:

```
https://your-alternate-domain.com/*       https://your-primary-domain.com/:splat   301!
https://www.your-primary-domain.com/*     https://your-primary-domain.com/:splat   301!

/*    /index.html    200
```

The `!` forces the redirect even when a matching file exists. Keep the SPA fallback last — rules match top to bottom. Commit and push; Cloudflare redeploys automatically.

### 5. Verify

```bash
curl -sI https://your-alternate-domain.com/pdf/merge-pdf | head -3   # expect 301
curl -s  https://your-primary-domain.com/sitemap.xml | grep -c "<loc>"  # expect 106
```

Then confirm the privacy claim holds in production: open devtools → Network, use a tool, and check that no request carries your file.

---

## Alternative: Netlify

Equivalent developer experience, but bandwidth is capped at 100 GB/month on the free tier.

- Build command `npm run build`, publish directory `dist/office-utility/browser`
- Add `OU_SITE_ORIGIN` under **Site settings → Environment variables**
- **Domain management → Add domain alias** for the second domain
- The same `_headers` and `_redirects` files work unchanged

## Alternative: Vercel

Works, but the Hobby (free) plan **prohibits commercial use**, so it's only appropriate if this stays a personal or open-source project. It also ignores `_headers`/`_redirects` — you'd need a `vercel.json` instead.

## Not suitable: GitHub Pages

Free and reliable, but it supports **only one custom domain per repository** (the `CNAME` file holds a single value), so it can't serve your alternate domain. It also ignores `_headers`, meaning no cache-control or security headers.

If you only ever need one domain, it does work:

```bash
OU_SITE_ORIGIN="https://your-domain.com" npm run build
# publish dist/office-utility/browser to the gh-pages branch
```

`.nojekyll` and `404.html` are already generated for it.

---

## Self-hosting (nginx)

```nginx
server {
  root /var/www/office-utilities;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|mjs|css|woff2|png|svg|webp|wasm)$ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # The service worker must never be cached or updates stall for a week.
  location = /ngsw-worker.js {
    add_header Cache-Control "no-cache, must-revalidate";
  }
}
```

## Rebuilding for a different domain

`OU_SITE_ORIGIN` is baked in at build time, so changing domains means rebuilding:

```bash
OU_SITE_ORIGIN="https://new-domain.com" npm run build
```
