"use client";

/**
 * AUTH BACKGROUND: Ambient Blur (No constrained nodes)
 * Replicates the "blue and blur" deep space feel.
 */

export function AuthBackground() {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Global Background Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/50 via-black to-black opacity-80" />

            {/* Noise Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />

            {/* Ambient Blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse duration-[4000ms]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse duration-[5000ms]" />

            {/* Center Depth */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,#000_100%)] opacity-60" />

            {/* Subtle Gradient Floor */}
            <div className="absolute bottom-0 inset-x-0 h-[30vh] bg-gradient-to-t from-blue-900/5 to-transparent opacity-40" />
        </div>
    );
}
