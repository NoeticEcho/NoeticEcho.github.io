# noeticecho.github.io

The NoeticEcho organisation's page on GitHub Pages: what NoeticEcho is, its open-source
projects, what is coming, and how it works. It is served at https://noeticecho.github.io/.

It is hand-written HTML and CSS with no build step and no framework. `.nojekyll` tells
GitHub Pages to publish the files as they are.

| Path | What |
|---|---|
| `index.html`, `404.html` | The two pages |
| `assets/css/tokens/` | `colors.css`, `typography.css`, `spacing.css` and `base.css`, copied unchanged from the NoeticEcho UI design system |
| `assets/css/fonts.css` | The design system's font faces, cut to the latin subset |
| `assets/css/site.css` | The pages' layout, built only from those tokens. Each project's docs site ships the same file |
| `assets/fonts/` | Literata, IBM Plex Sans and JetBrains Mono (WOFF2), with their licence in `LICENSE.txt` |
| `assets/theme.js` | The Ink / Paper switch |
| `favicon.svg`, `favicon.png`, `apple-touch-icon.png`, `icon-512.png` | The mark, as icons |
| `social/*.svg`, `social/*.png` | 1280×640 social previews for the organisation, control-room and TypedbEx |
| `social/build.mjs` | Writes the icons and the social previews. See the comment at its top |
| `robots.txt`, `sitemap.xml` | For crawlers. The robots file also names the control-room docs' sitemap |

The light theme is the design system's Paper Mode. A reader's choice is kept in
`localStorage` under `noeticecho.theme`, which the project docs sites read too; without a
choice the pages follow the system's colour scheme.

The fonts are under the SIL Open Font License 1.1 (`assets/fonts/LICENSE.txt`).
