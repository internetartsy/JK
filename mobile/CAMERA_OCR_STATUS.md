# 📸 CAMERA & OCR FEATURES
**Status: MOCKED IN EXPO GO**

## ⚠️ Why is the camera black?
You are currently running the app in **Expo Go**.
- **Expo Go** includes a standard set of native libraries.
- The Camera (`react-native-vision-camera`) and OCR (`react-native-mlkit-ocr`) are **custom native libraries**.
- They **cannot run** inside the standard Expo Go app.

## ✅ What is working?
We have implemented **Mock Components**:
- **Camera Screen**: Shows a placeholder (black screen) with a capture button.
- **OCR Service**: Returns sample data when you tap capture.
- **Form Flow**: You can capture > see result > fill form > submit.

**This allows you to test the entire application logic without needing a native build.**

## 🛠️ How to get Real Camera?
To use the real camera, you must build a **Development Client**:

1.  **Fix Native Build Environment**:
    - The current environment has issues building `maplibre-react-native` (ScanDependencies error).
    - Requires troubleshooting CocoaPods/Xcode setup.

2.  **Use EAS Build (Recommended)**:
    - Run `eas build --profile development --platform ios`
    - This builds the app in the cloud (avoiding local errors).
    - Download and install the resulting binary on the simulator.

## 🎯 Recommendation for Now
**Continue testing with the Mocks.**
The logic is identical. Once the backend flow is verified, you can focus on the native build for the final release.
