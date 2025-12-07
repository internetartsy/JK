# 🧪 MOBILE APP TESTING GUIDE

## Current Issue Fixed: Expired Refresh Token

**Error you saw**: `Invalid refresh token`  
**Cause**: Tokens stored from previous session expired  
**Fix**: Fresh login required - app will prompt you to login again

---

## 📱 TESTING STARTED - Follow This Guide

### Current Status
- ✅ **Metro Bundler**: Running on port 8081
- ✅ **iOS Simulator**: iPhone 14 Pro opening
- ✅ **App**: Loading in Expo Go
- ✅ **Backend**: Running (5 parcels ready)
- ✅ **Keycloak**: Running and ready

---

## 🎯 STEP-BY-STEP TESTING

### Step 1: Initial App Launch (NOW)

**What's happening**:
- Simulator is opening
- Expo Go loads the app
- App checks for stored token
- Finds expired token
- Shows **LoginScreen**

**Expected**: Clean login screen with:
- "AgriStack" title
- "Land Records System" subtitle
- "Sign in with Keycloak" button

---

### Step 2: Authentication Test

**Action**: Tap **"Sign in with Keycloak"** button

**What happens**:
1. Browser/Safari opens
2. Shows Keycloak login page
3. URL: `http://localhost:8080/realms/agristack/...`

**Enter**:
- Username: `admin`
- Password: `admin`

**Tap**: Login button

**Expected**: 
- Browser redirects to `exp://192.168.1.11:8081/--/oauthredirect`
- App captures the auth code
- Exchanges code for new tokens (PKCE)
- Stores tokens in Keychain
- Shows main dashboard

**Check Metro logs for**:
```
LOG  Initiating Auth Session with PKCE...
LOG  Code received, exchanging for token with PKCE...
LOG  Token refreshed
LOG  Database initialized
```

---

### Step 3: Dashboard Testing

**Expected to see**:
- ✅ Title: "Land Records"
- ✅ Subtitle: "Ready" (or "Synced")
- ✅ Two action buttons in top-right:
  - Sync button (↻)
  - Logout button (⏻)
- ✅ Three white action cards:
  - **Map**
  - **Add Parcel**
  - **Camera**
- ✅ Section: "Parcels" with badge showing count
- ✅ List of 5 parcels (after sync)

**Test Actions**:
1. **Tap Sync (↻)** → Should fetch 5 parcels from backend
2. **Check parcel list** → Should show 5 items
3. **Scroll through parcels** → Should see smooth scrolling

---

### Step 4: Map View Test

**Action**: Tap **"Map"** card

**Expected**:
- New screen opens
- Header shows "Map" with back arrow (←)
- Content shows: "Map Not Supported in Expo Go"
- Message explains native module needed

**Reason**: MapLibre requires Development Build (not error!)

**Action**: Tap **←** to go back

---

### Step 5: Add Parcel Test

**Action**: Tap **"Add Parcel"** card

**Expected**:
- New screen opens
- Header shows "Add Parcel" with back arrow
- Form to capture parcel data
- Mock camera interface (black placeholder)

**Test**:
1. Tap "Capture" if shown
2. Mock photo taken
3. Check if OCR mock data appears
4. Can fill form fields

**Action**: Tap **←** to go back

---

### Step 6: Camera Test

**Action**: Tap **"Camera"** card

**Expected**:
- Camera screen opens
- Shows mock camera (black screen)
- "Capture" button exists

**Note**: Real camera requires Development Build

**Action**: Go back to dashboard

---

### Step 7: Parcel Sync Verification

**Check each parcel card shows**:
- Khasra number (e.g., "123/45")
- Village ID
- Status badge ("synced" or other)
- Details like village and status

**Sample parcel**:
```
123/45
Village: V-001
Status: active
Badge: synced (light color)
```

---

### Step 8: Logout Test

**Action**: Tap **Logout (⏻)** button

**Expected**:
1. Tokens cleared from Keychain
2. Returns to LoginScreen
3. Ready for another login

**Verify**: See LoginScreen again

---

### Step 9: Re-Login Test

**Action**: Tap **"Sign in with Keycloak"** again

**Expected**:
- Same login flow works
- Can login with admin/admin
- Returns to dashboard
- Data still there (SQLite persisted)

---

## ✅ COMPLETE TEST CHECKLIST

### Authentication ✓
- [ ] LoginScreen appears
- [ ] Tap "Sign in with Keycloak"
- [ ] Browser opens to Keycloak
- [ ] Login with admin/admin
- [ ] Redirect back to app works
- [ ] Dashboard appears
- [ ] Metro shows PKCE logs
- [ ] No errors in console

### Dashboard ✓
- [ ] Title "Land Records" visible
- [ ] Sync and Logout buttons present
- [ ] Three action cards (Map, Add Parcel, Camera)
- [ ] "Parcels" section visible
- [ ] Badge shows count

### Data Sync ✓
- [ ] Tap sync button
- [ ] See "Syncing..." status
- [ ] Changes to "Synced ✓"
- [ ] 5 parcels appear in list
- [ ] Each parcel shows details

### Navigation ✓
- [ ] Can tap Map → see fallback → back
- [ ] Can tap Add Parcel → see form → back
- [ ] Can tap Camera → see mock → back
- [ ] Back buttons work
- [ ] No crashes

### Logout/Login ✓
- [ ] Logout returns to LoginScreen
- [ ] Can login again
- [ ] Dashboard loads
- [ ] Data still present

---

## 🐛 KNOWN BEHAVIORS (Not Errors!)

### Expected Messages

**1. MapLibre Fallback**
```
ERROR Native module of @maplibre/maplibre-react-native...
LOG MapLibreGL native module not available, using fallback
```
✅ **Normal** → Shows placeholder in Expo Go

**2. SecureStore Warning**
```
WARN Value being stored in SecureStore is larger than 2048 bytes...
```
✅ **Normal** → JWT tokens are large, still works fine

**3. Offline Manager**
```
LOG MapLibre Offline Manager not available, using mock
```
✅ **Normal** → Mock download functionality in Expo Go

---

## ❌ ACTUAL ERRORS TO REPORT

### If You See These, Let Me Know

**1. Network Errors**
```
ERROR Network request failed
ERROR Connection refused
```
→ Backend connectivity issue

**2. Auth Errors (New)**
```
ERROR 401 Unauthorized
ERROR Invalid client
```
→ Keycloak configuration issue

**3. Crashes**
- App closes unexpectedly
- Red error screen
- "Something went wrong"

---

## 📊 SUCCESS CRITERIA

### You'll know it's working when:

1. ✅ **Login** → Keycloak browser flow completes
2. ✅ **Dashboard** → Shows all UI elements
3. ✅ **Sync** → Fetches 5 parcels
4. ✅ **Parcels** → List displays with details
5. ✅ **Navigation** → Can visit all screens
6. ✅ **Logout** → Returns to login
7. ✅ **Re-login** → Works again

### Metro Logs Should Show:
```
✅ LOG  Initiating Auth Session with PKCE...
✅ LOG  Code received, exchanging for token with PKCE...
✅ LOG  Token refreshed
✅ LOG  Database initialized
✅ LOG  Starting Push Sync...
✅ LOG  Starting Pull Sync...
✅ LOG  Pulled 5 parcels and 0 persons
```

---

## 🔧 IF SOMETHING GOES WRONG

### Quick Fixes

**App won't load**:
```bash
# Restart Metro
cd /Users/mic/docode/jk/mobile
npx expo start --clear
```

**Login fails**:
```bash
# Check Keycloak
docker logs land_records_keycloak --tail 50
# Restart if needed
docker-compose restart keycloak
```

**Sync fails**:
```bash
# Check backend
curl http://localhost:80/api/v1/parcels/
# Should return 5 parcels
```

**Simulator issues**:
```bash
# Reopen app
xcrun simctl openurl booted exp://localhost:8081
```

---

## 📱 CURRENT TEST SESSION

**Started**: Now  
**Simulator**: iPhone 14 Pro  
**Metro**: Port 8081  
**Expected**: Fresh login required (tokens expired)  

**Next Step**: Check simulator - should show LoginScreen!

---

## 🎓 WHAT THIS TESTS

This testing session verifies:
- ✅ PKCE OAuth authentication with Keycloak
- ✅ Token storage in iOS Keychain
- ✅ Backend API connectivity
- ✅ Data sync (pull from backend)
- ✅ SQLite local database
- ✅ UI/UX responsiveness
- ✅ Navigation flows
- ✅ Logout/login cycle
- ✅ Error handling (expired tokens)

---

**Check your iPhone 14 Pro Simulator NOW!**  
**You should see the clean LoginScreen ready for testing!** 🚀

---

*Generated for testing session: December 7, 2025*
