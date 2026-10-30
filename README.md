# Projects

Jen's portfolio: https://jkw2lo.github.io/projects/

A static site that reads each project's `overview/overview.json` (the same file the launchpad's About pages use) and lays it out as a home page and one page per project. Nothing to build; GitHub Pages serves this folder as is.

## Curating

Everything is in `site.json`:

- `headline`, `intro`: the top of the home page.
- `featured`: repos shown large, in order, above the grid (up to 4; also the resume's Selected projects). In edit mode the home page has a panel to add, remove and reorder them.
- `projects`: every repo on the site, in grid order, each with a `group` (one of `groups`, which become the filter buttons). Remove a line to hide a project.

A project that doesn't have a Pages site (a Chrome extension, a Mac app, a private repo) gets `"local": "<how it runs>"` in its entry. Its overview, screenshots and `shots.json` then live in this repo under `local/<repo>/`, along with `days.json` (its commit days, for the timeline, taken from the project's own git history). Its page shows the `local` text where the Open button would be.

A project page lives at `#<slug>`, where the slug is the project's name in lowercase with dashes (`#writers-blocks`).

## Timeline

The home page ends with a timeline of when each project was built, from `timeline.json`. It starts simple: one bar per project with a rough start and length ("Mid Sep · about 2 weeks"). **Show each day** switches to a mark for every day with commits. `tools/timeline.mjs` makes that file from each repo's commit history, leaving out commits whose message mentions the overview. The Timeline workflow runs it every morning and commits the result when it changes; run it by hand from the Actions tab, or locally with `node tools/timeline.mjs`.

A project page's "Built Sep – Oct 2026" (or "Since …" while it's still being worked on) comes from the same file.

## Editing the text

Open `#stats` once in a browser and the nav there gains **Views** and **Edit** (visitors never see them). Press **Edit** on any page: a GitHub popup asks for repo access, then every piece of text on the site gets a dashed outline: click it and type. Pending changes stay as you move between pages; **Save** commits them, one commit per repo, to `site.json` or that project's `overview.json` (the resume has its own form, below), so the launchpad's About pages change too. Text that's too long for its spot turns red and blocks saving. The live site catches up a minute or two after saving.

The access lives only in that tab: reload, or press **Done**, and you're out of edit mode. On a local copy, `?edit-preview` shows edit mode without signing in (Save won't work there).

## Resume

`resume.json` becomes the `#resume` page. Fill it in with a form: press **Edit**, open **Resume** (dotted in your nav until a resume exists; visitors don't see the link until then), and add, remove or reorder jobs, points, skills, schools and links. **Preview** shows the page as visitors will see it, and **Save** writes the whole file (the first save creates it). Empty boxes are left out. The file looks like this:

```json
{
  "name": "", "title": "", "location": "",
  "links": [{ "label": "LinkedIn", "url": "https://…" }],
  "summary": "",
  "experience": [{ "role": "", "org": "", "where": "", "start": "2022", "end": "Present", "points": [""] }],
  "education": [{ "school": "", "degree": "", "start": "", "end": "", "note": "" }],
  "skills": [{ "group": "Design", "items": ["", ""] }]
}
```

The **Download PDF** button serves `resume.pdf`, which is the same page printed: the Resume PDF workflow remakes it whenever `resume.json` or the site's code changes (or locally: `node tools/resume-pdf.mjs`), so a save from the form updates the PDF a few minutes later.

## Demo or fresh start

**Open the app** links add `?from=portfolio`. An app that has `demo-welcome.js` then offers a visitor with nothing saved two ways in: **See the demo** (the app filled with sample data, so nothing is locked and there's no setup) or **Start fresh**. While the demo is in use, a small banner offers Start fresh. Anyone arriving another way never sees it.

`tools/demo-welcome.js` is the master copy; each app keeps its own copy and supplies its sample and how to clear it (see the comment at the top of the file). An app can also give a `tour`: a few steps, each going to a screen and lighting up one part with a sentence about it, run right after the demo loads. So far: Nihongo Quest (with a tour), Trip Board and Writers Blocks.

## Views

Visits are counted in Firestore `showcase_visits` (project github-projects-5d4e4): one per browser session for the home page (`pf`) and each project page (`pp-<slug>`). Add `?for=<tag>` to a link you send (letters, digits and dashes, up to 16) and its visits are counted separately as `pf-<tag>`, so you can tell which link was opened. Nothing on the page shows the tag.

The resume counts `rv` (viewed) and `rd` (downloaded), with `-<tag>` for a tagged link.

See the numbers at `#stats` (sign in with the launchpad account): one row per tag with its visits, resume views and downloads. **Make a link to send** at the top of that page turns a company name into the tag and gives a link to the home page and one straight to the resume, ready to copy. Opening `#stats` also marks that browser as yours, so your own visits aren't counted.

## Share image

`og.png` is the preview shown when the link is pasted into LinkedIn, Slack or iMessage. It was made with the launchpad's `tools/shoot.mjs`; redo it after changing the headline.
