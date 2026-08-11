# Rice Stock Ledger

A small inventory tracker for a rice trading business, built with React + Vite.

## What it tracks

Two ways rice comes into stock, one way it goes out:

1. **Supplier purchases** — buying already-milled rice, in different types and
   grades, each at its own price from a supplier.
2. **Raw palay purchases + milling** — buying unmilled rice locally by weight
   (varies delivery to delivery), then recording a milling run that converts
   a given weight of raw palay into a quantity of finished rice.
3. **Stock-outs** — sales, damage, or adjustments that draw finished stock
   back down.

Both acquisition paths feed the same finished-stock pool per rice type, shown
on the Stock Room dashboard with a reorder-point gauge and status badge.

## Getting started

You'll need [Node.js](https://nodejs.org) 18 or later installed.

```bash
npm install
npm run dev
```

Then open the local URL it prints (usually `http://localhost:5173`).

## Building for deployment

```bash
npm run build
```

This outputs a static site to `dist/` that you can host anywhere (Netlify,
Vercel, GitHub Pages, a plain web server, etc).

## Data storage

The app supports two modes, and picks automatically based on whether it's
configured with a cloud database:

- **No cloud database configured (default):** data is saved to the
  browser's `localStorage`. It persists across restarts on the same
  computer and browser, but does **not** sync between devices, and
  clearing your browser's site data erases it. Fine for solo testing,
  not for a team.
- **Cloud database configured:** data lives in a shared Supabase
  (Postgres) database. Everyone using the app — on any phone, tablet, or
  computer — sees the same live inventory, and changes made on one device
  show up on the others automatically. This is what you want if more than
  one person needs to use the ledger.

See **"Setting up the shared cloud database"** and **"Deploying online"**
below to turn on cloud mode.

## Setting up the shared cloud database

This uses [Supabase](https://supabase.com), a hosted database service with
a generous free tier and no server for you to maintain.

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New project**. Pick any name (e.g. "rice-stock-ledger") and a
   password (save it somewhere — you likely won't need it again, but keep
   it safe).
3. Wait 1-2 minutes for the project to finish setting up.

### 2. Create the tables
1. In your new project, open the **SQL Editor** tab on the left sidebar.
2. Click **New query**.
3. Open the file `supabase-schema.sql` (included in this project folder)
   in a text editor, copy its entire contents, and paste them into the SQL
   Editor.
4. Click **Run**. You should see a success message. This creates all six
   tables the app needs (rice types, suppliers, purchases, millings,
   stock-outs).

### 3. Get your project's API keys
1. In the Supabase sidebar, go to **Project Settings** (gear icon) →
   **Data API** (sometimes labeled **API**).
2. You need two values:
   - **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
   - **anon public** key (a long string under "Project API keys")

### 4. Connect the app to it
1. In the `rice-inventory-app` folder, find the file `.env.example`.
2. Make a copy of it in the same folder and rename the copy to exactly
   `.env` (not `.env.txt` — in Windows you may need to enable "File name
   extensions" in File Explorer's View tab to rename it correctly).
3. Open `.env` in Notepad and fill in the two values from step 3:
   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...(paste the whole long key)
   ```
4. Save the file.
5. Rebuild the app:
   ```
   npm run build
   npm run preview
   ```
   Open the `localhost` link it prints. The app now reads/writes from the
   cloud database instead of this browser only.

### 5. Bring in your existing data (one time)
If this is the same computer/browser where you already recorded real data
(under the old localStorage-only version), the app will detect that data
automatically the first time it connects to a freshly-created (empty)
cloud database, and show a banner: **"Found existing data saved on this
device. Import it into the shared database?"** Click **Import it**. Do
this once, on whichever device has your real data — after that, every
device pointed at the same `.env` values shares that same imported data.

## Fixing a "purchase disappears" bug (if you set this up before Aug 2026)

An earlier version of `supabase-schema.sql` was missing a column
("totalCost") on two tables: `supplier_purchases` and `raw_purchases`.
The symptom: recording a supplier purchase or a raw palay purchase would
briefly show up, then vanish, and Stock Room would still show 0 for it.

**To fix it:** open `supabase-migration-fix-totalcost.sql`, copy its
contents, paste into a new query in Supabase's SQL Editor, and click Run.
This adds the missing column without touching any existing data. New
setups using the current `supabase-schema.sql` already have this fixed
and don't need to run anything extra.

Any purchases that seemed to vanish because of this bug were never
actually saved — you'll need to re-enter them once the fix is applied.

## Adding the login screen

The app now shows a sign-in page before anyone can see or edit the
ledger. This is a **single shared login** — one email and password that
you and your staff all use, not individual accounts per person.

**If you already ran the old `supabase-schema.sql`** (from before login
was added), first run `supabase-migration-auth.sql` once in the SQL
Editor — same steps as running `supabase-schema.sql` earlier: open the
file, copy its contents, paste into a new SQL Editor query, click Run.
(New setups don't need this — it's already included in
`supabase-schema.sql`.)

**Create the one user account:**
1. In your Supabase project, open **Authentication** in the left sidebar.
2. Go to the **Users** tab.
3. Click **Add user** → **Create new user**.
4. Enter an email (it doesn't need to be a real inbox you check — just a
   consistent login ID, e.g. `jessa@ricestockledger.local`) and a
   password.
5. Leave "Auto Confirm User" turned on (so it doesn't try to send a
   verification email), then click **Create user**.
6. Share that email + password with your staff as the one login everyone
   uses.

That's it — rebuild (`npm run build`) and reload the app, and you'll see
the sign-in page. Log in with the email and password from step 4.

**Changing the password later:** back in **Authentication → Users**,
click the user, and there's an option to reset/update their password.

**A note on what this does and doesn't protect:** this is one shared
password, not per-staff accounts — anyone with it can view and edit
everything, and you won't be able to tell which staff member made a given
change. That matches what you asked for (single user). If later you want
to know who did what, or want to remove one staff member's access without
changing the password for everyone, that would mean creating individual
accounts instead — let me know if you'd like that.

### A note on security
See "Adding the login screen" below — with that set up, the database only
accepts requests from a signed-in session, not just anyone holding the
public key.

## Deploying online

Once your `.env` is set up and pointed at your Supabase project, you can
put the app on a real web address so your staff can open it from their
own phones/computers — no need for anyone to run `npm` commands.

**Netlify Drop (simplest, no account required to try, free account to keep it live):**
1. On your computer, in the `rice-inventory-app` folder, run:
   ```
   npm run build
   ```
   This creates a `dist` folder containing the finished site.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop) in your browser.
3. Drag the entire `dist` folder from File Explorer onto that page.
4. Netlify uploads it and gives you a live URL (like
   `https://random-name-123.netlify.app`) within seconds.
5. Share that URL with your staff. (Optional: create a free Netlify
   account to keep the site permanently and rename it to something nicer,
   e.g. `jessas-rice-ledger.netlify.app`, under **Site settings → Change
   site name**.)

Since the Supabase keys are already baked into the build in step 1, no
further configuration is needed on Netlify's end — just re-run `npm run
build` and drag the new `dist` folder again any time you want to publish
a code change (like a renamed rice type on the header, or a future update
I make for you).

## Project structure

```
src/
  main.jsx              entry point
  AuthGate.jsx          shows Login or the app depending on sign-in state
  App.jsx               state, derived stock calculations, tab routing
  App.css               styling
  data/emptyData.js     starter/seed data for a fresh install
  lib/
    storage.js           localStorage read/write (used when no cloud DB configured)
    db.js                 Supabase cloud database read/write/import/live-sync
    auth.js                Supabase Auth sign-in/sign-out session handling
    format.js             id generation, date/number formatting
  components/
    Login.jsx              sign-in form
    Header.jsx
    TabNav.jsx
    Dashboard.jsx         Stock Room view
    SupplierPurchases.jsx buying milled rice from suppliers
    RawPurchases.jsx      buying unmilled palay locally by weight
    Milling.jsx           converting raw weight into finished stock
    StockOuts.jsx         sales / damage / adjustments
    RiceTypes.jsx         manage rice types, grades, units, reorder points
    Suppliers.jsx         manage supplier list
    ui.jsx                shared small components (gauge, badge, empty state)
supabase-schema.sql   paste into Supabase's SQL Editor to create the cloud tables
supabase-migration-auth.sql  run once if you set up the database before login was added
supabase-migration-fix-totalcost.sql  run once if your tables predate this fix — see below
.env.example          template for your Supabase URL/key (copy to .env)
```

## Customizing

- **Units**: rice types default to 25kg sacks but can also be set to 50kg
  sacks or plain kg, in the Rice Types tab.
- **Reorder points**: set per rice type; the dashboard gauge and badge
  (Stocked / Low / Reorder now / Out of stock) are driven by this value.
- **Currency**: amounts are formatted with the peso sign (₱) in
  `src/lib/format.js` — change `fmtNum`/the `₱` literals if you trade in a
  different currency.
