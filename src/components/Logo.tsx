"use client";

import { motion } from "framer-motion";
import { memo } from "react";

export const Logo = memo(function Logo({ className, size = "md" }: { className?: string, size?: "sm" | "md" | "lg" }) {
    const scale = size === "lg" ? "scale-100" : size === "sm" ? "scale-75" : "scale-100";
    const textSize = size === "lg" ? "text-5xl md:text-8xl lg:text-[10rem]" : size === "sm" ? "text-xl" : "text-4xl";
    const minHeight = size === "lg" ? "min-h-[4rem] md:min-h-[10rem]" : size === "sm" ? "min-h-[1.25rem] md:min-h-[1.5rem]" : "min-h-[2.5rem]";

    return (
        <div className={`relative flex flex-col items-center ${scale} ${className} ${minHeight} justify-center overflow-visible`}>
            <motion.h1
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                className={`${textSize} font-display font-black flex items-baseline select-none tracking-tighter h-full`}
            >
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40">
                    Connectree
                </span>
            </motion.h1>
            {size === "lg" && (
                <div className="absolute -bottom-4 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent blur-sm" />
            )}
        </div>
    );
});
