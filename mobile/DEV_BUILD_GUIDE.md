# Building Development Build with Native Modules

This guide explains how to build and run the mobile app with native modules like MapLibreGL.

## Why Development Build?

Expo Go is great for rapid development but has limitations:
- ❌ Cannot load custom native modules (MapLibreGL, VisionCamera, etc.)
- ❌ OAuth redirects can be unreliable
- ✅ Fast iteration for JS-only changes

Development Build gives you:
- ✅ Full native module support
- ✅ Reliable OAuth redirects
- ✅ Custom native configurations
- ✅ Still uses Expo infrastructure

## Prerequisites

### iOS
- Xcode installed (you have it)
- CocoaPods installed: `sudo gem install cocoapods`
- Apple Developer account (for device testing)

### Android
- Android Studio installed
- Android SDK configured
- Java Development Kit (JDK) 17+

## Build Steps

### 1. Create Native Projects

```bash
cd /Users/mic/docode/jk/mobile
npx expo prebuild
```

This creates `ios/` and `android/` directories with native code.

### 2. Install iOS Dependencies

```bash
cd ios
pod install
cd ..
```

### 3. Build and Run

**Option A: Using Expo CLI** (Recommended)
```bash
# iOS
npx expo run:ios --device "iPhone 14 Pro"

# Android
npx expo run:android
```

**Option B: Using Xcode**
```bash
open ios/mobile.xcworkspace
# Then build in Xcode (Cmd+R)
```

**Option C: Using Android Studio**
```bash
open -a "Android Studio" android/
# Then build in Android Studio
```

## Current Status

### ✅ Ready for Development Build
- Map.tsx: Real MapLibreGL import enabled
- OfflineMapService.ts: Real offline manager enabled
- CameraScreen.tsx: Mock (can be updated)
- OCRService.ts: Mock (can be updated)

### 📱 Native Modules Status

| Module | Expo Go | Dev Build |
|--------|---------|-----------|
| MapLibreGL | Mock fallback | ✅ Real |
| VisionCamera | Mock | ✅ Real |
| MLKit OCR | Mock | ✅ Real |
| expo-auth-session | ✅ Works | ✅ Works |
| SQLite | ✅ Works | ✅ Works |

## Testing Auth in Development Build

Once built, the OAuth flow will be more reliable:
1. Uses native browser redirect (not WebView)
2. Deep linking works better
3. PKCE flow fully functional

## Quick Start

```bash
# 1. Build for simulator
cd /Users/mic/docode/jk/mobile
npx expo run:ios

# 2. After successful build, start Metro
npx expo start --dev-client

# 3. App automatically opens in simulator with native modules!
```

## Troubleshooting

### "Unable to find simulator"
- Boot simulator first: `xcrun simctl boot <UDID>`
- Or let Expo choose: `npx expo run:ios` (without --device flag)

### "Build failed"
- Clean build: `cd ios && rm -rf build Pods && pod install && cd ..`
- Check Xcode version: `xcodebuild -version`

### "Module not found"  
- Ensure prebuild ran: `ls -la ios android`
- Reinstall dependencies: `npm install`

## Next Steps

1. **Build development client** (above steps)
2. **Update Camera/OCR** to use real modules (similar to Map)
3. **Test on physical device** for best OAuth experience
4. **Deploy to TestFlight** for beta testing

## Production Build

For production releases:
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

Requires EAS account: https://expo.dev/eas
