# ndpeeps_cs_internships

A personal daily tracker for CS internships pulled from:

- [SimplifyJobs/Summer2027-Internships](https://github.com/SimplifyJobs/Summer2027-Internships)
- [Jose-Gael-Cruz-Lopez/underclassmen-opportunities](https://github.com/Jose-Gael-Cruz-Lopez/underclassmen-opportunities)

Views:

- **By day** — listings grouped by post date and source
- **Big tech** — roles from major tech / trading firms, grouped by company
- **AI roles** — AI / ML / data-focused internships

## Daily email (big tech)

Every morning (~9 AM ET), GitHub Actions emails **inezaodon1@gmail.com** and **oineza@nd.edu** a digest with:

1. **Underclassmen opportunities** posted that day (highlighted)
2. **Big tech** roles posted that day

On the site, underclassmen rows are sorted to the top of each day and highlighted in blue.

### One-time setup (required)

1. Create a free [Resend](https://resend.com) account and API key.
2. Add the key as a repo secret named `RESEND_API_KEY`:
   ```bash
   gh secret set RESEND_API_KEY --repo inezaodon/ndpeeps_cs_internships
   ```
3. (Optional) After verifying a domain in Resend, set `EMAIL_FROM` to something like `Internships <alerts@yourdomain.com>`. Until then, Resend’s test sender works for delivery to your own inbox.
4. Trigger a test run:
   ```bash
   gh workflow run "Daily big tech email" --repo inezaodon/ndpeeps_cs_internships
   ```

Dry-run locally (no email sent):

```bash
npm run email:digest:dry
```

## Run the site

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).
