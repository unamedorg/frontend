"use client";

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Home() {
  const router = useRouter();

  const handleMatch = () => {
    router.push('/arena');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center relative overflow-hidden bg-black text-white selection:bg-white selection:text-black">

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-900/40 via-black to-black opacity-60 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center text-center max-w-4xl px-6"
      >
        <span className="inline-block py-1 px-3 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400 mb-6 backdrop-blur-md">
          System Online
        </span>

        <h1 className="font-display text-7xl md:text-9xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-neutral-500">
          EchoArena
        </h1>

        <p className="font-body text-neutral-400 text-lg md:text-xl max-w-xl mb-12 tracking-wide leading-relaxed">
          The 180-second social experiment.<br />
          <span className="text-neutral-500 text-sm">Connect. Vibe. Reveal.</span>
        </p>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000" />
          <button
            onClick={handleMatch}
            className="relative px-12 py-5 bg-black border border-white/20 text-white rounded-full overflow-hidden transition-all hover:scale-105 hover:border-white/40 shadow-2xl"
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="font-display text-lg font-bold tracking-widest uppercase z-10 relative">Enter Arena</span>
          </button>
        </div>
      </motion.div>

      {/* Footer / Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 flex flex-col items-center gap-2"
      >
        <div className="w-px h-8 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        <div className="text-neutral-700 text-[10px] font-mono uppercase tracking-[0.3em]">
          v2.0 • Secure Uplink
        </div>
      </motion.div>
    </main>
  );
}
