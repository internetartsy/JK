# Quick Xcode Build Steps

Xcode is now open with your mobile app project.

## Build Steps (In Xcode GUI)

### 1. Select Destination
- **Look at the top-left** of Xcode window
- You'll see: `mobile > [Some Device]`
- **Click on** `[Some Device]` dropdown
- **Select**: Any iOS Simulator (iPhone 14 Pro, iPhone 15, etc.)
  - Tip: If you don't see simulators, select "Add Additional Simulators..." and download one

### 2. Start Build
- Press **⌘ + R** (Command + R)
- OR Click the **Play ▶️** button in top-left
- Build progress shows in top center

### 3. Wait for Build (5-10 minutes first time)
You'll see progress like:
```
Building... (X tasks)
Compiling X of Y files...
Linking...
Running...
```

### 4. App Launches
- Simulator will open automatically
- App installs and launches
- You'll see the Login screen

### 5. Start Metro (In Terminal)
Once app is running in simulator:
```bash
cd /Users/mic/docode/jk/mobile
npx expo start --dev-client
```

The app will connect to Metro and reload with your latest code.

## 🎯 What to Expect

### During Build:
- First build: **5-15 minutes** (compiles all dependencies)
- Progress bar in Xcode
- Many "Compiling..." messages (normal)

### After Build:
- **Simulator launches** automatically
- **App icon** appears on home screen
- **App opens** to Login screen
- **Metro connects** (after you run `npx expo start --dev-client`)

### In The App:
- Login with Keycloak works
- Navigate to **Map** screen
- **Real MapLibre map renders!** (not fallback)
- Can download offline maps
- Camera and OCR work natively

## ⚠️ Common Issues & Solutions

### "No signing certificate"
1. In Xcode: Click project name (mobile) in left sidebar
2. Click "mobile" target
3. Go to "Signing & Capabilities" tab
4. Check "Automatically manage signing"
5. Select your Team (Apple ID)

### "Build Failed" with errors
1. **Product → Clean Build Folder** (⌘ + Shift + K)
2. Try building again (⌘ + R)

### "Simulator doesn't appear"
1. **Xcode → Settings → Platforms**
2. Download iOS simulator runtime if needed
3. Restart Xcode

### Build is stuck/hanging
1. Stop build: **⌘ + .** (Command + Period)
2. Clean: **⌘ + Shift + K**
3. Restart Xcode
4. Try again: **⌘ + R**

## 📊 Build Output

Watch the **top center** of Xcode for build status:
- ✅ "Running mobile on iPhone 14 Pro" = Success!
- ⚠️ Yellow warnings = OK to ignore (usually)
- ❌ Red errors = Need to fix (see troubleshooting)

## 🚀 After Successful Build

You now have a **Development Build** with:
- ✅ Real MapLibre maps (online & offline)
- ✅ Native Camera (VisionCamera)
- ✅ Native OCR (MLKit)
- ✅ All Expo Go features still work
- ✅ Authentication fully functional
- ✅ Fast hot reload with Metro

## Current Status

✅ **Xcode is open** with your project
🔄 **Ready to build** - Just press ⌘ + R!
📱 **Simulator ready** - Will launch automatically
🎯 **Goal**: Build with native MapLibre support

---

**Next Action**: In Xcode, press **⌘ + R** to start the build!
