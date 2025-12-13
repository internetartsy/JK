#!/bin/bash
set -e

# Configuration
INSTALL_DIR="$HOME/.mobile_dev_env"
JAVA_DIR="$INSTALL_DIR/java"
ANDROID_DIR="$INSTALL_DIR/android"
SDK_ROOT="$ANDROID_DIR/sdk"

mkdir -p "$JAVA_DIR"
mkdir -p "$SDK_ROOT/cmdline-tools"

echo "🚀 Starting Sudo-less Android Setup for macOS (ARM64)..."

# 1. Install Java (Temurin 17) Locally
echo "☕ Downloading OpenJDK 17 (ARM64)..."
# URL for Temurin 17 macOS aarch64
JAVA_URL="https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9/OpenJDK17U-jdk_aarch64_mac_hotspot_17.0.9_9.tar.gz"
curl -L -o "$INSTALL_DIR/java.tar.gz" "$JAVA_URL"

echo "📦 Extracting Java..."
tar -xzf "$INSTALL_DIR/java.tar.gz" -C "$JAVA_DIR"
# Find the directory name (it varies)
JAVA_HOME_PATH=$(find "$JAVA_DIR" -maxdepth 2 -type d -name "Home" | head -n 1)

if [ -z "$JAVA_HOME_PATH" ]; then
    echo "❌ Failed to find Java Home in extracted files." 
    # Fallback search for Contents/Home structure usually
    JDK_ROOT=$(find "$JAVA_DIR" -maxdepth 1 -type d -name "jdk*")
    JAVA_HOME_PATH="$JDK_ROOT/Contents/Home"
fi

if [ ! -d "$JAVA_HOME_PATH" ]; then
    echo "❌ Java path invalid: $JAVA_HOME_PATH"
    exit 1
fi

export JAVA_HOME="$JAVA_HOME_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

echo "✅ Java Installed at: $JAVA_HOME"
java -version

# 2. Install Android Command Line Tools
echo "🤖 Downloading Android Command-line Tools..."
CMDLINE_URL="https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip"
curl -L -o "$INSTALL_DIR/cmdline.zip" "$CMDLINE_URL"

echo "📦 Extracting Android Tools..."
unzip -q -o "$INSTALL_DIR/cmdline.zip" -d "$SDK_ROOT/cmdline-tools"
# Rename 'cmdline-tools' content to 'latest' requirement for sdkmanager
mv "$SDK_ROOT/cmdline-tools/cmdline-tools" "$SDK_ROOT/cmdline-tools/latest"

export ANDROID_HOME="$SDK_ROOT"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

echo "✅ Android Tools Installed."

# 3. Install SDK Packages
echo "📝 Accepting Licenses & Installing Packages..."
# Install platform-tools, emulator, platforms, and system image
yes | sdkmanager --licenses > /dev/null
echo "⬇️ Downloading System Image (This is Large ~1.5GB)..."
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "emulator" "system-images;android-34;google_apis;arm64-v8a"

echo "✅ SDK Packages Installed."

# 4. Create AVD
echo "📱 Creating Virtual Device (AVD)..."
# Delete existing if any
avdmanager delete avd -n Pixel_API_34 || true
echo "no" | avdmanager create avd -n Pixel_API_34 -k "system-images;android-34;google_apis;arm64-v8a" --device "pixel" --force

echo "✅ AVD 'Pixel_API_34' Created!"

echo "---------------------------------------------------"
echo "🎉 SETUP COMPLETE!"
echo "To use this environment permanently, add these lines to ~/.zshrc:"
echo ""
echo "export JAVA_HOME=\"$JAVA_HOME\""
echo "export ANDROID_HOME=\"$ANDROID_HOME\""
echo "export PATH=\"\$JAVA_HOME/bin:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$PATH\""
echo "---------------------------------------------------"
