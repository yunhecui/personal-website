# Personal Website

Yunhe Cui's personal website — a static multi-page site with a canvas-based forest & mist hero animation.

**Live site:** https://yunhecui.github.io/personal-website/

## Pages

- `index.html` — Landing page with the animated forest+mist hero
- `experience.html` — Professional experience
- `academic.html` — Education, research interests, and publications
- `project.html` — Selected projects
- `other.html` — Skills and contact

## Structure

- `style.css` — Shared styles for all pages
- `forest.js` — Canvas animation for the landing page hero
- `reveal.js` — Scroll-triggered fade-in for content sections

## Local preview

This is a static site with no build step. Serve it with any static file server, e.g.:

```
python -m http.server 8123
```

Then open `http://localhost:8123`.
