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

function AuthContent() {
    const { user: authUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState<"login" | "onboarding" | "loading">("loading"); // Start as loading 
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Mode from URL
    const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
    const [authMode, setAuthMode] = useState<"signin" | "signup">(initialMode);

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && authUser) {
            router.push("/");
        } else if (!authLoading) {
            setStep("login");
        }
    }, [authUser, authLoading, router]);

    // Form State
    const [instagram, setInstagram] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [filter, setFilter] = useState("random");

    // Email/Pass State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");

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

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
            let currentUser: User;

            if (authMode === "signup") {
                if (!fullName) throw new Error("Please enter your name.");
                const result = await createUserWithEmailAndPassword(auth, email, password);
                currentUser = result.user;

                // Set Display Name & Default Photo
                await updateProfile(currentUser, {
                    displayName: fullName,
                    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`
                });

                // New user -> Force Onboarding
                setUser(currentUser);
                setStep("onboarding");
                setLoading(false);
            } else {
                const result = await signInWithEmailAndPassword(auth, email, password);
                currentUser = result.user;

                // Existing user -> Check Profile
                setUser(currentUser);
                await checkProfileExistence(currentUser);
            }

        } catch (err: any) {
            console.error("Auth Failed", err);
            if (err.code === 'auth/invalid-credential') {
                setError("Invalid email or password.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("Email is already registered.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            } else if (err.code === 'auth/operation-not-allowed') {
                setError("Email/Password sign-in is not enabled. Please use Google.");
            } else {
                setError(err.message || "Authentication failed. Try again.");
            }
            setLoading(false);
        }
    };

    const checkProfileExistence = async (currentUser: User) => {
        try {
            const token = await currentUser.getIdToken();
            const apiUrl = config.getApiUrl();

            // Note: If using a proxy in next.config.ts, this might be just "/con/profile/exists"
            // But assuming getApiUrl handles the base domain.
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
            // Force refresh token to ensure new display name/photo are in the JWT claims
            const token = await user.getIdToken(true);
            const apiUrl = config.getApiUrl();

            // Save filter preference to localStorage
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

            // Success
            router.push("/");
        } catch (err: any) {
            console.error("Registration Failed", err);
            setError(err.message || "Failed to create profile.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4 font-body text-white relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                <AnimatePresence mode="wait">
                    {step === "login" && (
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 rounded-2xl shadow-2xl"
                        >
                            <div className="text-center mb-6">
                                <h1 className="font-display text-3xl font-bold mb-2 tracking-tight">
                                    {authMode === "signin" ? "Welcome Back" : "Create Account"}
                                </h1>
                                <p className="text-neutral-400">
                                    {authMode === "signin" ? "Sign in to enter the Arena." : "Join the Arena today."}
                                </p>
                            </div>

                            {/* Config Warning */}
                            {/* @ts-ignore: key check */}
                            {auth.app.options.apiKey === "YOUR_API_KEY_HERE" && (
                                <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-3 text-orange-400 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>
                                        Firebase credentials missing. Please update <code>src/lib/firebase.ts</code>.
                                    </span>
                                </div>
                            )}

                            {error && (
                                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400 text-sm">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Email/Pass Form */}
                            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                                {authMode === "signup" && (
                                    <div className="space-y-1">
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-3 px-4 outline-none focus:border-neutral-500 transition-all placeholder:text-neutral-600 text-sm"
                                            required
                                        />
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-3 px-4 outline-none focus:border-neutral-500 transition-all placeholder:text-neutral-600 text-sm"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-3 px-4 outline-none focus:border-neutral-500 transition-all placeholder:text-neutral-600 text-sm"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === "signin" ? "Sign In" : "Sign Up")}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-neutral-800"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[#0a0a0a] px-2 text-neutral-500">Or continue with</span>
                                </div>
                            </div>


                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-neutral-200 transition-colors font-medium py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
                            >
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
                                <span>Google</span>
                            </button>

                            <div className="mt-6 text-center text-sm">
                                <span className="text-neutral-500">
                                    {authMode === "signin" ? "Don't have an account?" : "Already have an account?"}
                                </span>
                                <button
                                    onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
                                    className="ml-2 text-white hover:underline font-medium"
                                >
                                    {authMode === "signin" ? "Sign Up" : "Sign In"}
                                </button>
                            </div>

                        </motion.div>
                    )}

                    {step === "onboarding" && (
                        <motion.div
                            key="onboarding"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 p-8 rounded-2xl shadow-2xl"
                        >
                            <div className="text-center mb-8">
                                <h1 className="font-display text-2xl font-bold mb-2">Complete Profile</h1>
                                <p className="text-neutral-400 text-sm mb-6">Add your socials to connect with others.</p>

                                {user && (
                                    <div className="flex items-center gap-4 bg-neutral-800/30 p-3 rounded-xl border border-neutral-800 mb-6 text-left">
                                        {user.photoURL && <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full" />}
                                        <div className="flex-1">
                                            <div className="text-white font-bold text-sm">{user.displayName}</div>
                                            <div className="text-neutral-500 text-xs">{user.email}</div>
                                        </div>
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleRegistration} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-widest ml-1">Instagram</label>
                                    <div className="relative group">
                                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="username"
                                            value={instagram}
                                            onChange={(e) => setInstagram(e.target.value)}
                                            className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none focus:border-neutral-500 focus:bg-neutral-800 transition-all placeholder:text-neutral-600"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-widest ml-1">LinkedIn</label>
                                    <div className="relative group">
                                        <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Profile URL"
                                            value={linkedin}
                                            onChange={(e) => setLinkedin(e.target.value)}
                                            className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none focus:border-neutral-500 focus:bg-neutral-800 transition-all placeholder:text-neutral-600"
                                        />
                                    </div>
                                </div>

                                {/* Filter Selection */}
                                <div className="pt-2 border-t border-neutral-800 mt-4">
                                    <label className="text-xs font-medium text-neutral-500 uppercase tracking-widest ml-1 mb-2 block">I belong to...</label>
                                    <select
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-neutral-500 focus:bg-neutral-800 transition-all text-neutral-300"
                                    >
                                        <option value="random">🎲 Random Match (Default)</option>
                                        <optgroup label="🏫 Colleges">
                                            <option value="iit">IIT</option>
                                            <option value="nit">NIT</option>
                                            <option value="vit">VIT</option>
                                            <option value="bits">BITS</option>
                                        </optgroup>
                                        <optgroup label="🏙 Cities">
                                            <option value="mumbai">Mumbai</option>
                                            <option value="pune">Pune</option>
                                            <option value="bangalore">Bangalore</option>
                                            <option value="delhi">Delhi</option>
                                        </optgroup>
                                        <optgroup label="🏢 Companies">
                                            <option value="tcs">TCS</option>
                                            <option value="infosys">Infosys</option>
                                            <option value="wipro">Wipro</option>
                                            <option value="startup">Startup</option>
                                        </optgroup>
                                    </select>
                                    <p className="text-[10px] text-neutral-600 mt-1.5 ml-1">
                                        We'll try to match you with people from this group first.
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-white text-black hover:bg-neutral-200 font-bold py-3 px-6 rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-4"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Complete Setup <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
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
