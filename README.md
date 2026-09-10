# ndpeeps_cs_internships

A personal daily tracker for CS internships pulled from:

- [SimplifyJobs/Summer2027-Internships](https://github.com/SimplifyJobs/Summer2027-Internships)
- [Jose-Gael-Cruz-Lopez/underclassmen-opportunities](https://github.com/Jose-Gael-Cruz-Lopez/underclassmen-opportunities)

Views:

- **By day** — listings grouped by post date and source
- **Big tech** — roles from major tech / trading firms, grouped by company
- **AI roles** — AI / ML / data-focused internships

## Automated daily emails (hands-off)

This is **fully automated**. You do not need to open the site or refresh anything.

GitHub Actions runs twice a day (~**9 AM** and ~**9 PM** Eastern):

1. Pulls the latest listings from SimplifyJobs + Underclassmen Opportunities
2. Builds a digest (underclassmen highlighted + big tech)
3. Emails **inezaodon1@gmail.com** and **oineza@nd.edu**

Manual test (optional):

```bash
gh workflow run "Daily internship digest" --repo inezaodon/ndpeeps_cs_internships
```

Required secret (already set if emails are working): `RESEND_API_KEY`.

## Run the site locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).
