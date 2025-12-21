# Mobile Automation Agent (Android Use)

This tool allows you to run automated QA scenarios on the AgriStack Mobile App using an AI Agent (powered by OpenAI GPT-4). It interacts with the Android device via ADB, using Accessibility Tree data instead of screenshots for speed and reliability.

## Prerequisites
1.  **Python 3.10+** installed.
2.  **Android Device/Emulator** connected with USB Debugging enabled.
3.  **ADB** installed and accessible in your PATH.
4.  **OpenAI API Key** set in environment (`OPENAI_API_KEY`).

## Setup

```bash
cd scripts/android-agent
pip install -r requirements.txt
```

## Usage

Run the agent with the interactive menu:

```bash
export OPENAI_API_KEY="sk-..."
python agent.py
```

### Modes
1.  **Interactive**: Type any goal (e.g., "Open Settings and turn on WiFi").
2.  **Operator Login**: Launches `com.agristack.mobile` and automates login.
3.  **Sync Data**: Launches `com.agristack.mobile` and automates sync.

> **Note**: This assumes you are running the **Development Build** (`npx expo run:android`). If using Expo Go, you may need to manually open the app first or adjust `agent.py`.

## Troubleshooting
- **ADB Error**: Ensure only one device is connected or set `ANDROID_SERIAL`.
- **Screen Dump Error**: Ensure the screen is on and unlocked.
- **Element Not Found**: The AI might hallucinate if the UI accessibility labels are missing. Check `src/components` to ensure `accessibilityLabel` props are set in React Native.
