# Mobile App SSO Authentication - Status & Testing Guide

## ✅ Completed Implementation

### 1. **Backend & Infrastructure**
- ✅ Keycloak running on port 8080
- ✅ Backend API running on port 8000  
- ✅ Nginx reverse proxy on port 80
- ✅ All services healthy and accessible

### 2. **Keycloak Configuration**
- ✅ `agristack` realm configured
- ✅ `agristack-mobile` client created
- ✅ Redirect URIs configured:
  - `agristack://oauthredirect`
  - `exp://192.168.1.11:8081`
  - `exp://127.0.0.1:8081/*`
  - `exp://localhost:8081/*`
  - `exp://*`
- ✅ Test users: `admin`/`admin`, `scout`/`scout`

### 3. **Mobile App (Expo Go Compatible)**
- ✅ `expo-auth-session` for OAuth flow
- ✅ `expo-secure-store` for token storage (Keychain)
- ✅ Token auto-refresh logic
- ✅ Logout functionality
- ✅ Auth state management

### 4. **Mocked Native Modules** (for Expo Go)
- ✅ MapLibre → Placeholder
- ✅ Vision Camera → Mock capture
- ✅ MLKit OCR → Sample data
- ✅ Offline Maps → Simulated downloads

## 🔍 Current Issue: Auth Redirect

The login flow opens Keycloak correctly, but the redirect back to Expo Go fails with "Login cancelled or failed".

### Root Cause Analysis

**Problem**: The `expo-auth-session` with `WebBrowser.openAuthSessionAsync()` is not properly completing the OAuth callback in the iOS Simulator.

**Why**: 
1. After Keycloak redirects to `exp://127.0.0.1:8081/--/oauthredirect`
2. The Expo Go app should intercept this URL
3. But the auth session isn't completing (likely a timing/registration issue)

## 🔧 Troubleshooting Steps

### Option 1: Test with Manual Token (Bypass OAuth for Now)

```typescript
// In LoginScreen.tsx - temporarily bypass OAuth
const handleLogin = async () => {
  setLoading(true);
  try {
    // Skip real OAuth, set mock state
    await AuthService.setAuthState({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresIn: 3600,
      issuedAt: Date.now() / 1000,
    });
    onLoginSuccess();
  } catch (e) {
    setError('Login failed');
  } finally {
    setLoading(false);
  }
};
```

This lets you test the rest of the app flow while OAuth is being debugged.

### Option 2: Use Development Build (Recommended for Production)

The native `react-native-app-auth` works more reliably than `expo-auth-session`:

```bash
cd mobile

# Install dependencies
npm install react-native-app-auth

# Prebuild (creates native ios/android folders)
npx expo prebuild

# Build and run on simulator
npx expo run:ios --device "iPhone 14 Pro"
```

**Note**: You'll need to switch back to using the `react-native-app-auth` implementation we created initially.

### Option 3: Debug Expo Go Redirect

Add more logging to see what's happening:

```typescript
// In AuthService.ts -> login()
console.log('Auth URL:', authUrl);
console.log('Opening browser...');

const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

console.log('Browser result:', JSON.stringify(result, null, 2));
```

## 📱 How to Test (Current Expo Go Setup)

1. **Start Metro**:
   ```bash
   cd /Users/mic/docode/jk/mobile
   npx expo start
   ```

2. **Open in Simulator**:
   ```bash
   xcrun simctl openurl A9155F81-E4EC-4EFD-8B3B-6C3A43F7E165 exp://localhost:8081
   ```

3. **Test Login**:
   - Tap "Login with Keycloak"
   - Browser opens → Login with `admin`/`admin`
   - Should redirect back (currently failing here)

## 🎯 Next Steps

### Immediate (To unblock testing):
1. Use manual token injection (Option 1) to test the rest of the app
2. Verify sync, database, and other features work

### For Production:
1. Create Development Build with `expo prebuild`
2. Use `react-native-app-auth` instead of `expo-auth-session`
3. Build native iOS/Android apps

## 🔐 Security Notes

- ✅ Tokens stored in Keychain (secure)
- ✅ PKCE flow supported by Keycloak
- ✅ Refresh tokens for long sessions
- ⚠️  SSL should be enabled in production (current: `sslRequired: "external"`)

## 📋 Environment Configuration

```bash
# Backend
Backend API: http://localhost:8000
Nginx Proxy: http://localhost:80

# Keycloak
URL: http://localhost:8080
Realm: agristack
Client: agristack-mobile
```

## ✅ What Works Now

- App loads in Expo Go
- Database initialized
- Sync service ready
- Mock features (Camera, OCR, Maps) functional
- Auth flow opens Keycloak correctly

## ⚠️  What Needs Fixing

- OAuth redirect completion in Expo Go
- Consider switching to Development Build for full native support
