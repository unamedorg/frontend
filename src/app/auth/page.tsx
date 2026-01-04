"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, Instagram, Linkedin } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Suspense } from "react";

import { AuthBackground } from "@/components/auth/AuthBackground";
import { Logo } from "@/components/Logo";

function AuthContent() {
    const { user: authUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState<"login" | "onboarding" | "loading">("loading");
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Mode from URL - although we mainly use Google now
    const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && authUser) {
            router.push("/");
        } else if (!authLoading) {
            setStep("login");
        }
    }, [authUser, authLoading, router]);

    // Form State for onboarding
    const [instagram, setInstagram] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [filter, setFilter] = useState("random");

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const currentUser = result.user;
            setUser(currentUser);
            await checkProfileExistence(currentUser);
        } catch (err: any) {
            console.error("Login Failed", err);
            setError("Failed to sign in with Google. Please try again.");
            setLoading(false);
        }
    };

    const checkProfileExistence = async (currentUser: User) => {
        try {
            const token = await currentUser.getIdToken();
            const apiUrl = config.getApiUrl();

            const res = await fetch(`${apiUrl}/con/profile/exists`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) throw new Error("Failed to check profile");

            const data = await res.json();

            if (data.exists) {
                router.push("/");
            } else {
                setStep("onboarding");
                setLoading(false);
            }
        } catch (err) {
            console.error("Profile Check Failed", err);
            setError("Connection error. Please check your network.");
            setLoading(false);
        }
    };

    const handleRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            const token = await user.getIdToken(true);
            const apiUrl = config.getApiUrl();

            localStorage.setItem("arena_filter", filter);

            let finalLinkedin = linkedin;
            if (finalLinkedin && !finalLinkedin.startsWith("http")) {
                finalLinkedin = `https://www.linkedin.com/in/${finalLinkedin}`;
            }

            const res = await fetch(`${apiUrl}/con/profile-create`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    instagram: instagram || undefined,
                    linkedin: finalLinkedin || undefined,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Registration failed");
            }

            router.push("/");
        } catch (err: any) {
            console.error("Registration Failed", err);
            setError(err.message || "Failed to create profile.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 font-body text-white relative overflow-hidden">
            <AuthBackground />

            {/* Top Logo - Fixed at top for continuity */}
            <div className="absolute top-12 z-20">
                <Logo size="sm" />
            </div>

            <div className="relative z-10 w-full max-w-md mt-12">
                <AnimatePresence mode="wait">
                    {step === "login" && (
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="bg-neutral-900/40 backdrop-blur-2xl border border-white/5 p-10 rounded-3xl shadow-2xl relative overflow-hidden group"
                        >
                            {/* Inner Glow Background */}
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-[80px]" />
                            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-600/10 rounded-full blur-[80px]" />

                            <div className="text-center mb-10">
                                <h1 className="font-display text-4xl font-bold mb-3 tracking-tight">
                                    Initiate Session
                                </h1>
                                <p className="text-neutral-400 text-sm tracking-wide">
                                    Authenticate via the secure uplink to proceed.
                                </p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs"
                                >
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-6">
                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="relative w-full group overflow-hidden bg-white text-black hover:bg-neutral-100 transition-all duration-300 font-bold py-4 px-6 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                                <path
                                                    fill="currentColor"
                                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                />
                                                <path
                                                    fill="currentColor"
                                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                />
                                                <path
                                                    fill="currentColor"
                                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                                />
                                                <path
                                                    fill="currentColor"
                                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                />
                                            </svg>
                                            <span className="tracking-wide">Sign in with Google</span>
                                        </>
                                    )}
                                </button>

                                <div className="text-center pt-4">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-mono">
                                        End-to-end encrypted // Secure Access
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === "onboarding" && (
                        <motion.div
                            key="onboarding"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="bg-neutral-900/40 backdrop-blur-2xl border border-white/5 p-10 rounded-3xl shadow-2xl relative"
                        >
                            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-600/10 rounded-full blur-[80px]" />

                            <div className="text-center mb-8">
                                <h1 className="font-display text-3xl font-bold mb-2 tracking-tight line-clamp-1">
                                    Match Identity
                                </h1>
                                <p className="text-neutral-400 text-sm tracking-wide">
                                    Finalize your agent profile
                                </p>

                                {user && (
                                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5 mt-8 text-left">
                                        <div className="relative">
                                            {user.photoURL && <img src={user.photoURL} alt="User" className="w-12 h-12 rounded-full border border-white/10" />}
                                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border border-black">
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="text-white font-bold text-sm truncate">{user.displayName}</div>
                                            <div className="text-neutral-500 text-[10px] font-mono truncate">{user.email}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleRegistration} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Instagram Handle</label>
                                    <div className="relative group">
                                        <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="@username"
                                            value={instagram}
                                            onChange={(e) => setInstagram(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none focus:border-white/20 focus:bg-white/10 transition-all placeholder:text-neutral-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">LinkedIn Profile</label>
                                    <div className="relative group">
                                        <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="linkedin.com/in/..."
                                            value={linkedin}
                                            onChange={(e) => setLinkedin(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none focus:border-white/20 focus:bg-white/10 transition-all placeholder:text-neutral-700"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5 mt-4">
                                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1 mb-3 block">Deployment Sector</label>
                                    <select
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 px-4 text-sm outline-none focus:border-white/20 focus:bg-white/10 transition-all text-neutral-300 appearance-none"
                                    >
                                        <option value="random">🎲 Global Sector (Random)</option>
                                        <optgroup label="Colleges">
                                            <option value="iit">IIT</option>
                                            <option value="nit">NIT</option>
                                            <option value="vit">VIT</option>
                                            <option value="bits">BITS</option>
                                        </optgroup>
                                        <optgroup label="Metros">
                                            <option value="mumbai">Mumbai</option>
                                            <option value="pune">Pune</option>
                                            <option value="bangalore">Bangalore</option>
                                            <option value="delhi">Delhi</option>
                                        </optgroup>
                                        <optgroup label="Industrial">
                                            <option value="tcs">TCS</option>
                                            <option value="infosys">Infosys</option>
                                            <option value="wipro">Wipro</option>
                                            <option value="startup">Startup</option>
                                        </optgroup>
                                    </select>
                                </div>

                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] text-center uppercase tracking-widest">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-white text-black hover:bg-neutral-100 font-black py-4 px-6 rounded-2xl disabled:opacity-50 transition-all flex items-center justify-center gap-3 mt-4 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>COMPLETE UPLINK <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Info Bar for continuity */}
            <div className="absolute bottom-12 flex items-center gap-8 text-[9px] font-mono uppercase tracking-[0.3em] text-neutral-700">
                <span>Latency: 12ms</span>
                <span className="hidden sm:inline">Auth: Firebase_SSO</span>
                <span>Ver 2.1.0</span>
            </div>
        </div>
    );
}


export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        }>
            <AuthContent />
        </Suspense>
    );
}
