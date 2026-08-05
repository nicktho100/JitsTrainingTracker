# Deploy Mat Time to Cloudflare

This procedure deploys the tracker to a private `workers.dev` URL backed by Cloudflare D1. Cloudflare Access handles login, and the application independently validates the Access JWT before reading or writing training data.

## Before you start

You need:

- A Cloudflare account.
- Node.js 22.13 or later.
- `pnpm` available on your computer.
- Access to this project directory.

If `pnpm` is not installed, install it from a PowerShell window:

```powershell
npm install --global pnpm
```

Then open PowerShell in this project and install the dependencies:

```powershell
cd "C:\Users\Nick Thomas\Documents\JitsTrainingTracker"
pnpm install
```

## 1. Log in to Cloudflare

Run:

```powershell
pnpm cf:login
```

Wrangler opens a browser. Sign in to Cloudflare, select the account that should own the application, and approve Wrangler. Return to PowerShell and verify the active account:

```powershell
pnpm cf:whoami
```

If the wrong account is shown, run `pnpm exec wrangler logout` and repeat the login.

## 2. Create the D1 database

Run:

```powershell
pnpm cf:db:create
```

Cloudflare returns a `database_id`. Open `wrangler.jsonc` and replace this placeholder:

```text
00000000-0000-4000-8000-000000000000
```

with the real D1 database ID. Do not change the binding name `DB` or database name `mat-time-db`.

Apply the checked-in database migration to the hosted database:

```powershell
pnpm cf:db:migrate
```

Confirm that Wrangler reports the migration as applied successfully.

## 3. Build and deploy the Worker

Run:

```powershell
pnpm deploy
```

Wrangler builds and deploys the application, then prints a production URL similar to:

```text
https://mat-time.<your-cloudflare-subdomain>.workers.dev
```

Before Cloudflare Access is configured, opening the URL only shows the locked setup page. The application API rejects unauthenticated requests and does not expose training data.

## 4. Enable Cloudflare Access

1. Open the Cloudflare dashboard.
2. Go to **Workers & Pages** and select **mat-time**.
3. Open **Domains** or **Settings > Domains & Routes**, depending on the dashboard layout.
4. Find the production `workers.dev` URL and select **Enable Cloudflare Access**.
5. Create or select an Access policy that allows only your email address.
6. For the simplest personal setup, use Cloudflare's email one-time PIN login method.
7. Save the Access application and policy.

Do not create a public Allow policy. The intended configuration is one explicitly allowed email address.

## 5. Configure JWT validation

The Access setup displays two values needed by the application:

- The team domain, formatted as `https://<team-name>.cloudflareaccess.com`.
- The Access application's Audience (`AUD`) tag.

If you need to find the AUD later, open **Zero Trust > Access controls > Applications**, configure the Mat Time application, and copy the **Application Audience (AUD) Tag** from its additional settings.

Store both values as encrypted Worker secrets. Each command prompts you to paste one value:

```powershell
pnpm exec wrangler secret put TEAM_DOMAIN
pnpm exec wrangler secret put POLICY_AUD
```

For `TEAM_DOMAIN`, paste the full HTTPS URL. For `POLICY_AUD`, paste only the AUD tag. These values are not committed to the repository, and future deployments preserve them.

## 6. Test the deployed tracker

1. Open the `workers.dev` URL in a private browser window.
2. Confirm Cloudflare Access requests your email and one-time PIN.
3. Sign in with the allowed email.
4. Save a small 2024 or 2025 backfill value.
5. Save a daily session, reload the page, and confirm the entry remains.
6. Open the same URL from your phone, sign in with the same email, and confirm the same data appears.
7. Select **Sign out** and confirm Cloudflare Access requires authentication again.

If the locked setup page still appears after successful Access login, verify `TEAM_DOMAIN` includes `https://`, verify `POLICY_AUD` belongs to the Mat Time Access application, and confirm the Access policy covers the production `workers.dev` hostname.

## Routine updates

After changing the application, redeploy with:

```powershell
pnpm deploy
```

If the database schema changes, generate a new migration, review it, and apply the pending migration remotely before deploying the code that depends on it.
