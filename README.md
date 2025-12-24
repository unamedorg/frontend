# ⚡ EchoArena | Project Social

> **Next-Gen Flash Interaction Platform**
> *180 Seconds. Pure Connection. Zero Noise.*

EchoArena is a high-fidelity, polished, and rapid social interaction platform built with **Next.js 15+** and **Tailwind CSS**. It focuses on ephemeral, gamified chat sessions with a sleek, OLED-optimized dark aesthetic.

---

## 🚀 Vision & Core Mechanics

*   **⏱️ The 180s Rule**: Every interaction is strictly limited to 3 minutes.
*   **🎭 Identity Lock**: Profiles are hidden by default. Mutual consent (or "Vibe Check") is required to reveal social details.
*   **⚡ Velocity UI**: Glassmorphic elements, framer-motion animations, and highly responsive interactions.
*   **🛡️ Anti-Ghosting**: Built-in inactivity monitors and "Ghost Session" detection to ensure lively interactions.
*   **🌑 OLED-First**: Pure black design system (`#000000`) for maximum energy efficiency and visual impact on modern displays.

---

## 🛠️ Technology Stack

*   **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **Animations**: [Framer Motion](https://www.framer.com/motion/)
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **State**: React Context (WebSocket/Timer) + Zustand (Planned)
*   **Real-time**: Native WebSockets with robust reconnection logic.
*   **PWA**: `next-pwa` (Configuration pending).

---

## 📂 Project Structure

```bash
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout (Fonts: Outfit/Inter)
│   │   ├── page.tsx         # Landing Page (Hero + Entry)
│   │   └── arena/           # The Core Game Loop
│   │       └── page.tsx     # Game Controller & View
│   ├── components/
│   │   ├── arena/           # Game-specific components
│   │   │   ├── ChatInterface.tsx  # Floating bubbles, Activity Monitor
│   │   │   ├── CircularTimer.tsx  # Visual Countdown (Red/Pulse states)
│   │   │   ├── ScenarioCard.tsx   # Glassmorphic Topic Prompt
│   │   │   └── VibeCheck.tsx      # Mood Slider (-3 to 10)
│   │   ├── matchmaking/     # Searching/Matching UI
│   │   └── profile/         # Reveal Logic & Identity Card
│   └── providers/           # Global Contexts
│       ├── WebSocketProvider.tsx  # Socket management & heartbeat
│       └── TimerProvider.tsx      # Web Worker based countdown
├── public/                  # Static assets
└── next.config.ts           # Next.js configuration
```

---

## ⚙️ Configuration & Environment

The application detects the environment to determine the WebSocket backend URL.

### **1. Environment Configuration**
The application relies on environment variables for API and WebSocket connections.

1.  **Copy the example file**:
    ```bash
    cp .env.local.example .env.local
    ```
2.  **Edit `.env.local`** to match your environment:

    **For Local Development (Localhost:8080)**:
    Ensure the variables are *commented out* or empty. The app auto-detects localhost.
    ```env
    # NEXT_PUBLIC_WS_URL=wss://backend-49yx.onrender.com/con/request
    # NEXT_PUBLIC_API_URL=https://backend-49yx.onrender.com
    ```

    **For Production (Cloud Server)**:
    Uncomment and set your backend URLs:
    ```env
    NEXT_PUBLIC_WS_URL=wss://your-backend.com/con/request
    NEXT_PUBLIC_API_URL=https://your-backend.com
    ```

### **2. PWA Settings**
Located in: `next.config.ts` & `public/manifest.json`
*   Ensure `manifest.json` has valid icons.
*   PWA is configured to be "installable" on iOS (Add to Home Screen) and Android.

---

## 🖥️ Local Development Guide

Follow these steps to run the frontend locally.

### Prerequisites
*   Node.js 18+ installed.
*   A running backend instance (Local Go Server on port 8080 or a remote URL).

### Steps
1.  **Clone & Install**:
    ```bash
    git clone <repo_url>
    cd frontend
    npm install
    # or
    yarn install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Access the App**:
    *   Open `http://localhost:3000` in your browser.
    *   **Mobile Testing**: Connect your phone to the same Wi-Fi and open `http://<YOUR_PC_IP>:3000`.

---

## ☁️ Cloud / Production Deployment

This project is optimized for **Vercel**, **Netlify**, or **Render**.

### 1. Build for Production
Before deploying, verify the build passes locally:
```bash
npm run build
```
*This generates an optimized `.next` build folder.*

### 2. Deployment Instructions (Vercel Recommended)

1.  **Push to GitHub**: Commit your changes.
2.  **Import to Vercel**:
    *   Go to Dashboard > Add New Project.
    *   Select the `frontend` folder as the **Root Directory**.
    *   Framework Preset: **Next.js**.
3.  **Environment Variables**:
    *   If you refactor the WS URL to use env vars (recommended), add `NEXT_PUBLIC_WS_URL` here.
    *   Value: `wss://backend-49yx.onrender.com/con/request`
4.  **Deploy**: Click Deploy.

### 3. Server-Side Configuration (Nginx/Custom VPS)
If hosting on a VPS or strictly static export:
*   Ensure your `next.config.ts` is set up for `output: 'export'` (if using static mode only) OR run with `npm start` for the Node server.
*   **SSL/HTTPS**: Essential for PWA service workers and secure WebSocket (`wss://`) connections.

---

## 🐛 Troubleshooting

### Common Issues

**1. "Connecting..." forever (WebSocket Failure)**
*   **Cause**: The frontend cannot reach the backend.
*   **Fix (Local)**: Ensure your Go backend is running on port `8080`.
*   **Fix (Cloud)**: Ensure you are using `wss://` (Secure) not `ws://` if the site is HTTPS. Check `WebSocketProvider.tsx`.

**2. Mobile Disconnects on Screen Off**
*   **Cause**: Mobile browsers throttle JavaScript in background.
*   **Solution**: The `TimerProvider` uses a Web Worker (which runs in a separate thread) to keep the countdown accurate. Reconnection logic in `WebSocketProvider` handles "waking up".

**3. "App not installing" (PWA)**
*   **Cause**: Missing SSL (localhost is exempt) or invalid manifest.
*   **Fix**: Check Chrome DevTools > Application > Manifest for errors.

---

## 🤝 Contribution Guidelines
1.  **Branching**: Use `feature/feature-name` or `fix/issue-name`.
2.  **Style**: Stick to the Tailwind utility-first approach. Avoid custom CSS classes unless necessary for complex animations.
3.  **Components**: Keep components focused. Large components should be split.

---

*System_Ready // v2.0*
