# Instagram performance report — @privateman_of_equity

`equity-ledger.html` is a self-contained content-performance ledger for the
`@privateman_of_equity` account. It ranks posts by a transparent Performance
Index and holds one dossier per post covering angle, spoken hook (first 3–5
seconds), topic, on-screen title hook, and why the post worked.

## Standing of the data

**The file ships with an example data set, not real account figures.** There is
no Instagram/Meta connector attached to the environment this was built in, and
Instagram Insights sits behind a login, so no post-level data could be read.
Every row currently in the file is marked `EX` and is illustrative only.

To make it a real report, paste an Insights export into the intake box in
Article II:

- **Meta Business Suite** → Insights → Content → 12-month range → filter to
  Instagram → *Export data* (CSV), or
- **Instagram app** → Professional dashboard → Insights → Content you shared →
  sort Reels by Views and Posts by Reach, then enter the top rows by hand.

Column names are matched loosely, so most CSV/TSV exports import without
editing.

## Scoring

```
EP     = likes×1 + comments×3 + shares×5 + saves×5 + follows×10
EP/1k  = EP / reach × 1000
Index  = round( (0.65 × EP/1k_scaled + 0.35 × sqrt(reach_scaled)) × 100 )
```

Both components are scaled against the best row in the record, so the index is
always relative to this account rather than to an external benchmark.

## Running it

Open the file in a browser. Published as a claude.ai Artifact it also gets
server-side saving of the breakdown fields, file export, and a per-post
"draft this with Claude" pass; without those it falls back to `localStorage`
and an on-page copy panel, and every other feature works unchanged.
