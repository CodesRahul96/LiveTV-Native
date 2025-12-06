# How to Build LiveTV-Native APK

Since you are using Expo with Native Modules (Prebuild), you can build the APK locally using Android Studio's Gradle.

## Prerequisite

Ensure your terminal is in the project root: `E:\Projects\LiveTV-Native`

## Step 1: Prebuild

This generates the `android` folder with all native configuration.

```powershell
npx expo prebuild --clean
```

## Step 2: Build APK

Navigate to the android directory and run the assembler.

```powershell
cd android
./gradlew assembleRelease
```

## Step 3: Locate APK

Once the build finishes (takes 5-10 mins), your APK will be at:
`E:\Projects\LiveTV-Native\android\app\build\outputs\apk\release\app-release.apk`

---

## Alternative: EAS Build (Cloud)

If you prefer a cloud build:

```powershell
npm install -g eas-cli
eas login
eas build -p android --profile preview
```
