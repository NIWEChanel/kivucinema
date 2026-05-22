import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Star, Clock, Play, ArrowLeft, Youtube, Share2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VideoPlayer from "@/components/VideoPlayer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const MovieDetail = () => {
  const { id } = useParams();
  const { user, hasActiveSubscription } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [video, setVideo] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      const { data } = await supabase.from("videos").select("*").eq("id", id).single();
      setVideo(data);
      if (data) {
        const { data: rel } = await supabase.from("videos").select("*").eq("category", data.category).neq("id", data.id).limit(4);
        setRelated(rel || []);
      }
      setLoading(false);
    };
    fetchVideo();
  }, [id]);

  const handleWatchNow = () => {
    if (!user) {
      toast({ title: "Please sign in first", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!hasActiveSubscription) {
      toast({ title: "Subscription required", description: "Pick a plan to start watching." });
      navigate("/pricing");
      return;
    }
    // User has active subscription — play inline
    if (video?.video_url) {
      setShowPlayer(true);
      setTimeout(() => document.getElementById("player-section")?.scrollIntoView({ behavior: "smooth" }), 50);
    } else {
      toast({ title: "Video coming soon", description: "This video has no playback URL yet." });
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Loading...</p></div>;
  if (!video) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Video not found.</p></div>;

  const thumbnail = video.landscape_thumbnail || video.portrait_thumbnail;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative h-[70vh] min-h-[400px]">
        {thumbnail && <img src={thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-end">
            {video.portrait_thumbnail && (
              <img src={video.portrait_thumbnail} alt={video.title} className="w-48 rounded-xl shadow-2xl hidden md:block border border-border/30" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 text-xs font-semibold bg-primary/20 text-primary rounded-full border border-primary/30">{video.category}</span>
                {video.is_new_release && <span className="px-3 py-1 text-xs font-semibold bg-accent/20 text-accent rounded-full">NEW</span>}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{video.title}</h1>
              <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-primary" fill="currentColor" /> {video.rating}/10</span>
                {video.duration && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {video.duration}</span>}
                {video.year && <span>{video.year}</span>}
              </div>
              <p className="text-muted-foreground max-w-xl mb-6">{video.description}</p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow gap-2 font-semibold" onClick={handleWatchNow}>
                  {hasActiveSubscription ? <Play className="w-5 h-5" fill="currentColor" /> : <Lock className="w-5 h-5" />}
                  {hasActiveSubscription ? "Watch Now" : "Subscribe to Watch"}
                </Button>
                {video.trailer_url && (
                  <Button asChild size="lg" variant="outline" className="border-border/50 gap-2">
                    <a href={video.trailer_url} target="_blank" rel="noopener noreferrer">
                      <Youtube className="w-5 h-5" /> Watch Trailer
                    </a>
                  </Button>
                )}
                <Button size="lg" variant="outline" className="border-border/50 gap-2"><Share2 className="w-5 h-5" /></Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPlayer && hasActiveSubscription && video?.video_url && (
        <section id="player-section" className="container mx-auto px-4 py-10">
          <VideoPlayer src={video.video_url} poster={thumbnail} hoverPreview />
        </section>
      )}

      {related.length > 0 && (
        <section className="py-12 container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">More {video.category}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {related.map((m) => (
              <Link key={m.id} to={`/movie/${m.id}`} className="group">
                <div className="relative rounded-xl overflow-hidden aspect-[2/3]">
                  <img src={m.portrait_thumbnail || m.landscape_thumbnail} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="mt-2 text-sm font-medium truncate">{m.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default MovieDetail;
