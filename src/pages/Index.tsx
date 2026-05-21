import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data } = await supabase.from("videos").select("*").order("created_at", { ascending: false });
      const all = data || [];
      setVideos(all);
      setFeatured(all.find((v: any) => v.is_featured) || all[0] || null);
    };
    fetchVideos();
  }, []);

  const trending = videos.filter(v => v.is_trending);
  const newReleases = videos.filter(v => v.is_new_release);

  const VideoRow = ({ title, items }: { title: string; items: any[] }) => {
    if (items.length === 0) return null;
    return (
      <section className="py-6 container mx-auto px-4">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {items.map((v) => (
            <Link key={v.id} to={`/movie/${v.id}`} className="flex-shrink-0 w-40 group">
              <div className="relative rounded-xl overflow-hidden aspect-[2/3] bg-secondary">
                {(v.portrait_thumbnail || v.landscape_thumbnail) && (
                  <img src={v.portrait_thumbnail || v.landscape_thumbnail} alt={v.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                )}
              </div>
              <p className="mt-2 text-sm font-medium truncate">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.category}</p>
            </Link>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative h-[85vh] min-h-[500px] flex items-end overflow-hidden">
        <img src={featured?.landscape_thumbnail || heroBanner} alt="Featured" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />

        <div className="relative z-10 container mx-auto px-4 pb-20 max-w-2xl mr-auto animate-slide-in">
          <span className="inline-block px-3 py-1 text-xs font-semibold bg-primary/20 text-primary rounded-full mb-4 border border-primary/30">
            ★ Featured
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
            {featured?.title || "Kivu Cinema"}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 line-clamp-2">
            {featured?.description || "Kivu Cinema Home of Independent Filmmakers. Subscribe and watch unlimited"}
          </p>
          {featured && (
            <div className="flex gap-4">
              <Link to={`/movie/${featured.id}`}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow gap-2 font-semibold">
                  <Play className="w-5 h-5" fill="currentColor" /> Watch Now
                </Button>
              </Link>
              <Link to={`/movie/${featured.id}`}>
                <Button size="lg" variant="outline" className="border-border/50 gap-2 hover:bg-secondary">
                  <Info className="w-5 h-5" /> More Info
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="-mt-16 relative z-10">
        <VideoRow title=" Trending Now" items={trending} />
        <VideoRow title=" New Releases" items={newReleases} />
      </div>

      <Footer />
    </div>
  );
};

export default Index;
