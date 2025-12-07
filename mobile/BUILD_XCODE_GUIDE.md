# Development Build Instructions - MapLibre Native Support

## ✅ Authentication Working Perfect!

Your Keycloak SSO integration is fully functional:
- PKCE OAuth flow: ✅
- Token refresh: ✅  
- Database sync: ✅
- Backend integration: ✅

The only limitation is **MapLibre native module** requires a Development Build.

## 🎯 Goal: Enable Native Map Functionality

### What Works in Dev Build (vs Expo Go)
| Feature | Expo Go | Dev Build |
|---------|---------|-----------|
| Authentication (Keycloak) | ✅ Working | ✅ Working |
| Database (SQLite) | ✅ Working | ✅ Working |
| Sync Service | ✅ Working | ✅ Working |
| **MapLibre (Online Maps)** | ❌ Fallback | ✅ **Full** |
| **Offline Map Downloads** | ❌ Mock | ✅ **Full** |
| Vision Camera | ❌ Mock | ✅ Full |
| MLKit OCR | ❌ Mock | ✅ Full |

## 📱 Building in Xcode (RECOMMENDED - Easiest)

I've opened `mobile.xcworkspace` in Xcode for you. Follow these steps:

### Step 1: Select Simulator
1. In Xcode, at the top bar, click the device selector (next to "mobile")
2. Choose: **iPhone 14 Pro** (or any iOS Simulator)

### Step 2: Build and Run
1. Press **⌘ + R** (or click the Play ▶️ button)
2. Xcode will build the app (first build takes 5-10 minutes)
3. App will launch in the simulator automatically

### Step 3: Start Metro Bundler
Once build completes and app opens:
```bash
cd /Users/mic/docode/jk/mobile
npx expo start --dev-client
```

The app will connect to Metro and reload with your code.

### Step 4: Test Map Functionality
- Navigate to **Map** screen
- Should see **real MapLibre map** with tiles
- Tap "Offline Maps" → Can download map tiles
- Test parcels rendering on map

## 🔧 Alternative: Command Line Build

If Xcode GUI doesn't work, try:

```bash
cd /Users/mic/docode/jk/mobile

# Clean previous builds
rm -rf ios/build

# Ensure simulator is booted
xcrun simctl boot A9155F81-E4EC-4EFD-8B3B-6C3A43F7E165

# Build without specifying device (let Expo auto-detect)
npx expo run:ios --configuration Debug

# Or build for any available simulator
npx expo run:ios
```

## 📋 Current Native Module Status

### Code Already Updated For Dev Build ✅
- **Map.tsx**: Real MapLibreGL import enabled
- **OfflineMapService.ts**: Real offline manager enabled
- **AuthService.ts**: Working in both Expo Go and Dev Build
- **CameraScreen.tsx**: Ready for native Vision Camera
- **OCRService.ts**: Ready for native MLKit

### What Happens in Dev Build

1. **Try/Catch Import Works**:
   ```typescript
   try {
       RealMapLibreGL = require('@maplibre/maplibre-react-native').default;
       // ✅ This succeeds in Dev Build
   } catch (e) {
       // ❌ This runs in Expo Go
   }
   ```

2. **Real Map Rendering**:
   - Displays MapLibre tiles from demotiles.maplibre.org
   - Draws parcel polygons with FillLayer/LineLayer
   - Camera controls work
   - Offline downloads functional

## 🎯 Testing Checklist After Dev Build

### Online Map Features
- [ ] Map view loads with tiles
- [ ] Can zoom in/out
- [ ] Can pan around
- [ ] Parcels render as blue polygons
- [ ] Tapping parcels shows info

### Offline Map Features
- [ ] Tap "Offline Maps" button
- [ ] See list of available packs
- [ ] Download a map pack
- [ ] Progress bar shows download
- [ ] Maps work without internet

### Authentication (Already Working)
- [x] Login with Keycloak
- [x] Token refresh
- [x] Logout
- [x] Re-login

## 🚨 Common Build Issues

### Issue: "No signing certificate found"
**Solution**: 
1. In Xcode: Target → Signing & Capabilities
2. Team: Select your Apple ID
3. Or set "Automatically manage signing"

### Issue: "Build failed with code 70"
**Solution**: 
1. Product → Clean Build Folder (⌘ + Shift + K)
2. Close Xcode
3. Delete `ios/build` folder
4. Re-open and try again

### Issue: "Module not found"
**Solution**:
```bash
cd ios
pod install
cd ..
```

### Issue: "Simulator not found"
**Solution**:
```bash
# List available simulators
xcrun simctl list devices available

# Boot your chosen simulator
xcrun simctl boot <UDID>

# Or let Xcode pick one (easier)
```

## 📊 Build Time Expectations

- **First Build**: 5-15 minutes (downloads dependencies, compiles native code)
- **Incremental Builds**: 30 seconds - 2 minutes
- **Hot Reload** (after Metro connects): < 1 second

## 🎉 Expected Result

After successful build, you'll have:

1. **Full Native App** running in simulator
2. **All native modules working**:
   - Real MapLibre maps ✅
   - Offline map downloads ✅
   - Vision Camera ✅
   - MLKit OCR ✅
3. **Fast reload** with Metro bundler
4. **Production-like** behavior

## 🔄 Development Workflow

Once dev build is complete:

1. **Make Code Changes**:
   - Edit `.tsx`, `.ts` files
   - Save

2. **Hot Reload**:
   - Changes appear in <1 second
   - No rebuild needed (unless native code changed)

3. **Test**:
   - Interact with app
   - Check logs in Metro terminal

4. **Rebuild Only If**:
   - Added new native dependencies
   - Changed native configurations
   - Modified Podfile/build settings

## 📢 Current Status

**Xcode is now open** with your workspace. You can:
- ✅ Select iPhone 14 Pro simulator
- ✅ Press ⌘ + R to build
- ✅ Wait for build to complete
- ✅ App launches with real MapLibre

Let me know when Xcode starts building and I'll help you through the next steps!

---

## Quick Reference

**Build in Xcode**: ⌘ + R  
**Clean Build**: ⌘ + Shift + K  
**Stop Build**: ⌘ + .  
**Start Metro**: `npx expo start --dev-client`
