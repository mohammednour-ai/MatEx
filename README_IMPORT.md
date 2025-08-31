Import tasks into GitHub (Issues & Projects)

This repo includes helpers to import the `matex_full_task_list.csv` roadmap into GitHub Issues and then arrange them in a Project.

Quick options:

1) Run the GitHub Action from the repository UI
   - Go to Actions -> Import MatEx tasks as Issues -> Run workflow
   - The workflow will create one issue per CSV row.

2) Run locally (PowerShell)
   - Create a personal access token with repo scope and set it as env var:
     $env:GITHUB_TOKEN = '<token>'
   - Run:
     .\scripts\import_tasks.ps1 -Owner "<owner>" -Repo "<repo>"

After issues are created:

Branding & Logo
The repository includes `matex_logo.png` at the project root. See `docs/LOGO.md` for usage guidance and `public/logo_preview.html` for a quick preview.


Notes:
- The CSV parser is minimal and assumes no complex quoted newlines. If your CSV contains newlines in fields, pre-process it first.
