#!/bin/bash
set -e

echo "🔍 Checking for Homebrew..."
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew not found. Please install Homebrew first."
    exit 1
fi

echo "☕ Checking Java..."
if ! java -version &> /dev/null; then
    echo "⚠️ Java not working. Installing Temurin..."
    brew install --cask temurin
else
    echo "✅ Java seems to be working."
fi

# Try to set JAVA_HOME
if [ -x "/usr/libexec/java_home" ]; then
    export JAVA_HOME=$(/usr/libexec/java_home)
    echo "Set JAVA_HOME to $JAVA_HOME"
fi

echo "🤖 Checking Android Command-line Tools..."
if ! brew list --cask android-commandlinetools &> /dev/null; then
    echo "Installing Android Command-line Tools..."
    brew install --cask android-commandlinetools
else
    echo "✅ Android Command-line Tools already installed."
    # Reinstall to ensure links? No.
fi

export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

echo "📦 Installing Android SDK Packages..."
echo "📝 Accepting Licenses..."
yes | sdkmanager --licenses > /dev/null

echo "⬇️ Downloading Platforms & Tools..."
sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools"

echo "✅ Android SDK Setup Complete!"
echo "---------------------------------------------------"
echo "⚠️  ACTION REQUIRED: Update your environment variables"
echo "Run these commands in your terminal or add to ~/.zshrc:"
echo ""
echo "export JAVA_HOME=\"$JAVA_HOME\""
echo "export ANDROID_HOME=\"$ANDROID_HOME\""
echo "export PATH=\"\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH\""
echo "---------------------------------------------------"
