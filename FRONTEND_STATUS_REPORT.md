# Frontend Development Status & Roadmap

## 1. What is the Frontend?
The **Frontend** (`/frontend`) is the **Desktop PWA (Progressive Web App)** designed for administrators and back-office staff. 
- **Role**: Web Landing Page & Map Management Dashboard.
- **Technology**: React + Vite + Tailwind CSS.
- **URL**: `http://localhost:5173` (Dev)

It is **NOT** the Native Mobile App (`/mobile`), which handles field operations using Expo/React Native.

---

## 2. Current Frontend Developments & Components

### Existing Components (Verified)
The PWA currently consists of a clean "Shell" architecture:
1.  **Sidebar** (`src/components/Sidebar.tsx`): Navigation menu (Dashboard, Upload Queue, Map View, Review Queue, Registry).
2.  **Header** (`src/components/Header.tsx`): Top bar with "Online System" status and User Profile.
3.  **MapView** (`src/components/MapView.tsx`): Placeholder for the MapLibre/Leaflet map integration.

### Hanging / In-Progress Developments
These features are referenced but not fully implemented in the current code snapshot:
- **MapLibre Logic**: The `MapView` exists but lacks the actual interactive map logic (Tile layers, Parcel polygons).
- **Auth Integration**: The `Sidebar` and `Header` are static; they do not yet consume the Keycloak/OIDC tokens.
- **API Data Fetching**: There are no active API calls to `localhost:8000` or `localhost:8001` to fetch Land Parcels or OCR results.

---

## 3. Frontend-to-Backend Connection

The Frontend connects to the backend services via HTTP/REST APIs.
- **Backend API**: `FastAPI` running on `localhost:8000`.
- **Admin Backend**: `Frappe` running on `localhost:8001`.

### Redirect Mechanism
- **Proxy Configuration**: `vite.config.ts` handles the redirection of API requests to avoid CORS issues.
    ```typescript
    // Example logic in vite.config.ts (needs to be added/verified)
    server: {
      proxy: {
        '/api': 'http://localhost:8000', // Redirects /api calls to FastAPI
        '/app': 'http://localhost:8001', // Redirects /app calls to Frappe
      }
    }
    ```

---

## 4. Frontend vs. Native Expo

| Feature | **Frontend (Web PWA)** | **Native Expo (Mobile)** |
| :--- | :--- | :--- |
| **Codebase** | `/frontend` | `/mobile` |
| **User** | Office Admin / Manager | Field Patwari / Surveyor |
| **Key Function** | Large Map Visualization, User Management, Bulk Review | Camera Capture, Offline Maps, GPS Tracking |
| **Tech** | React (DOM) | React Native (Native Widgets) |
| **Relation** | **Separate Project**. Does not share UI code directly with Mobile. | **Separate Project**. optimized for touch & offline. |

### "Thing to Native Expo related in the Front-end"
There is **NO DIRECT LINK**. The Frontend does not run Expo code. 
- However, they share the **Same Backend APIs** and **Design System Tokens** (Colors, Typography) conceptually, even if implemented in different CSS/Stylesheets.

---

## 5. Summary of Features (Target State)
The Frontend PWA will ultimately include:
1.  **OIDC Authentication**: Login screen redirecting to Keycloak.
2.  **Dashboard**: Stats on Total Parcels, Pending Reviews.
3.  **Review Queue**: Interface to correct OCR data side-by-side with document images.
4.  **Full Map**: Interactive map showing all digitised parcels with color-coding for status.
