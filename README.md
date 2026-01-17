# Connectree | Project Social

> **Next-Gen Flash Debate Platform**
> *4 Min 30 Sec. Pure Connection. Zero Noise.*

EchoArena is a high-fidelity, polished, and rapid social interaction platform built with **Next.js 16+** and **Tailwind CSS**. It focuses on ephemeral, gamified chat sessions with a sleek, OLED-optimized dark aesthetic.

---

## Vision & Core Mechanics

*   **The 4m 30s Rule**: Every interaction is strictly limited to 4 minutes 30 seconds, managed by a high-precision, synchronized timer.
*   **Identity Lock**: Profiles are hidden by default. Mutual consent (via a structured "Vibe Check" and "Reveal Decision" phase) is required to reveal social details.
*   **Velocity UI**: Glassmorphic elements, optimized framer-motion animations, and highly responsive interactions designed for "flow state."
*   **Anti-Ghosting**: Built-in inactivity monitors and "Ghost Session" detection ensure lively interactions.
*   **OLED-First**: Pure black design system (`#000000`) for maximum energy efficiency and visual impact on modern displays.

---

## Recent Updates & Changelog

### User Experience Enhancements
*   **Refined Arena Exit Flow**: Removed redundant navigation elements and introduced a polished "Abort Mission" modal with glassmorphism and subtle lighting effects.
*   **Modernized Reveal Card**: Completely redesigned the Reveal/Identity card to align with the Connectree aesthetic—sleeker typography, cleaner layout, and removal of placeholder profile pictures.
*   **Streamlined Navigation**: Removed distracting pulsing animations from the navigation bar for a stable visual experience.
*   **Optimized Auth Flow**: Simplified the login process by removing legacy email/password fields, focusing exclusively on Google SSO with a constellation-themed background.

### Core Logic & Reliability
*   **Strict Phase Management**: Implemented a robust, multi-stage post-chat flow (Vibe Check -> Reveal Decision -> Reveal Result) to prevent race conditions and ensure state synchronization.
*   **Profile Consistency**: Aligned the frontend profile update logic with the backend authenticator, ensuring accurate data persistence and optimistic UI updates for social links.
*   **Landing Page Redesign**: Migrated the landing page to a dedicated structure with a "Grok-like" high-performance design, featuring 3D mobile previews and a full-scale gradient logo.

### Performance Engineering
*   **Rendering Optimization**: Implemented `React.memo` across high-frequency components (`ChatInterface`, `ScenarioCard`) to decouple them from the global 1Hz timer tick, significantly reducing CPU usage.
*   **Mobile-First Tuning**:
    *   **Canvas Throttling**: The Starfield background now monitors screen size and throttles particle count on mobile devices to ensure stable 60FPS.
    *   **GPU Compositing**: Forced `will-change: transform` and `transform-gpu` heavily on background gradients (`CosmicBackground`) to offload rendering from the main thread.
    *   **Zero-Lag Input**: Enforced `touch-action: manipulation` globally to eliminate the 300ms tap delay.
*   **Network Efficiency**:
    *   **Dynamic Code Splitting**: Modals (`ProfileModal`, `FilterModal`) are now dynamically imported to reduce the initial JavaScript bundle size.
    *   **Asset Inlining**: Critical textures (like noise overlays) are inlined as Base64 Data URIs to eliminate network round-trips for LCP (Largest Contentful Paint).
*   **Build Stability**: Enabled Gzip compression, React Strict Mode, and tuned SWC minification for a robust production build.

---

## Technology Stack

*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **State Management**: React Context (WebSocket/Timer) + Component-Level Memoization
*   **Real-time**: Native WebSockets with robust reconnection and session recovery logic.
*   **Build Tooling**: Turbopack & SWC Minification.

---

## Project Structure

```bash
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (Fonts: Outfit/Inter)
│   │   ├── page.tsx           # Dashboard / Lobby
│   │   ├── auth/              # Google SSO Authentication
│   │   ├── landing-page/      # High-performance Marketing Landing Page
│   │   └── arena/             # The Core Game Loop
│   │       └── page.tsx       # Game Controller & View
│   ├── components/
│   │   ├── arena/             # Game-specific components
│   │   │   ├── ChatInterface.tsx  # Optimized Message List & Input
│   │   │   ├── SpinningTimer.tsx  # Visual Countdown
│   │   │   ├── ScenarioCard.tsx   # Glassmorphic Topic Prompt
│   │   │   └── VibeCheck.tsx      # Mood Slider
│   │   ├── matchmaking/       # Searching/Matching UI
│   │   └── profile/           # Reveal Logic & Identity Card
│   └── providers/             # Global Contexts
│       ├── WebSocketProvider.tsx  # Socket management & heartbeat
│       └── TimerProvider.tsx      # Web Worker based countdown
├── public/                    # Static assets
└── next.config.ts             # Next.js configuration (Gzip, Strict Mode)
```

---

## Configuration & Environment

The application dynamically detects the environment to configure the WebSocket backend URL.

### 1. Environment Configuration

1.  **Copy the example file**:
    ```bash
    cp .env.local.example .env.local
    ```
2.  **Edit `.env.local`**:

    **For Local Development**:
    Leave variables empty to allow localhost auto-detection.
    ```env
    # NEXT_PUBLIC_WS_URL=wss://backend-49yx.onrender.com/con/request
    # NEXT_PUBLIC_API_URL=https://backend-49yx.onrender.com
    ```

    **For Production**:
    Set your backend URLs:
    ```env
    NEXT_PUBLIC_WS_URL=wss://your-backend.com/con/request
    NEXT_PUBLIC_API_URL=https://your-backend.com
    ```

### 2. PWA Settings
Located in `next.config.ts` & `public/manifest.json`. The app is configured as an installable PWA for iOS and Android.

---

## Local Development Guide

### Prerequisites
*   Node.js 18+
*   Backend instance (Local Go Server or Remote)

### Steps
1.  **Clone & Install**:
    ```bash
    git clone <repo_url>
    cd frontend
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Access the App**:
    *   **Browser**: `http://localhost:3000`
    *   **Mobile Testing**: Connect via `http://<YOUR_PC_IP>:3000` on the same network.

---

## Cloud / Production Deployment

This project is optimized for **Vercel**, **Netlify**, or **Render**.

### 1. Build for Production
Verify the build passes locally before deploying:
```bash
npm run build
```
*This triggers the optimized SWC build process.*

### 2. Deployment Instructions (Vercel)
1.  **Push to GitHub**: Commit your changes.
2.  **Import to Vercel**: Select the `frontend` directory.
3.  **Variables**: Add `NEXT_PUBLIC_WS_URL` and `NEXT_PUBLIC_API_URL`.
4.  **Deploy**: The platform handles the rest.

---

## Branding & Design Guidelines

*   **Primary Color**: `#000000` (Pure Black)
*   **Accent Color**: `#3B82F6` (Electric Blue) & `#EF4444` (Alert Red)
*   **Typography**: Inter (UI) & Outfit (Headings)
*   **Philosophy**: "Less is More." Remove clutter, focus on the content and the user's connection.

---

*System_Ready // v2.1*
