# 🧪 MANUAL TESTING CHECKLIST
**Session**: 2025-12-07

## 🚀 Setup
- **Simulator**: iPhone 14 Pro
- **App**: Expo Go (Mock Mode)
- **User**: `admin` / `admin`

---

## 1️⃣ Login Flow
- [ ] Launch Setup: `npx expo start` (Done)
- [ ] **Action**: Tap "Sign in with Keycloak"
- [ ] **Verify**:
  - Browser opens `localhost:8080/realms/agristack/...`
  - Login page loads
  - Enter instructions: `admin` / `admin`
  - Redirects back to Dashboard

## 2️⃣ Dashboard & Sync
- [ ] **Action**: Look at "Parcels" list
- [ ] **Action**: Tap Sync Button (Top Right ↻)
- [ ] **Verify**:
  - Spinner appears
  - "Synced" message appears
  - List shows **5 Parcels**
  - **Metro Logs**: "Pulled 5 parcels"

## 3️⃣ Map Feature (Mocked)
- [ ] **Action**: Tap "Map" card
- [ ] **Verify**:
  - Shows "Map Not Supported in Expo Go" warning
  - Back button works

## 4️⃣ Add Parcel (Mocked Camera)
- [ ] **Action**: Tap "Add Parcel"
- [ ] **Action**: Tap "Capture Image"
- [ ] **Verify**:
  - Mock Camera (black screen) appears
  - Tap "Capture" button
  - Returns sample OCR data ("Khasra: 123")
  - Form fields auto-filled
  - "Submit" button saves data

## 5️⃣ Logout
- [ ] **Action**: Tap Power Button (Top Right ⏻)
- [ ] **Verify**:
  - Returns to Login Screen
  - Cannot go back to Dashboard without login

---

## ❌ Troubleshooting

**Login loops back to login screen?**
- Means token wasn't stored. Check Metro logs for "Login failed".

**"Network request failed"?**
- Backend is down. Run `docker-compose restart backend`.

**App crashes?**
- Simulator issue. Restart simulator.

---
**Ready to start!**
