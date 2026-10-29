# Projects

Jen's portfolio: https://jkw2lo.github.io/projects/

A static site that reads each project's `overview/overview.json` (the same file the launchpad's About pages use) and lays it out as a home page and one page per project. Nothing to build; GitHub Pages serves this folder as is.

## Curating

Everything is in `site.json`:

- `headline`, `intro`: the top of the home page.
- `featured`: repos shown large, in order, above the grid.
- `projects`: every repo on the site, in grid order, each with a `group` (one of `groups`, which become the filter buttons). Remove a line to hide a project.

A project page lives at `#<slug>`, where the slug is the project's name in lowercase with dashes (`#writers-blocks`).

## Views

Visits are counted in Firestore `showcase_visits` (project github-projects-5d4e4): one per browser session for the home page (`pf`) and each project page (`pp-<slug>`). Add `?for=<tag>` to a link you send (letters, digits and dashes, up to 16) and its visits are counted separately as `pf-<tag>`, so you can tell which link was opened. Nothing on the page shows the tag.

See the numbers at `#stats` (sign in with the launchpad account). Opening `#stats` also marks that browser as yours, so your own visits aren't counted.

## Share image

`og.png` is the preview shown when the link is pasted into LinkedIn, Slack or iMessage. It was made with the launchpad's `tools/shoot.mjs`; redo it after changing the headline.
