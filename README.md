# Remy Agent — website

Static multi-page site for Remy Agent, the web-based AI voice agent.

Pages: / (home) · /about/ · /terms/ · /privacy/ · 404

Everything is local — no CDN, no remote fonts, no image or video files.
The robot, the gradient face ring and the glowing face are drawn in code.

## Structure

index.html                  homepage (loads the 3D scene)
about/index.html            about page
terms/index.html            terms of service
privacy/index.html          privacy policy
404.html                    not-found page
assets/css/site.css         shared stylesheet
assets/js/remy.bundle.js    three.js + the scene (homepage only)
assets/js/app.js            readable scene source
assets/vendor/              three.js r160 + addons (MIT)
assets/fonts/               IBM Plex Mono 300/400/500 + Schibsted Grotesk
og-image.png                1200x630 social preview
favicon.svg
robots.txt  sitemap.xml  .nojekyll

## Deploy on GitHub Pages

1. Create a repository.
2. Upload the CONTENTS of this folder so index.html sits at the root.
3. Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save.
4. For the canonical domain, add remyagent.cc under Pages → Custom domain
   (this creates the CNAME file), then point DNS at GitHub Pages.

All internal links are relative, so the site also works from a project page
(/repo/) before the domain is connected.

## Local preview

Double-click index.html — the homepage runs from disk (the 3D engine is a
classic script; browsers block local ES-module imports on file://).

## Rebuilding the bundle

    npx esbuild assets/js/app.js --bundle --format=iife --minify --target=es2019         --outfile=assets/js/remy.bundle.js

## Notes

- Terms and Privacy are plain-language drafts — have them reviewed before relying on them.
- Canonical URLs point at https://remyagent.cc/ (update base URLs if the domain changes).
- three.js is MIT — see assets/vendor/LICENSE-three.txt.
