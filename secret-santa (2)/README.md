# Secret Santa
Run: `npm install`, then `npm test`, `npm run typecheck`, `npm run build`. Open `dist/index.html`, or publish `dist/` with GitHub Pages.
Use: list names (one per line), add rules (`Ann !> Bo` or `Ann !! Bo`), press Generate, copy each person's link and send it privately.
PIN: set one under "Organizer PIN" (a convenience lock, not strong security).
Editing people or rules after a draw shows a warning; use Verify or generate again.
Years: use the Exchange menu to switch years or start a new one (optionally copying people and rules). Export/Import backup lives under Backup.
Data: organizer settings and links are in this browser's localStorage (not a secure vault). Names and results travel only inside the links.

## Progress tracking (optional, Firebase)
1. console.firebase.google.com: create a project, then Build > Realtime Database > Create (any location, locked mode).
2. Rules tab: paste the contents of `database.rules.json`, then Publish.
3. Copy the database URL (like `https://NAME-default-rtdb.firebaseio.com`) into `src/config.ts`, then `npm run build`.
Only random ids and revealed/confirmed flags are stored. No names or assignments ever go to Firebase.

## No-install publishing
Upload these files to a public GitHub repo, then Settings > Pages > Source: GitHub Actions. The included workflow (.github/workflows/deploy.yml) tests, builds and publishes the site automatically on every change.
