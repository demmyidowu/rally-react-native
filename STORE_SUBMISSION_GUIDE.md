# RallyRide — App Store & Google Play Submission Guide

> Use this doc as a reference when filling out App Store Connect and Google Play Console.
> All answers are pre-filled for RallyRide. Copy-paste where you can.

---

## App Identity (both stores)

| Field | Value |
|-------|-------|
| App name | `RallyRide` |
| Version | `1.0.0` |
| iOS Bundle ID | `com.RallyRideios.app` |
| Android Package | `com.RallyRide.app` |
| Developer name | Your legal name or entity |
| Support email | `rallyridesafe@gmail.com` |
| Privacy policy URL | `https://rallyride.app/privacy.html` |
| Support URL | `https://support.rallyride.app` |
| Marketing URL (optional) | `https://rallyride.app` |

---

## Pre-submission Checklist

Before opening either console, complete these steps locally:

- [ ] Run `eas build --platform ios --profile production` and `eas build --platform android --profile production`
- [ ] Deploy Cloud Functions and call `curl https://us-central1-ddride-didowu.cloudfunctions.net/seedTestSchool` to create the two App Review test accounts
- [ ] Capture screenshots on all required device sizes (see sections below)
- [ ] Confirm `https://rallyride.app/privacy.html` loads publicly (no auth required)
- [ ] Confirm `https://support.rallyride.app` loads publicly
- [ ] Have your Apple Developer Program membership active ($99/yr)
- [ ] Have your Google Play Developer account active ($25 one-time)

---

# PART 1 — Apple App Store (App Store Connect)

## Step 1: Create the App Record

Go to **appstoreconnect.apple.com → My Apps → (+) New App**

| Field | Answer |
|-------|--------|
| Platforms | iOS |
| Name | `RallyRide` |
| Primary language | English (U.S.) |
| Bundle ID | `com.RallyRideios.app` (select from dropdown — must match app.json) |
| SKU | `RALLYRIDE001` (any unique string you choose, not shown publicly) |
| User access | Full access |

---

## Step 2: App Information Tab

### Localizable Information
| Field | Answer |
|-------|--------|
| Name | `RallyRide` |
| Subtitle | `Safe Rides for Greek Life` (27 chars — max 30) |
| Privacy Policy URL | `https://rallyride.app/privacy.html` |

### General App Information
| Field | Answer |
|-------|--------|
| Primary category | **Travel** |
| Secondary category | **Utilities** |
| Content rights | Select "This app does not contain, show, or access third-party content." |

---

## Step 3: Pricing and Availability Tab

| Field | Answer |
|-------|--------|
| Price | **Free** |
| Availability | All territories (or limit to United States only for initial launch) |
| Pre-order | No |

---

## Step 4: App Privacy Tab

Apple will ask what data you collect. Answer each category:

### Data Types You Collect

**Contact Info**
- ✅ Name — Used to display to other users in rides; linked to identity; required
- ✅ Email Address — Used for authentication; linked to identity; required

**Location**
- ✅ Precise Location — One-time capture when requesting a ride or marking en route; linked to identity; required
- ❌ Coarse Location — Not collected
- ❌ Location History / Background Location — Not collected (explicitly one-time only)

**Identifiers**
- ✅ User ID — Firebase UID stored in Crashlytics; linked to identity; required

**Diagnostics**
- ✅ Crash Data — Firebase Crashlytics collects crash reports linked to User ID; not used for tracking

**Usage Data** — None intentionally collected beyond crash reports

**Financial Info / Health / Browsing / Search / Contacts / Messages** — None collected

### Tracking
Answer **No** to "Do you or your third-party partners use data collected from this app to track users?" — RallyRide does not use data for advertising or cross-app tracking.

---

## Step 5: Versions Tab — App Store Listing

### Description (up to 4,000 characters)

```
RallyRide keeps your chapter safe by making it easy to coordinate designated drivers for any event.

REQUEST A RIDE
Need a safe way home? Open RallyRide, tap Request a Ride, and you're placed in the chapter queue. The system prioritizes rides by class year and wait time, so everyone gets home fairly and efficiently.

EMERGENCY BUTTON
If you're ever in an unsafe situation, the Emergency button gives you the highest priority in the queue — instantly — and alerts chapter admins so they can respond right away.

BE A DESIGNATED DRIVER
Signing up as a DD is simple: add your car details, toggle yourself active, and start accepting ride assignments. The app tells you exactly where to go and sends your ETA directly to the rider via push notification.

SMART QUEUE MANAGEMENT
Admins can manage the full DD roster, track active rides, handle join requests, and review the complete ride history — all from a single dashboard.

BUILT FOR COLLEGE GREEK LIFE
RallyRide is designed specifically for fraternities and sororities. Your chapter's data stays within your chapter — no public ride-sharing, no strangers.

PRIVACY FIRST
Location is captured only at the moment you request a ride or start a trip — never tracked in the background. No ads. No data selling. Ever.

Requires a university .edu email address to join.
```

### Keywords (up to 100 characters, comma-separated)
```
designated driver,DD,Greek life,fraternity,sorority,safe ride,chapter,college,campus,queue
```
(99 characters — exactly at the limit)

### What's New (Version 1.0.0)
```
Initial release of RallyRide — safe ride coordination for college Greek life chapters.
```

### Support URL
```
https://support.rallyride.app
```

### Marketing URL (optional)
```
https://rallyride.app
```

---

## Step 6: App Review Information

### Sign-in Required
- ✅ Yes, sign-in is required

Two pre-created test accounts are provided. No sign-up is required — just log in.

```
RIDER ACCOUNT:
  Email:    reviewerRider@ksu.edu
  Password: RallyDemo2025!
  Role:     Member | Chapter: Demo Fraternity (RallyRide Demo University)

DD ACCOUNT:
  Email:    reviewerDD@ksu.edu
  Password: RallyDemo2025!
  Role:     Admin | Chapter: Demo Fraternity (RallyRide Demo University)
  Car:      Black Demo Car (pre-set, active)
```

### Notes for the Reviewer
```
RallyRide is a designated driver coordination app for college Greek life chapters.

TWO TEST ACCOUNTS: Both accounts are pre-created and pre-verified — no sign-up flow required. Simply log in with the credentials above.

TEST ENVIRONMENT: The accounts belong to "RallyRide Demo University" (Demo Fraternity), a self-contained demo chapter separate from any real university chapters.

IMPORTANT — .edu email requirement: All users must register with a university email address (.edu domain). The test accounts satisfy this requirement and are already verified — no email confirmation needed.

GEOFENCING DISABLED: The demo university has geofencing turned off, so any location or manually typed address works for pickup — no need to be physically in Manhattan, KS.

KEY FLOWS TO TEST:
1. Log in with RIDER credentials → see the Rider dashboard.
2. Tap "Request a Ride" → allow location or enter any address manually → tap Submit → ride enters the queue.
3. Log out → log in with DD credentials → see the DD dashboard (DD is already active, car info already set).
4. The queued ride auto-assigns to the DD within seconds.
5. Tap the assigned ride → tap "Mark En Route".
6. (Optional) Log back in as RIDER to see the "On the Way" status update.
7. Tap "Emergency" on the Rider home screen → see the emergency priority flow.
8. Tap Profile → Help & Support.
9. Tap Profile → Settings → notification preferences.

There is no payment or subscription. The app is free and used within closed chapter groups only.
```

### Attachment
Not required, but you can attach a short screen recording if you have one.

---

## Step 7: Content Ratings (Age Rating)

Apple will ask you a series of Yes/No questions. Answer as follows:

| Question | Answer |
|----------|--------|
| Cartoon or fantasy violence | None |
| Realistic violence | None |
| Prolonged graphic or sadistic realistic violence | None |
| Profanity or crude humor | None |
| Mature/suggestive themes | None |
| Horror/fear themes | None |
| Medical/treatment information | None |
| Alcohol, tobacco, or drug use or references | **Infrequent/Mild** ← the app facilitates rides for people who may have been drinking; it does not depict or promote alcohol use |
| Gambling | None |
| Sexual content or nudity | None |
| Graphic sexual content or nudity | None |
| Unrestricted web access | None |
| Gambling and contests | None |

**Expected resulting rating: 17+**
(This is appropriate — the app is explicitly for college students 18+.)

---

## Step 8: Export Compliance (Encryption)

| Question | Answer |
|----------|--------|
| Does your app use encryption? | **Yes** — the app uses HTTPS/TLS for all network communication (standard encryption) |
| Is your app exempt from encryption regulations? | **Yes** — it only uses standard encryption (HTTPS) that qualifies for the EAR exemption |
| Does the app use non-exempt encryption? | **No** (`ITSAppUsesNonExemptEncryption = false` is already set in app.json — this is handled automatically by EAS) |

> EAS Build sets `ITSAppUsesNonExemptEncryption = false` automatically from app.json.
> You may still be asked in the console — answer No to non-exempt encryption.

---

## Step 9: Screenshots Required

Apple requires screenshots for specific device sizes. Use an iOS Simulator or real device.

### Required sizes (portrait):
| Device | Size | Simulator |
|--------|------|-----------|
| 6.9" (iPhone 16 Pro Max) | 1320 × 2868 px | iPhone 16 Pro Max |
| 6.5" (iPhone 14 Plus / 13 Pro Max) | 1284 × 2778 px | iPhone 14 Plus |
| 5.5" (iPhone 8 Plus) — only if supporting iOS 12 | 1242 × 2208 px | iPhone 8 Plus |

> Optional but recommended: iPad Pro 12.9" if you ever want tablet support.

### Suggested screenshots (6 max per size):
1. Rider dashboard — "Your chapter, always safe"
2. Request a Ride flow
3. Queue status screen
4. DD dashboard with active ride
5. Emergency button in action
6. Profile / Help screen

### Tools
- Use `eas build --platform ios` and run on Simulator to capture
- Or use Expo Go on a real device and take screenshots
- Edit with Figma or Canva to add caption overlays (optional but looks better)

---

# PART 2 — Google Play Console

## Step 1: Create the App

Go to **play.google.com/console → All apps → Create app**

| Field | Answer |
|-------|--------|
| App name | `RallyRide` |
| Default language | English (United States) |
| App or game | **App** |
| Free or paid | **Free** |
| Declarations | Check both (Developer Program Policies + US export laws) |

---

## Step 2: Store Listing

### Main Store Listing

| Field | Answer |
|-------|--------|
| App name | `RallyRide` |
| Short description (max 80 chars) | `Safe designated driver coordination for college Greek life chapters` (67 chars) |

**Full description (max 4,000 chars)** — use the same text as the App Store description above.

### Graphic Assets Required

| Asset | Size | Notes |
|-------|------|-------|
| App icon | 512 × 512 px PNG | Use `assets/logo.png` — export at 512×512 |
| Feature graphic | 1024 × 500 px JPG/PNG | Banner shown at top of Play listing — create in Canva |
| Phone screenshots | min 2, max 8 | 1080 × 1920 px (portrait) |

### Contact Details
| Field | Answer |
|-------|--------|
| Email | `rallyridesafe@gmail.com` |
| Website (optional) | `https://rallyride.app` |
| Phone (optional) | Leave blank |

---

## Step 3: App Content

### Privacy Policy
| Field | Answer |
|-------|--------|
| Privacy policy URL | `https://rallyride.app/privacy.html` |

### App Access
| Question | Answer |
|----------|--------|
| All or some functionality restricted? | **All functionality restricted** — app requires login |
| Instructions for reviewer | Same notes as App Store reviewer notes above — provide the test account credentials |

### Ads
| Question | Answer |
|----------|--------|
| Does your app contain ads? | **No** |

### Content Rating Questionnaire

Click "Start questionnaire" and answer:

| Question | Answer |
|----------|--------|
| Category | **Utilities** |
| Violence | No |
| Sexual content | No |
| Language | No |
| Controlled substances | **Yes** — the app is designed around alcohol safety (designated driving) |
| Gambling | No |
| User-generated content | No |
| Personal/sensitive data | No (beyond standard account data) |

**Expected rating: Teen (T) / PEGI 12 or 16**
> The "controlled substances" answer triggers a Teen rating at minimum, which is fine — the app targets 18+ users but a Teen rating doesn't block your audience.

### Target Audience and Content

| Question | Answer |
|----------|--------|
| Target age group | **18 and over** |
| App appeals to children? | No |

---

## Step 4: Data Safety Section

This is the most detailed section. Answer each item:

### Does your app collect or share any of the required user data types?
**Yes**

### Location
| Field | Answer |
|-------|--------|
| Precise location collected? | **Yes** |
| Approximate location collected? | No |
| Location shared with third parties? | No |
| Location required or optional? | Required |
| Purpose | App functionality (pickup location for rides) |
| Is it processed ephemerally? | No — stored in Firestore for the duration of the ride |

### Personal Info
| Data type | Collected? | Shared? | Required? | Purpose |
|-----------|-----------|---------|-----------|---------|
| Name | Yes | No | Yes | App functionality (displayed to drivers/riders) |
| Email address | Yes | No | Yes | Account management |
| User IDs | Yes | No | Yes | App functionality (Firebase UID) |

### App Activity
| Data type | Collected? |
|-----------|-----------|
| App interactions | No |
| In-app search history | No |
| Installed apps | No |
| Other user-generated content | No |

### App Info and Performance
| Data type | Collected? | Purpose |
|-----------|-----------|---------|
| Crash logs | **Yes** | Analytics (Firebase Crashlytics) |
| Diagnostics | **Yes** | Analytics (Firebase Crashlytics) |

### Device or Other IDs
| Data type | Collected? | Purpose |
|-----------|-----------|---------|
| Device or other IDs | **Yes** | Analytics — FCM token for push notifications |

### Security Practices
| Question | Answer |
|----------|--------|
| Is all data encrypted in transit? | **Yes** — HTTPS/TLS for all Firebase communication |
| Do you provide a way for users to request data deletion? | **Yes** — users can delete their account in-app (Profile → Delete Account) or email rallyridesafe@gmail.com |

---

## Step 5: Store Settings

| Field | Answer |
|-------|--------|
| App category | **Travel & Local** |
| Tags (up to 5) | `designated driver`, `Greek life`, `safe rides`, `college`, `campus` |
| Email | `rallyridesafe@gmail.com` |
| Website | `https://rallyride.app` |

---

## Step 6: Release

### Create a Production Release
1. Go to **Production → Create new release**
2. Upload the `.aab` file from `eas build --platform android --profile production`
3. Set **Release name**: `1.0.0`
4. **Release notes**:
```
Initial release of RallyRide — safe ride coordination for college Greek life chapters.
```

---

# PART 3 — After Submission

## Apple Review Timeline
- **Standard**: 1–3 business days for first submission
- **Expedited** (if needed): Request at developer.apple.com/contact/app-store/

## Google Review Timeline
- **First release**: Up to 7 days for initial review
- **Subsequent releases**: Usually 1–3 days

## Common Rejection Reasons & How to Avoid Them

| Risk | Mitigation |
|------|-----------|
| Reviewer can't log in (no .edu email) | Run `seedTestSchool` after deploying — creates two pre-verified test accounts (`reviewerRider@ksu.edu` / `reviewerDD@ksu.edu`) |
| Privacy policy URL broken | Test the URL in an incognito browser before submitting |
| Screenshots don't match actual app | Take screenshots from the final production build |
| Missing location permission justification | Already in app.json — "RallyRide needs your location to calculate accurate pickup locations and ETAs" |
| Age rating mismatch (alcohol content) | Be consistent: iOS 17+, Android Teen — both match the 18+ target audience |
| App crashes during review | Test on a real device with the production build before submitting |

---

## EAS Build Commands (run these first)

```bash
# Install EAS CLI if not installed
npm install -g eas-cli

# Log in
eas login

# Build for iOS (production)
eas build --platform ios --profile production

# Build for Android (production)
eas build --platform android --profile production

# Submit to App Store (after iOS build completes)
eas submit --platform ios

# Submit to Google Play (after Android build completes)
eas submit --platform android
```

> EAS Submit can upload directly to both stores. You still need to complete the store listing fields manually in App Store Connect / Play Console.
