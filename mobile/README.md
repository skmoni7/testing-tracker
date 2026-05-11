# ProTrack Mobile (React Native / Expo)

This is the React Native Expo version of ProTrack. It connects to the **same Firebase Firestore database** as the web app at protrack.sj26.info.

## Setup

```bash
cd mobile
npm install
npx expo start
```

## To build an Android APK

```bash
npm install -g eas-cli
eas build -p android --profile preview
```

## Screens
- **Login** — email/password + forgot password
- **Dashboard** — live order list, color-coded cards, inline Amt Cr input, checkboxes
- **Add/Edit** — full form with all fields matching the web app
