# Projects

Jen's portfolio: https://jkw2lo.github.io/projects/

A static site that reads each project's `overview/overview.json` (the same file the launchpad's About pages use) and lays it out as a home page and one page per project. Nothing to build; GitHub Pages serves this folder as is.

## Curating

Everything is in `site.json`:

- `headline`, `intro`: the top of the home page.
- `featured`: repos shown large, in order, above the grid.
- `projects`: every repo on the site, in grid order, each with a `group` (one of `groups`, which become the filter buttons). Remove a line to hide a project.

A project page lives at `#<slug>`, where the slug is the project's name in lowercase with dashes (`#writers-blocks`).

## Timeline

The home page ends with a timeline of when each project was built, from `timeline.json`. It starts simple: one bar per project with a rough start and length ("Mid Sep · about 2 weeks"). **Show each day** switches to a mark for every day with commits. `tools/timeline.mjs` makes that file from each repo's commit history, leaving out commits whose message mentions the overview. The Timeline workflow runs it every morning and commits the result when it changes; run it by hand from the Actions tab, or locally with `node tools/timeline.mjs`.

A project page's "Built Sep – Oct 2026" (or "Since …" while it's still being worked on) comes from the same file.

## Editing the text

Open `#stats` once in a browser and the nav there gains **Views** and **Edit** (visitors never see them). Press **Edit** on any page: a GitHub popup asks for repo access, then every piece of text on the site gets a dashed outline: click it and type. Pending changes stay as you move between pages; **Save** commits them, one commit per repo, to `site.json` or that project's `overview.json`, so the launchpad's About pages change too. Text that's too long for its spot turns red and blocks saving. The live site catches up a minute or two after saving.

The access lives only in that tab: reload, or press **Done**, and you're out of edit mode. On a local copy, `?edit-preview` shows edit mode without signing in (Save won't work there).

## Resume

`resume.json` becomes the `#resume` page, and a Resume link appears in the nav once the file exists:

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

The **Download PDF** button serves `resume.pdf`, which is the same page printed: the Resume PDF workflow remakes it whenever `resume.json` or the site's code changes (or locally: `node tools/resume-pdf.mjs`). Text edits made in edit mode land in `resume.json` too, so the PDF follows.

## Views

Visits are counted in Firestore `showcase_visits` (project github-projects-5d4e4): one per browser session for the home page (`pf`) and each project page (`pp-<slug>`). Add `?for=<tag>` to a link you send (letters, digits and dashes, up to 16) and its visits are counted separately as `pf-<tag>`, so you can tell which link was opened. Nothing on the page shows the tag.

The resume counts `rv` (viewed) and `rd` (downloaded), with `-<tag>` for a tagged link.

See the numbers at `#stats` (sign in with the launchpad account). Opening `#stats` also marks that browser as yours, so your own visits aren't counted.

## Share image

`og.png` is the preview shown when the link is pasted into LinkedIn, Slack or iMessage. It was made with the launchpad's `tools/shoot.mjs`; redo it after changing the headline.
