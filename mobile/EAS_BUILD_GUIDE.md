# 🏗️ GUIDE: Building Native App with EAS

## 🎯 Why EAS Build?
You need a "Development Build" to use native features that aren't in Expo Go:
- 📷 **Vision Camera** (Real camera access)
- 📝 **MLKit OCR** (Text recognition)
- 🗺️ **MapLibre** (Native map rendering)

Since the local build had SDK issues, **EAS Build** (Expo Application Services) is the reliable cloud-based alternative.

---

## 🚀 Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

## 🔐 Step 2: Login to Expo
```bash
eas login
```

## ⚙️ Step 3: Configure Project
Run this in the `mobile` directory:
```bash
eas build:configure
```
- Select `iOS` (and Android if needed).
- It will create an `eas.json` file.

## 📝 Step 4: Configure for Development
Open `eas.json` and ensure you have a `development` profile:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    // ...
  }
}
```
*Note: `simulator: true` allows you to install it on the iOS Simulator without an Apple Developer Account.*

## 🏗️ Step 5: Run the Build
```bash
eas build --profile development --platform ios
```

## 📲 Step 6: Install on Simulator
1. When the build finishes, EAS will give you a terminal command or a link.
2. If it gives a `.tar.gz` download link:
   - Download and extract it.
   - Drag the `.app` file onto your iOS Simulator.
3. OR run the provided command to auto-install.

---

## ✅ Final Result
You will have a new app icon (not "Expo Go", but your actual app "Mobile").
1. Open this new app.
2. It will look like a dev client.
3. Run your local bundler: `npx expo start`
4. Connect the app to your local bundler.
5. **Camera, OCR, and Maps will now work!**
