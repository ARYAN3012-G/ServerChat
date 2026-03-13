import { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';

export default function GifPicker({ onSelect }) {
    const [query, setQuery] = useState('');
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Default Tenor test API key (LIVDSRZULELA)
    const API_KEY = 'LIVDSRZULELA';

    useEffect(() => {
        fetchTrending();
    }, []);

    const fetchTrending = async () => {
        setLoading(true);
        try {
            const res = await fetch(`https://g.tenor.com/v1/trending?key=${API_KEY}&limit=20`);
            const data = await res.json();
            setGifs(data.results || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return fetchTrending();
        setLoading(true);
        try {
            const res = await fetch(`https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${API_KEY}&limit=20`);
            const data = await res.json();
            setGifs(data.results || []);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="w-[300px] h-[400px] bg-dark-800 border border-white/10 rounded-xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-2 border-b border-white/5 bg-dark-900">
                <form onSubmit={handleSearch} className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search Tenor GIFs..."
                        className="w-full bg-dark-800 text-sm text-white rounded-lg pl-9 pr-3 py-2 outline-none border border-white/5 focus:border-indigo-500 transition-colors"
                    />
                </form>
            </div>
            <div className="flex-1 overflow-y-auto p-2 bg-dark-900">
                {loading ? (
                    <div className="text-center text-white/40 text-sm mt-4">Loading GIFs...</div>
                ) : (
                    <div className="columns-2 gap-2 space-y-2">
                        {gifs.map((gif) => (
                            <img
                                key={gif.id}
                                src={gif.media[0].tinygif.url}
                                alt="gif"
                                className="w-full rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => onSelect(gif.media[0].gif.url)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
