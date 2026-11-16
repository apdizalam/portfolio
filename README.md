# Abdisalam Mohamed Muhumed — Portfolio

Personal portfolio of a Full-Stack Software Engineer & AI Enthusiast based in Borama, Somaliland.

Plain HTML, CSS and JavaScript, plus three small Vercel serverless functions for the admin page. No build step.

## Structure

- `index.html`, `script.js` – home page (skills and projects are loaded from `data/content.json`)
- `project.html`, `project-page.js` – project page; shows the repo's README live from GitHub
- `admin.html`, `admin.js` – private admin page at `/admin`
- `api/` – `login`, `content`, `publish` serverless functions used by the admin page
- `data/content.json` – the editable list of skills and projects
- `content.js`, `theme.js`, `styles.css`, `github-data.js`, `assets/`

## Admin page setup (one time, in Vercel)

Vercel → Project → Settings → Environment Variables:

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | the password you will use on `/admin` |
| `GITHUB_TOKEN` | a fine-grained GitHub token with access to **only** the `portfolio` repo and **Contents: Read and write** |

Redeploy after adding them. Publishing from `/admin` commits to this repo, and Vercel redeploys the site automatically.

## Contact form

Messages are delivered by [FormSubmit](https://formsubmit.co). The first message triggers an activation email to the inbox; click **Activate** once and later messages arrive normally.
