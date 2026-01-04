import { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface GifPickerProps {
    onSelect: (gifUrl: string) => void;
    onClose: () => void;
}

interface TenorResult {
    id: string;
    media_formats: {
        tinygif: { url: string; dims: number[] };
        gif: { url: string; dims: number[] };
    };
    content_description: string;
}

// Tenor Public API Key (LIVDSRZULELA is the common test key)
const TENOR_KEY = "LIVDSRZULELA";
const CLIENT_KEY = "project_social";

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TenorResult[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    // Debounce search
    useEffect(() => {
        const fetchGifs = async () => {
            setLoading(true);
            try {
                const endpoint = query
                    ? `https://tenor.googleapis.com/v2/search?q=${query}&key=${TENOR_KEY}&client_key=${CLIENT_KEY}&limit=20`
                    : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&client_key=${CLIENT_KEY}&limit=20`;

                const res = await fetch(endpoint);
                const data = await res.json();
                if (data.results) {
                    setResults(data.results);
                }
            } catch (error) {
                console.error("Failed to fetch GIFs", error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchGifs, 500);
        return () => clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-16 left-4 w-80 h-96 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 ring-1 ring-white/10"
        >
            {/* Header / Search */}
            <div className="p-3 border-b border-white/10 bg-white/5">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/50" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search GIFs..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-neutral-600"
                    />
                </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
                    </div>
                ) : (
                    <div className="columns-2 gap-2 space-y-2">
                        {results.map((gif) => (
                            <button
                                key={gif.id}
                                onClick={() => onSelect(gif.media_formats.gif.url)} // Use higher quality 'gif' for display if needed, but 'tinygif' for list. Let's use 'gif' url for the message.
                                className="w-full break-inside-avoid rounded-lg overflow-hidden border border-transparent hover:border-white/50 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                            >
                                <img
                                    src={gif.media_formats.tinygif.url}
                                    alt={gif.content_description}
                                    className="w-full h-auto object-cover bg-neutral-900"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Attribution */}
            <div className="px-3 py-1.5 bg-black/50 text-[10px] text-neutral-600 font-mono text-center uppercase tracking-wider border-t border-white/5">
                VIA TENOR
            </div>
        </motion.div>
    );
}
