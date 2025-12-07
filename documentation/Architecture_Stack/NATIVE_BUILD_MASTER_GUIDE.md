# 🏗️ Native Development Build Guide (iOS)

**Status**: ✅ Recommended for Full Features  
**Goal**: Enable Native Modules (MapLibre, Vision Camera, OCR) which are not supported in Expo Go.

---

## 1. Why Build Native?
Expo Go is great for quick JS changes, but it **cannot** run custom native code. You must build a "Development Client" to use:
- 🗺️ **MapLibre Native**: High-performance vector maps.
- 📷 **Vision Camera**: Advanced camera controls.
- 📝 **MLKit OCR**: On-device text recognition.
- 💾 **Offline Managers**: Native background downloads.

| Feature | Expo Go | Native Dev Build |
|---------|---------|------------------|
| **Maps** | ⚠️ Fallback Mock | ✅ Real Vector Maps |
| **Camera** | ⚠️ Mock Interface | ✅ Real Camera |
| **OCR** | ⚠️ Mock Data | ✅ Real Text Scan |
| **Auth** | ✅ Working | ✅ Working (Better Deep Linking) |

---

## 2. Prerequisites
- **Mac** with macOS.
- **Xcode** installed from App Store.
- **CocoaPods**: `sudo gem install cocoapods`
- **Expo CLI**: `npm install -g expo-cli`

---

## 3. Build Methods (Choose One)

### 🅰️ Method A: Xcode GUI (Recommended/Easiest)

1. **Verify Native Projects**:
   ```bash
   cd mobile
   npx expo prebuild   # Generates ios/ and android/ folders
   ```

2. **Open Workspace**:
   ```bash
   open ios/mobile.xcworkspace
   ```

3. **Configure Signing**:
   - Click project root `mobile` in left sidebar.
   - Select target `mobile`.
   - Go to **Signing & Capabilities**.
   - Select Team (Personal Team/Apple ID).
   - Ensure "Bundle Identifier" is unique (e.g., `com.yourname.agristack`).

4. **Build & Run**:
   - Select Simulator (e.g., iPhone 15 Pro) in top bar.
   - Press **⌘ + R** (Run).
   - Wait 10-15 mins for first build.

### 🅱️ Method B: Command Line

1. **Clean & Install**:
   ```bash
   cd mobile/ios
   rm -rf build Pods
   pod install
   cd ..
   ```

2. **Run Build**:
   ```bash
   npx expo run:ios --configuration Debug
   ```

### 🆎 Method C: EAS Build (Cloud)
*Use this if local build fails or connection is slow.*

1. **Install EAS**: `npm install -g eas-cli`
2. **Configure**: `eas build:configure`
3. **Run Build**:
   ```bash
   eas build --profile development --platform ios --local
   ```
4. **Install**: Drag the resulting `.app` into Simulator.

---

## 4. Running the App

Once the native app installs on the simulator:

1. **Start Metro Bundler**:
   ```bash
   cd mobile
   npx expo start --dev-client
   ```
   *Note: Using `--dev-client` flag is crucial.*

2. **Connect**:
   - The app might auto-connect.
   - If not, tap the app icon on Simulator.
   - It will load JS bundle from Metro.

---

## 5. Troubleshooting Common Issues

### "No signing certificate found"
- **Fix**: Open Xcode -> Signing & Capabilities -> Select "Automatically manage signing" -> Select Team.

### "Build failed with code 70" or "DerivedData error"
- **Fix**: In Xcode, go to **Product > Clean Build Folder** (⌘ + Shift + K). Then rebuild.

### "Simulator not found"
- **Fix**: Boot a simulator manually:
  ```bash
  xcrun simctl list
  xcrun simctl boot <UDID>
  ```

### "MapLibre crashes"
- **Fix**: Ensure `NSLocationWhenInUseUsageDescription` is in `app.json` config (it should be auto-added during prebuild).

---

## 6. Verification Checklist

After building, verify native features:
- [ ] **Maps**: Open Map tab. Should see real tiles, not placeholder text.
- [ ] **Offline**: Tap "Download". Should see progress bar.
- [ ] **Camera**: Tap "Capture". Should request Camera permissions (iOS system dialog).
- [ ] **OCR**: Taking a photo should return analyzed text.

---

## 7. Workflow Impact
- **JS Changes**: Hot reload works instantly (same as Expo Go).
- **Native Changes**: (e.g. adding new libraries via `npm install`). Requires Re-build (⌘+R).

---

## 8. Authentication Configuration (Keycloak)

To ensure the native build works with Keycloak:

**Realm**: `agristack`  
**Client ID**: `agristack-mobile`  
**Redirect URIs** (Must be in Keycloak):
- `agristack://oauthredirect` (Native)
- `exp://192.168.1.11:8081` (Expo Go)
- `exp://localhost:8081`

**Mocking Auth for Testing**:
If you need to bypass OAuth (e.g., if Keycloak is down), set `MOCK_AUTH = true` in `src/screens/LoginScreen.tsx`.

**You are now running a production-grade native environment!** 🚀
