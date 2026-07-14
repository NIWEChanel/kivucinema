import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const categories = ["All", "Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Documentary", "Experimental", "Series"];

const Movies = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      let query = supabase.from("videos").select("*");
      if (activeCategory !== "All") query = query.eq("category", activeCategory);
      const { data } = await query.order("created_at", { ascending: false });
      setVideos(data || []);
    };
    fetchVideos();
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-8 container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">Browse Videos</h1>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-glow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}>{cat}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {videos.map((v) => (
            <Link key={v.id} to={`/movie/${v.id}`} className="group animate-fade-in">
              <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-secondary">
                {(v.portrait_thumbnail || v.landscape_thumbnail) && (
                  <img src={v.portrait_thumbnail || v.landscape_thumbnail} alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-muted-foreground">{v.category} • {v.duration}</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium truncate">{v.title}</p>
                <p className="text-xs text-muted-foreground">{v.category}{v.duration ? ` • ${v.duration}` : ""}</p>
              </div>
            </Link>
          ))}
        </div>

        {videos.length === 0 && (
          <p className="text-center text-muted-foreground py-20">No videos found.</p>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Movies;
