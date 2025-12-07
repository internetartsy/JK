# 🎨 UI Design System: Black & White Glass

**Status**: ✅ Implemented in Mobile App  
**Type**: Minimalist Monochromatic Glassmorphism  
**Theme**: Dark Mode First

---

## 1. Overview

The application utilizes a premium **Black & White Glass** design system. It eschews colorful gradients in favor of high-contrast monochrome elements, subtle blur effects, and deep black backgrounds.

**Key Characteristics:**
- **Palette**: Pure Black (`#000000`), Pure White (`#FFFFFF`), and Greyscale.
- **Surface**: Translucent glass cards with blur intensity 15-30.
- **Typography**: Clean, bold headers with uppercase labels.
- **Hierarchy**: White accents for primary actions against dark backgrounds.

---

## 2. Technical Implementation (`GlassUI.tsx`)

### Color System
The theme relies on a structured monochrome palette:
```typescript
export const MonochromeTheme = {
  colors: {
    black: '#000000',      // Backgrounds
    white: '#FFFFFF',      // Text, Primary Buttons
    gray: {
      200: '#E5E5E5',      // Light Borders
      500: '#737373',      // Secondary Text
      800: '#262626',      // Dark Borders
      900: '#171717',      // Deep Backgrounds
    },
    glassBlack: {
      medium: 'rgba(0, 0, 0, 0.2)', // Dark Glass
    }
  }
}
```

### Core Components

#### `GlassBackground`
- **Usage**: Main screen wrapper.
- **Style**: Full screen, typically dark (`#000000`).

#### `GlassCard`
- **Usage**: Containers for data (Parcels, Login Box).
- **Style**:
  - Border: 1px solid (`gray[800]` in dark mode).
  - Background: Semi-transparent black with Blur.
  - Shadow: Soft drop shadow.

#### `GlassButton`
- **Variants**:
  - `white`: Solid white background, black text (Primary CTA).
  - `black`: Solid black background, white text.
  - `ghost`: Transparent with blur and border.

#### `GlassHeader`
- **Usage**: Top navigation bar.
- **Style**: High blur intensity (30), border bottom.

---

## 3. Screen Layouts

### Login Screen
- **Background**: Deep black.
- **Elements**: 
  - Large White Title ("AgriStack").
  - Central Glass Card for login form.
  - White "Sign in" button for maximum contrast.

### Dashboard
- **Header**: Glass sticky header.
- **Quick Actions**: Row of white-background cards ("Map", "Add", "Camera").
- **List**: Scrollable list of dark glass parcel cards.
- **Badges**: High-contrast status pills (e.g., White text on Black).

---

## 4. Comparisons & Status

| Feature | Liquid Glass Spec (Deprecated) | B&W Glass (Implemented) |
|---------|-------------------------------|-------------------------|
| **Theme** | Colorful Gradients (Emerald/Purple) | Monochrome (Black/White) |
| **Buttons**| Gradient Fills | Solid White/Black |
| **Background**| Floating Orbs | Solid Dark |
| **Status** | ❌ Proposed Only | ✅ Live in Code |

---

## 5. Usage Guide

To use the design system in new screens:

```tsx
import { GlassBackground, GlassCard, GlassButton } from '../components/GlassUI';

export default function MyScreen() {
  return (
    <GlassBackground dark={true}>
      <GlassCard dark={true}>
        <Text style={{color: 'white'}}>Hello World</Text>
        <GlassButton title="Action" variant="white" onPress={...} />
      </GlassCard>
    </GlassBackground>
  );
}
```
