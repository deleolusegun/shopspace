# ShopSpace

A fresh, public marketplace where people advertise shops and products to the world. No account is needed to publish: add a title, description, location, contact email, cover photo or your own upload, and the listing is immediately visible to everyone.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4
- Drizzle ORM with libSQL/Turso
- Lucide icons
- Installable PWA with manifest, icons, service worker and install prompt

## Run locally

```bash
npm install
cp .env.example .env.local   # optional for local development
npm run db:push              # optional; the app also bootstraps its table on first request
npm run dev
```

Open `http://localhost:3000`.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/marketplace` | Public ad board with search, filters and posting |
| `/advertise` | Alias for `/marketplace` |
| `/api/ads` | `GET` active listings; `POST` a validated new listing |

## Data

Listings are stored in `data/shopspace.db` during development. In production the app uses `/tmp/shopspace.db` unless `SHOPSPACE_DB_URL` or Turso credentials are set:

```text
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

Set those variables in Vercel for persistent production data, then run `npm run db:push` with the same variables before deploying.

Both variables are now configured on the Vercel project as production/preview encrypted env vars, and the `ads` table has been pushed to Turso. Ads posted on the live site survive redeploys. To redeploy with this project-scoped token:

```bash
VERCEL_TOKEN=... node scripts/deploy-api.mjs
```

## Live public URL

**Permanent Vercel deployment:** https://my-storefront-cyan.vercel.app/marketplace

Deployed with the REST API using a project-scoped token (`scripts/deploy-api.mjs`). All routes and public posting are verified there.

**Temporary tunnel fallback:** the app is also published through an anonymous Serveo tunnel:

```text
https://a2e150b2c1c617af-41-204-44-173.serveousercontent.com/marketplace
```

This is a temporary preview, not a permanent deployment. The URL changes whenever the tunnel restarts, and anonymous tunnels have no uptime guarantee. To bring it back after a drop, run:

```bash
./scripts/publish.sh
```

It reuses the running server if possible and prints the new public URL. Listings are persisted in `data/shopspace.db`, so they survive server and tunnel restarts.

## Featured listings (revenue)

Free listings stay free. Sellers can tick **Pin it at the top for GH₵100** when posting; the ad is held as pending, sent to Paystack Checkout, and goes live as `featured` once the callback or webhook confirms payment. Featured ads are sorted first. Failed charges remove the pending ad. The price and currency are set in `lib/paystack.ts` to match the merchant's enabled Paystack currency.

Required env vars:

```text
PAYSTACK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SITE_URL=https://my-storefront-cyan.vercel.app
```

In Paystack (Settings → API Keys & Webhooks), add a webhook pointing to:

```text
https://my-storefront-cyan.vercel.app/api/paystack/webhook
```

and subscribe it to `charge.success` and `charge.failed`. Paystack signs webhooks with your secret key, so no separate webhook secret is needed. Use Paystack's test mode while developing.

Note: Vercel's Hobby plan is for non-commercial use. Upgrade the project to Pro before earning real money.

## Mobile apps (Play Store / App Store)

The `android/` and `ios/` folders are Capacitor projects. They are not a thin browser wrapper — the app UI lives in `mobile-app/` and calls the live API at `https://my-storefront-cyan.vercel.app/api/ads`, so listings, search, posting and Paystack promotion all work inside the app.

- App name: **ShopSpace**
- App ID / bundle ID: `com.shopspace.app`
- Icons, splash screens and launcher assets are generated from `assets/logo.png`

After changing anything in `mobile-app/`, run:

```bash
npm run mobile:sync
```

To regenerate icons and splash screens after replacing `assets/logo.png`:

```bash
npm run mobile:assets
npm run mobile:sync
```

### Android / Google Play

Requires Android Studio and a Google Play developer account.

```bash
npm run mobile:sync
npm run mobile:android
```

In Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**, create an upload key, then upload the resulting `.aab` to Play Console.

### iOS / App Store

Requires a Mac with Xcode and an Apple Developer account.

```bash
npm run mobile:sync
npm run mobile:ios
```

In Xcode: choose your Apple Developer team, then **Product → Archive → Distribute App → App Store Connect**.

### Automated builds (GitHub Actions)

Two workflows are included:

- `.github/workflows/android.yml` → builds a signed `app-release.aab`
- `.github/workflows/ios.yml` → builds a distributable `.ipa`

Both run on pushes to `main` and can also be started manually from the **Actions** tab. Download the built file from the workflow run's **Artifacts** section. To use them, push this folder to a GitHub repository and add these repository secrets.

**Android secrets**

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Generate an upload keystore once with Java installed:

```bash
keytool -genkeypair -v \
  -keystore android/app/release.keystore \
  -alias shopspace \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then base64-encode it and store the output as `ANDROID_KEYSTORE_BASE64`:

```bash
base64 -w0 android/app/release.keystore
```

Keep this keystore safe — you need it to publish future updates.

**iOS secrets**

```text
IOS_CERTIFICATE_BASE64
IOS_CERTIFICATE_PASSWORD
IOS_PROVISIONING_PROFILE_BASE64
IOS_PROVISIONING_PROFILE_NAME
APPLE_TEAM_ID
```

In Apple Developer, create an App ID for `com.shopspace.app`, an **Apple Distribution** certificate, and an **App Store** provisioning profile. Export the certificate as `.p12`, then base64-encode the `.p12` and `.mobileprovision` files:

```bash
base64 -i Certificate.p12 | tr -d '\n'
base64 -i profile.mobileprovision | tr -d '\n'
```

`IOS_PROVISIONING_PROFILE_NAME` must be the profile's Name field, not its filename.

Publishing itself must be done from the Play Console and App Store Connect. This workspace generates the complete native projects and build artifacts but cannot submit them without your store accounts and signing credentials.

## Install as an app

Open the site in Chrome, Edge or Safari and choose **Install app** / **Add to Home Screen**, or tap the ShopSpace install prompt. It opens in standalone mode with its own icon.

## Deploy

```bash
export NODE_OPTIONS=--max-old-space-size=6144
npm run build
npx vercel --prod
```

`vercel.json` already sets the build memory limit for Vercel builds.
