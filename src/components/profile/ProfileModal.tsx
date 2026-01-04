"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { auth } from "@/lib/firebase";
import { authenticatedFetch } from "@/lib/api";
import { config } from "@/lib/config";
import { motion, AnimatePresence } from "framer-motion";
import { X, User as UserIcon, LogOut, Save, Edit2, Instagram, Linkedin, Music, Camera, Sparkles, Zap, Shield } from "lucide-react";
import { signOut, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Profile State
    const [instagram, setInstagram] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [topTrack, setTopTrack] = useState("");
    const [photoURL, setPhotoURL] = useState("");
    const [karma, setKarma] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [profileExists, setProfileExists] = useState(false);

    // Fetch existing profile on mount (or when modal opens)
    useEffect(() => {
        if (!isOpen || !user) return;

        setPhotoURL(user.photoURL || "");

        const loadProfile = async () => {
            setLoading(true);
            let foundData = false;

            // 1. FAST LOAD:  Read Local Preferences First
            const savedTrack = localStorage.getItem("arena_top_track");
            const savedInsta = localStorage.getItem("arena_instagram");
            const savedLinkedin = localStorage.getItem("arena_linkedin");
            const savedKarma = localStorage.getItem("arena_karma");

            if (savedTrack || savedInsta || savedLinkedin) foundData = true;

            if (savedTrack) setTopTrack(savedTrack);
            if (savedInsta) setInstagram(savedInsta);
            if (savedLinkedin) setLinkedin(savedLinkedin);
            if (savedKarma) setKarma(parseInt(savedKarma) || 0);

            setLoading(false); // Show data immediately
            if (!foundData) setIsEditing(true);

            // 2. BACKGROUND SYNC: Fetch Backend Data to valid/update
            // CHECK: If we just updated locally (within 1 hour), skip sync to avoid known backend reversion
            const lastUpdateVal = localStorage.getItem("arena_last_update_ts");
            const lastUpdate = parseInt(lastUpdateVal || "0");
            const diff = Date.now() - lastUpdate;
            const isJustUpdated = diff < 3600000;

            console.log(`Sync Check: LastUpdate=${lastUpdateVal}, Diff=${diff}ms, Skip=${isJustUpdated}`);

            if (isJustUpdated) {
                console.log("Skipping backend sync - using fresh local data (Valid for 1h).");
                setProfileExists(true); // Assume exists if we have local update history
                return;
            }

            try {
                // Use authenticatedFetch for auto-token handling
                const res = await authenticatedFetch("/con/profile-get");

                if (res.ok) {
                    setProfileExists(true);
                    const data = await res.json();
                    const insta = data.instagram || data.Instagram;
                    const lkd = data.linkedin || data.LinkedIn;
                    const km = data.karma !== undefined ? data.karma : data.Karma;

                    if (insta) {
                        setInstagram(insta);
                        localStorage.setItem("arena_instagram", insta);
                    }
                    if (lkd) {
                        setLinkedin(lkd);
                        localStorage.setItem("arena_linkedin", lkd);
                    }
                    if (km !== undefined) {
                        setKarma(km);
                        localStorage.setItem("arena_karma", km.toString());
                    }
                } else if (res.status === 404) {
                    setProfileExists(false);
                }
            } catch (err) {
                console.error("Profile sync failed (using local data)", err);
            }
        };

        loadProfile();
    }, [isOpen, user]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);

        try {
            setError(null);

            // 1. Update Firebase Profile (Photo)
            if (photoURL !== user.photoURL) {
                await updateProfile(user, { photoURL: photoURL });
            }

            let finalLinkedin = linkedin;
            if (finalLinkedin && !finalLinkedin.startsWith("http")) {
                finalLinkedin = `https://www.linkedin.com/in/${finalLinkedin}`;
            }

            // 2. Save to Backend (Aligned with testfrontends/auth.html logic)
            // We optimize for UPDATE first, as that's the primary action.
            // 2. Save to Backend (Strict mirror of testfrontends/auth.html)
            try {
                // EXPLICIT TOKEN FETCH
                const token = await user.getIdToken();

                // Construct payload exactly like auth.html
                const payload: any = {};
                // Ensure strings are trimmed
                const ig = instagram ? instagram.trim() : "";
                const ln = finalLinkedin ? finalLinkedin.trim() : "";

                if (ig !== "") {
                    payload.instagram = ig;
                }

                if (ln !== "") {
                    payload.linkedin = ln;
                }

                console.log("📤 Sending payload (Exact Match):", payload);

                // DIRECT FETCH
                const apiUrl = `${config.getApiUrl()}/con/profile-update`;
                console.log("Fetching:", apiUrl);

                const res = await fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();
                console.log("📥 Backend response:", data);

                if (!res.ok) {
                    console.warn("Backend update error:", data);
                    // Note: We continue to local save regardless to ensure UI update
                } else {
                    console.log("Backend update successful");
                }

            } catch (backendErr) {
                console.warn("Backend sync failed (Network/Auth), saving locally only:", backendErr);
            }

            // 3. Save to LocalStorage (ALWAYS EXECUTE - Optimistic Source of Truth)
            localStorage.setItem("arena_top_track", topTrack);
            localStorage.setItem("arena_instagram", instagram);
            localStorage.setItem("arena_linkedin", finalLinkedin);

            // WORKAROUND: Set a timestamp to prevent immediate overwrite by stale backend data
            const now = Date.now();
            localStorage.setItem("arena_last_update_ts", now.toString());
            console.log("Saved local timestamp:", now);

            setIsEditing(false);
            window.location.reload(); // Force reload to show new photo in Header
        } catch (err: any) {
            console.error("Critical Save Error", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePhotoEdit = () => {
        const url = prompt("Enter Image URL for Profile Photo:", photoURL);
        if (url !== null) {
            setPhotoURL(url);
        }
    };

    const handleSignOut = async () => {
        await signOut(auth);
        router.push("/auth");
        window.location.reload(); // Force refresh to clear any local state
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-gradient-to-b from-white/10 to-black/60 backdrop-blur-2xl border border-white/10 ring-1 ring-white/5 rounded-[2rem] shadow-[0_0_50px_-10px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] overflow-hidden group"
            >
                {/* Ambient Glows (Premium Feel) */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none -z-10 mix-blend-screen" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none -z-10 mix-blend-screen" />
                {/* Scrollable Content Wrapper */}
                <div className="flex-1 overflow-y-auto scrollbar-none relative">
                    {/* Header Banner */}
                    <div className="h-32 bg-gradient-to-r from-cyan-900 via-blue-900 to-purple-900 relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                        <div className="absolute top-4 right-4 flex gap-2">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all"
                                    title="Edit Profile"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="p-2 bg-white text-black hover:bg-neutral-200 rounded-full transition-all shadow-lg"
                                    title="Save Changes"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white/80 hover:text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 relative -mt-12 flex flex-col items-center pb-6">

                        {/* Avatar */}
                        <div className="relative group">
                            {/* Yellow Border Main Wrapper (As requested: "keep yellow") */}
                            <div className="w-24 h-24 rounded-2xl p-[2px] bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                                <div className="w-full h-full rounded-[14px] bg-black overflow-hidden relative">
                                    <img
                                        src={photoURL || "https://ui-avatars.com/api/?background=random"}
                                        alt="Profile"
                                        className="w-full h-full object-cover bg-neutral-800"
                                    />
                                </div>
                            </div>
                            {isEditing && (
                                <button
                                    onClick={handlePhotoEdit}
                                    className="absolute inset-0 m-1 flex items-center justify-center bg-black/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm cursor-pointer"
                                >
                                    <Camera className="w-6 h-6 text-white" />
                                </button>
                            )}
                            {/* ID Badge */}
                            <div className="absolute -bottom-2 -right-2 bg-black border border-white/10 p-1 px-2 rounded-full flex items-center gap-1 shadow-lg">
                                <Shield className="w-3 h-3 text-yellow-500" />
                                <span className="text-[10px] font-bold text-white">PRO</span>
                            </div>
                        </div>

                        {/* Name & Karma */}
                        <div className="text-center mt-3 mb-6">
                            <h2 className="text-2xl font-black text-white tracking-tight">{user?.displayName || "Anonymous"}</h2>
                            <div className="flex items-center justify-center gap-3 mt-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                                    <Zap className="w-3 h-3 text-yellow-500 fill-current" />
                                    <span className="text-xs font-bold text-yellow-500">{karma} KA</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                                    <span className="text-xs font-mono text-neutral-400">{user?.email?.split('@')[0]}</span>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="w-full mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-xs font-medium">
                                <div className="w-1 h-1 rounded-full bg-red-500" /> {error}
                            </div>
                        )}

                        {/* Social Grid */}
                        <div className="w-full space-y-4">

                            {/* Instagram */}
                            <div className={`group relative p-4 rounded-2xl border transition-all duration-300 ${isEditing ? 'bg-white/5 border-white/20' : 'bg-gradient-to-r from-pink-500/5 to-purple-500/5 border-white/5 hover:border-pink-500/20'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl text-white shadow-lg shadow-pink-500/20">
                                        <Instagram className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">Instagram</p>
                                        {isEditing ? (
                                            <input
                                                value={instagram}
                                                onChange={e => setInstagram(e.target.value)}
                                                placeholder="@username"
                                                className="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-neutral-700 font-medium"
                                            />
                                        ) : (
                                            <p className="text-sm font-medium text-white truncate">
                                                {instagram ? `@${instagram.replace('@', '')}` : <span className="text-neutral-600 italic">No vibe yet</span>}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* LinkedIn */}
                            <div className={`group relative p-4 rounded-2xl border transition-all duration-300 ${isEditing ? 'bg-white/5 border-white/20' : 'bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border-white/5 hover:border-blue-500/20'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
                                        <Linkedin className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-0.5">Professional</p>
                                        {isEditing ? (
                                            <input
                                                value={linkedin}
                                                onChange={e => setLinkedin(e.target.value)}
                                                placeholder="linkedin.com/in/..."
                                                className="w-full bg-transparent border-none outline-none text-sm text-white placeholder:text-neutral-700 font-medium"
                                            />
                                        ) : (
                                            <p className="text-sm font-medium text-white truncate">
                                                {linkedin ? linkedin.replace('https://www.linkedin.com/in/', '') : <span className="text-neutral-600 italic">Ghost mode</span>}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>



                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto p-6 flex justify-between items-center bg-black/20 shrink-0 border-t border-white/5">
                    <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
                        EST. {new Date().getFullYear()}
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 text-red-500/60 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-wider px-3 py-2 hover:bg-red-500/5 rounded-lg"
                    >
                        <LogOut className="w-3 h-3" />
                        Log Out
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
