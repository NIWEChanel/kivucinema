import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Film, Users, DollarSign, Eye, Plus, Edit, Trash2, BarChart3, LogOut, Menu, X, Check, XCircle, Upload, TrendingUp, CreditCard, Share2, Activity, Download, Search, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [payments, setPayments] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [shareEvents, setShareEvents] = useState<any[]>([]);
  const [watchEvents, setWatchEvents] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Performance state
  const [perfRange, setPerfRange] = useState<"today" | "yesterday" | "7d" | "30d" | "3m" | "6m" | "12m" | "all">("30d");
  const [perfSearch, setPerfSearch] = useState("");
  const [perfCategory, setPerfCategory] = useState("All");
  const [perfSort, setPerfSort] = useState<"views" | "least" | "watch" | "newest" | "oldest">("views");

  // Video form
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<any>(null);
  const [videoForm, setVideoForm] = useState({
    title: "", description: "", category: "Action", duration: "", rating: 0,
    year: new Date().getFullYear(), price: 0, video_url: "", trailer_url: "",
    is_featured: false, is_trending: false, is_new_release: false,
  });
  const [landscapeFile, setLandscapeFile] = useState<File | null>(null);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);

  const CLOUDINARY_CLOUD_NAME = "dxsvjsgqw";
  const CLOUDINARY_UPLOAD_PRESET = "kivu cinema";

  const uploadVideoToCloudinary = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setVideoUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const res = JSON.parse(xhr.responseText);
          resolve(res.secure_url as string);
        } else {
          reject(new Error(xhr.responseText || "Upload failed"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  };

  const handleVideoFileChange = async (file: File | null) => {
    if (!file) return;
    setVideoUploading(true);
    setVideoUploadProgress(0);
    try {
      const secureUrl = await uploadVideoToCloudinary(file);
      setVideoForm((prev) => ({ ...prev, video_url: secureUrl }));
      toast({ title: "Video uploaded", description: "Saved to Cloudinary successfully." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not upload video", variant: "destructive" });
    } finally {
      setVideoUploading(false);
    }
  };

  // Plan form
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({ name: "", price: 0, duration_days: 1, features: "" });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/login");
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  // Auto-refresh Performance data every 15s while on that tab
  useEffect(() => {
    if (!isAdmin || activeTab !== "performance") return;
    const t = setInterval(() => fetchData(), 15000);
    return () => clearInterval(t);
  }, [isAdmin, activeTab]);

  const fetchData = async () => {
    const [paymentsRes, videosRes, profilesRes, plansRes, sharesRes, watchRes, subsRes] = await Promise.all([
      supabase.from("payment_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("videos").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("*"),
      supabase.from("share_events").select("*").order("created_at", { ascending: false }).limit(1000),
      (supabase as any).from("watch_events").select("*").order("created_at", { ascending: false }).limit(5000),
      supabase.from("user_subscriptions").select("*"),
    ]);
    setPayments(paymentsRes.data || []);
    setVideos(videosRes.data || []);
    setProfiles(profilesRes.data || []);
    setPlans(plansRes.data || []);
    setShareEvents(sharesRes.data || []);
    setWatchEvents(watchRes.data || []);
    setSubscriptions(subsRes.data || []);
    const approved = (paymentsRes.data || []).filter((p: any) => p.status === "approved");
    setTotalEarnings(approved.reduce((sum: number, p: any) => sum + p.amount, 0));
  };

  const handleApprovePayment = async (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) return;

    // Prevent overlapping subscriptions for plan payments
    if (payment.plan_id) {
      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("id, expires_at")
        .eq("user_id", payment.user_id)
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();
      if (existingSub) {
        toast({
          title: "User already has an active subscription",
          description: `Expires ${new Date(existingSub.expires_at).toLocaleDateString()}. Cannot approve overlapping plan.`,
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase.from("payment_requests")
      .update({ status: "approved", approved_by: user!.id, approved_at: new Date().toISOString() })
      .eq("id", paymentId);
    if (error) { toast({ title: "Error approving payment", variant: "destructive" }); return; }
    if (payment.plan_id) {
      const plan = plans.find(p => p.id === payment.plan_id);
      if (plan) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.duration_days);
        await supabase.from("user_subscriptions").insert({
          user_id: payment.user_id, plan_id: payment.plan_id,
          payment_request_id: paymentId, expires_at: expiresAt.toISOString(),
        });
      }
    }
    toast({ title: "Payment approved! User now has access." });
    fetchData();
  };

  const handleRejectPayment = async (paymentId: string) => {
    await supabase.from("payment_requests")
      .update({ status: "rejected", approved_by: user!.id, approved_at: new Date().toISOString() })
      .eq("id", paymentId);
    toast({ title: "Payment rejected" });
    fetchData();
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this transaction? This cannot be undone.")) return;
    const { error } = await supabase.from("payment_requests").delete().eq("id", paymentId);
    if (error) { toast({ title: "Error deleting payment", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Transaction deleted" });
    fetchData();
  };

  const uploadThumbnail = async (file: File, type: string) => {
    const ext = file.name.split('.').pop();
    const path = `${type}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from("video-assets").upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("video-assets").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSaveVideo = async () => {
    try {
      let landscapeUrl = editingVideo?.landscape_thumbnail || "";
      let portraitUrl = editingVideo?.portrait_thumbnail || "";
      if (landscapeFile) landscapeUrl = await uploadThumbnail(landscapeFile, "landscape");
      if (portraitFile) portraitUrl = await uploadThumbnail(portraitFile, "portrait");
      const videoData = { ...videoForm, landscape_thumbnail: landscapeUrl, portrait_thumbnail: portraitUrl };
      if (editingVideo) {
        await supabase.from("videos").update(videoData).eq("id", editingVideo.id);
        toast({ title: "Video updated!" });
      } else {
        await supabase.from("videos").insert(videoData);
        toast({ title: "Video added!" });
      }
      setShowVideoForm(false); setEditingVideo(null); setLandscapeFile(null); setPortraitFile(null);
      setVideoForm({ title: "", description: "", category: "Action", duration: "", rating: 0, year: new Date().getFullYear(), price: 0, video_url: "", trailer_url: "", is_featured: false, is_trending: false, is_new_release: false });
      fetchData();
    } catch (e: any) { toast({ title: "Error saving video", description: e.message, variant: "destructive" }); }
  };

  const handleDeleteVideo = async (id: string) => {
    await supabase.from("videos").delete().eq("id", id);
    toast({ title: "Video deleted" }); fetchData();
  };

  const handleEditVideo = (video: any) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title, description: video.description || "", category: video.category,
      duration: video.duration || "", rating: video.rating || 0, year: video.year || new Date().getFullYear(),
      price: video.price || 0, video_url: video.video_url || "", trailer_url: video.trailer_url || "",
      is_featured: video.is_featured, is_trending: video.is_trending, is_new_release: video.is_new_release,
    });
    setShowVideoForm(true);
  };

  const handleToggleUserActive = async (profileId: string, currentActive: boolean) => {
    await supabase.from("profiles").update({ is_active: !currentActive }).eq("id", profileId);
    toast({ title: currentActive ? "User deactivated" : "User activated" }); fetchData();
  };

  // Plan CRUD
  const handleSavePlan = async () => {
    const data = { name: planForm.name, price: planForm.price, duration_days: planForm.duration_days, features: planForm.features.split(",").map(f => f.trim()).filter(Boolean) };
    if (editingPlan) {
      await supabase.from("plans").update(data).eq("id", editingPlan.id);
      toast({ title: "Plan updated!" });
    } else {
      await supabase.from("plans").insert(data);
      toast({ title: "Plan created!" });
    }
    setShowPlanForm(false); setEditingPlan(null); setPlanForm({ name: "", price: 0, duration_days: 1, features: "" });
    fetchData();
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({ name: plan.name, price: plan.price, duration_days: plan.duration_days, features: (plan.features || []).join(", ") });
    setShowPlanForm(true);
  };

  const handleDeletePlan = async (id: string) => {
    await supabase.from("plans").delete().eq("id", id);
    toast({ title: "Plan deleted" }); fetchData();
  };

  // Revenue analytics
  const approvedPayments = payments.filter(p => p.status === "approved");
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const monthAgo = new Date(now.getTime() - 30 * 86400000);
  const yearAgo = new Date(now.getTime() - 365 * 86400000);

  const weeklyRevenue = approvedPayments.filter(p => new Date(p.approved_at || p.created_at) >= weekAgo).reduce((s, p) => s + p.amount, 0);
  const monthlyRevenue = approvedPayments.filter(p => new Date(p.approved_at || p.created_at) >= monthAgo).reduce((s, p) => s + p.amount, 0);
  const yearlyRevenue = approvedPayments.filter(p => new Date(p.approved_at || p.created_at) >= yearAgo).reduce((s, p) => s + p.amount, 0);

  // Monthly chart data (last 6 months)
  const monthlyChartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString("default", { month: "short" });
    const y = d.getFullYear(); const m = d.getMonth();
    const total = approvedPayments.filter(p => {
      const pd = new Date(p.approved_at || p.created_at);
      return pd.getMonth() === m && pd.getFullYear() === y;
    }).reduce((s, p) => s + p.amount, 0);
    return { month, revenue: total };
  });

  const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#22c55e", "#eab308"];

  const stats = [
    { label: "Total Users", value: profiles.length.toString(), icon: Users },
    { label: "Total Earnings", value: `${totalEarnings.toLocaleString()} RWF`, icon: DollarSign },
    { label: "Total Videos", value: videos.length.toString(), icon: Film },
    { label: "Pending Payments", value: payments.filter(p => p.status === "pending").length.toString(), icon: Eye },
  ];

  const sidebarLinks = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "performance", label: "Performance", icon: Activity },
    { id: "revenue", label: "Revenue", icon: TrendingUp },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "videos", label: "Videos", icon: Film },
    { id: "plans", label: "Plans", icon: DollarSign },
    { id: "users", label: "Users", icon: Users },
    { id: "shares", label: "Shares", icon: Share2 },
  ];

  // Aggregate shares per video
  const shareCounts = videos.map(v => ({
    id: v.id,
    title: v.title,
    count: shareEvents.filter(s => s.video_id === v.id).length,
  })).sort((a, b) => b.count - a.count);
  const totalShares = shareEvents.length;
  const shares7d = shareEvents.filter(s => new Date(s.created_at) >= weekAgo).length;

  // ===== Performance analytics =====
  const rangeToDays: Record<string, number | null> = {
    today: 1, yesterday: 1, "7d": 7, "30d": 30, "3m": 90, "6m": 180, "12m": 365, all: null,
  };
  const perfRangeStart = (() => {
    if (perfRange === "all") return new Date(0);
    if (perfRange === "today") { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
    if (perfRange === "yesterday") { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0, 0, 0, 0); return d; }
    const days = rangeToDays[perfRange] as number;
    return new Date(now.getTime() - days * 86400000);
  })();
  const perfRangeEnd = perfRange === "yesterday"
    ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })()
    : new Date();
  const prevPeriodStart = (() => {
    if (perfRange === "all") return new Date(0);
    const spanMs = perfRangeEnd.getTime() - perfRangeStart.getTime();
    return new Date(perfRangeStart.getTime() - spanMs);
  })();

  const inRange = (ts: string) => {
    const t = new Date(ts).getTime();
    return t >= perfRangeStart.getTime() && t <= perfRangeEnd.getTime();
  };
  const inPrev = (ts: string) => {
    const t = new Date(ts).getTime();
    return t >= prevPeriodStart.getTime() && t < perfRangeStart.getTime();
  };

  const currentViews = watchEvents.filter(w => inRange(w.created_at));
  const previousViews = watchEvents.filter(w => inPrev(w.created_at));
  const totalViews = currentViews.length;
  const prevTotalViews = previousViews.length;
  const totalWatchSeconds = currentViews.reduce((s, w) => s + (w.watch_seconds || 0), 0);
  const prevWatchSeconds = previousViews.reduce((s, w) => s + (w.watch_seconds || 0), 0);
  const uniqueViewers = new Set(currentViews.map(w => w.user_id)).size;
  const prevUniqueViewers = new Set(previousViews.map(w => w.user_id)).size;

  const registeredUsers = profiles.length;
  const newUsers = profiles.filter(p => p.created_at && inRange(p.created_at)).length;
  const prevNewUsers = profiles.filter(p => p.created_at && inPrev(p.created_at)).length;
  const activeUserIds = new Set(subscriptions.filter(s => s.is_active && new Date(s.expires_at) > new Date()).map(s => s.user_id));
  const activeUsers = activeUserIds.size;
  const returningUserIds = new Set(
    currentViews.map(w => w.user_id).filter(uid => profiles.find(p => p.user_id === uid && !inRange(p.created_at || "")))
  );
  const returningUsers = returningUserIds.size;
  const totalVideos = videos.length;
  const publishedVideos = videos.filter(v => v.video_url).length;
  const draftVideos = totalVideos - publishedVideos;

  const pct = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const fmtDuration = (secs: number) => {
    const h = Math.floor(secs / 3600); const m = Math.floor((secs % 3600) / 60); const s = Math.floor(secs % 60);
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const perfCards = [
    { label: "Total Views", value: totalViews.toLocaleString(), prev: prevTotalViews, curr: totalViews },
    { label: "Total Watch Time", value: fmtDuration(totalWatchSeconds), prev: prevWatchSeconds, curr: totalWatchSeconds },
    { label: "Unique Viewers", value: uniqueViewers.toLocaleString(), prev: prevUniqueViewers, curr: uniqueViewers },
    { label: "Registered Users", value: registeredUsers.toLocaleString(), prev: registeredUsers - newUsers, curr: registeredUsers },
    { label: "Active Users", value: activeUsers.toLocaleString(), prev: activeUsers, curr: activeUsers },
    { label: "New Users", value: newUsers.toLocaleString(), prev: prevNewUsers, curr: newUsers },
    { label: "Returning Users", value: returningUsers.toLocaleString(), prev: returningUsers, curr: returningUsers },
    { label: "Total Videos", value: totalVideos.toLocaleString(), prev: totalVideos, curr: totalVideos },
    { label: "Published Videos", value: publishedVideos.toLocaleString(), prev: publishedVideos, curr: publishedVideos },
    { label: "Draft Videos", value: draftVideos.toLocaleString(), prev: draftVideos, curr: draftVideos },
  ];

  // Views over time chart data
  const bucketCount = perfRange === "today" || perfRange === "yesterday" ? 24
    : perfRange === "7d" ? 7
    : perfRange === "30d" ? 30
    : perfRange === "3m" ? 12
    : perfRange === "6m" ? 24
    : perfRange === "12m" ? 12
    : 12;
  const bucketMs = (perfRangeEnd.getTime() - perfRangeStart.getTime()) / bucketCount;
  const viewsChart = Array.from({ length: bucketCount }, (_, i) => {
    const bStart = perfRangeStart.getTime() + i * bucketMs;
    const bEnd = bStart + bucketMs;
    const count = currentViews.filter(w => {
      const t = new Date(w.created_at).getTime();
      return t >= bStart && t < bEnd;
    }).length;
    const watch = currentViews.filter(w => {
      const t = new Date(w.created_at).getTime();
      return t >= bStart && t < bEnd;
    }).reduce((s, w) => s + (w.watch_seconds || 0), 0);
    const d = new Date(bStart);
    const label = bucketCount <= 24 && (perfRange === "today" || perfRange === "yesterday")
      ? `${d.getHours()}:00`
      : bucketMs < 86400000 * 20
        ? `${d.getMonth() + 1}/${d.getDate()}`
        : d.toLocaleString("default", { month: "short" });
    return { label, views: count, watchMin: Math.round(watch / 60) };
  });

  // Video analytics
  const videoAnalytics = videos.map(v => {
    const events = currentViews.filter(w => w.video_id === v.id);
    const uniq = new Set(events.map(w => w.user_id)).size;
    const totalW = events.reduce((s, w) => s + (w.watch_seconds || 0), 0);
    const avgW = events.length ? Math.round(totalW / events.length) : 0;
    const durSecs = (() => {
      const d = (v.duration || "").match(/(\d+)h/); const m = (v.duration || "").match(/(\d+)m/);
      return (d ? parseInt(d[1]) * 3600 : 0) + (m ? parseInt(m[1]) * 60 : 0);
    })();
    const completion = durSecs ? Math.min(100, Math.round((avgW / durSecs) * 100)) : 0;
    const last = events[0]?.created_at || null;
    return { ...v, viewsCount: events.length, uniqueViewers: uniq, avgWatch: avgW, completion, lastViewed: last };
  });
  const filteredVideos = videoAnalytics
    .filter(v => perfCategory === "All" || v.category === perfCategory)
    .filter(v => !perfSearch || v.title.toLowerCase().includes(perfSearch.toLowerCase()) || v.category.toLowerCase().includes(perfSearch.toLowerCase()))
    .sort((a, b) => {
      if (perfSort === "views") return b.viewsCount - a.viewsCount;
      if (perfSort === "least") return a.viewsCount - b.viewsCount;
      if (perfSort === "watch") return b.avgWatch - a.avgWatch;
      if (perfSort === "newest") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (perfSort === "oldest") return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return 0;
    });

  const exportCSV = () => {
    const headers = ["Title", "Category", "Upload Date", "Published", "Total Views", "Unique Viewers", "Avg Watch (s)", "Completion %", "Last Viewed"];
    const rows = filteredVideos.map(v => [
      `"${v.title.replace(/"/g, '""')}"`, v.category,
      v.created_at ? new Date(v.created_at).toLocaleDateString() : "",
      v.video_url ? "Yes" : "No",
      v.viewsCount, v.uniqueViewers, v.avgWatch, v.completion,
      v.lastViewed ? new Date(v.lastViewed).toLocaleString() : "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `performance-${perfRange}-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const liveWindow = new Date(Date.now() - 5 * 60 * 1000);
  const liveActiveSessions = watchEvents.filter(w => new Date(w.created_at) >= liveWindow);
  const liveUsersOnline = new Set(liveActiveSessions.map(w => w.user_id)).size;

  const perfRanges: { id: typeof perfRange; label: string }[] = [
    { id: "today", label: "Today" }, { id: "yesterday", label: "Yesterday" },
    { id: "7d", label: "Last 7 Days" }, { id: "30d", label: "Last 30 Days" },
    { id: "3m", label: "Last 3 Months" }, { id: "6m", label: "Last 6 Months" },
    { id: "12m", label: "Last 12 Months" }, { id: "all", label: "All Time" },
  ];

  const allCategories = Array.from(new Set(videos.map(v => v.category)));

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`${sidebarOpen ? "w-64" : "w-0 md:w-16"} transition-all duration-300 bg-card border-r border-border/50 flex flex-col overflow-hidden`}>
        <div className="p-4 flex items-center gap-3">
          <span className="text-xl font-extrabold text-gradient">Z</span>
          {sidebarOpen && <span className="text-lg font-bold">Kivu Cinema Admin</span>}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {sidebarLinks.map((link) => (
            <button key={link.id} onClick={() => setActiveTab(link.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                activeTab === link.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
              <link.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{link.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border/50">
          <Link to="/" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Exit Admin</span>}
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-secondary">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-bold capitalize">{activeTab}</h1>
          </div>
        </header>

        <div className="p-6">
          {/* Dashboard */}
          {activeTab === "dashboard" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, i) => (
                  <div key={i} className="glass rounded-xl p-5 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Pending Payments</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border/50">
                      <th className="text-left py-3 text-muted-foreground font-medium">Payer</th>
                      <th className="text-left py-3 text-muted-foreground font-medium">Phone</th>
                      <th className="text-left py-3 text-muted-foreground font-medium">Amount</th>
                      <th className="text-left py-3 text-muted-foreground font-medium">Status</th>
                      <th className="text-left py-3 text-muted-foreground font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                      {payments.slice(0, 5).map((p) => (
                        <tr key={p.id} className="border-b border-border/30">
                          <td className="py-3">{p.payer_name}</td>
                          <td className="py-3">{p.payer_phone}</td>
                          <td className="py-3 font-medium">{p.amount} RWF</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "approved" ? "bg-green-500/10 text-green-400" : p.status === "rejected" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>{p.status}</span>
                          </td>
                          <td className="py-3">{p.status === "pending" && (
                            <div className="flex gap-2">
                              <button onClick={() => handleApprovePayment(p.id)} className="p-1.5 rounded hover:bg-green-500/10"><Check className="w-4 h-4 text-green-400" /></button>
                              <button onClick={() => handleRejectPayment(p.id)} className="p-1.5 rounded hover:bg-red-500/10"><XCircle className="w-4 h-4 text-red-400" /></button>
                            </div>
                          )}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Revenue Tab */}
          {activeTab === "revenue" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "This Week", value: weeklyRevenue },
                  { label: "This Month", value: monthlyRevenue },
                  { label: "This Year", value: yearlyRevenue },
                  { label: "All Time", value: totalEarnings },
                ].map((r, i) => (
                  <div key={i} className="glass rounded-xl p-5">
                    <p className="text-sm text-muted-foreground mb-1">{r.label}</p>
                    <p className="text-2xl font-bold text-gradient">{r.value.toLocaleString()} RWF</p>
                  </div>
                ))}
              </div>
              <div className="glass rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Monthly Revenue (Last 6 Months)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">All Payment Requests</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/50">
                    <th className="text-left py-3 text-muted-foreground font-medium">Payer</th>
                    <th className="text-left py-3 text-muted-foreground font-medium">Phone</th>
                    <th className="text-left py-3 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left py-3 text-muted-foreground font-medium">Date</th>
                    <th className="text-left py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-3 text-muted-foreground font-medium">Actions</th>
                  </tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b border-border/30">
                        <td className="py-3">{p.payer_name}</td>
                        <td className="py-3">{p.payer_phone}</td>
                        <td className="py-3 font-medium">{p.amount} RWF</td>
                        <td className="py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "approved" ? "bg-green-500/10 text-green-400" : p.status === "rejected" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400"}`}>{p.status}</span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {p.status === "pending" && (
                              <>
                                <button onClick={() => handleApprovePayment(p.id)} className="p-1.5 rounded hover:bg-green-500/10"><Check className="w-4 h-4 text-green-400" /></button>
                                <button onClick={() => handleRejectPayment(p.id)} className="p-1.5 rounded hover:bg-red-500/10"><XCircle className="w-4 h-4 text-red-400" /></button>
                              </>
                            )}
                            <button onClick={() => handleDeletePayment(p.id)} className="p-1.5 rounded hover:bg-destructive/10" title="Delete transaction"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No payment requests yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Videos Tab */}
          {activeTab === "videos" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Video Library</h2>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                  onClick={() => { setEditingVideo(null); setVideoForm({ title: "", description: "", category: "Action", duration: "", rating: 0, year: new Date().getFullYear(), price: 0, video_url: "", trailer_url: "", is_featured: false, is_trending: false, is_new_release: false }); setShowVideoForm(true); }}>
                  <Plus className="w-4 h-4" /> Add Video
                </Button>
              </div>
              {showVideoForm && (
                <div className="glass rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">{editingVideo ? "Edit Video" : "Add New Video"}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Title</label>
                      <input value={videoForm.title} onChange={e => setVideoForm({ ...videoForm, title: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Category</label>
                      <select value={videoForm.category} onChange={e => setVideoForm({ ...videoForm, category: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                        {["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Documentary", "Experimental", "Series"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-muted-foreground mb-1 block">Description</label>
                      <textarea value={videoForm.description} onChange={e => setVideoForm({ ...videoForm, description: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" rows={3} />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Duration (e.g. 2h 15m)</label>
                      <input value={videoForm.duration} onChange={e => setVideoForm({ ...videoForm, duration: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Year</label>
                      <input type="number" value={videoForm.year} onChange={e => setVideoForm({ ...videoForm, year: Number(e.target.value) })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Rating (0-10)</label>
                      <input type="number" step="0.1" max="10" value={videoForm.rating} onChange={e => setVideoForm({ ...videoForm, rating: Number(e.target.value) })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Rating (0-10)</label>
                      <input type="number" step="0.1" max="10" value={videoForm.rating} onChange={e => setVideoForm({ ...videoForm, rating: Number(e.target.value) })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-muted-foreground mb-1 block">Upload Video (saved to Cloudinary)</label>
                      <input type="file" accept="video/*" disabled={videoUploading}
                        onChange={e => handleVideoFileChange(e.target.files?.[0] || null)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
                      {videoUploading && (
                        <div className="mt-2">
                          <div className="h-2 bg-secondary rounded overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${videoUploadProgress}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Uploading... {videoUploadProgress}%</p>
                        </div>
                      )}
                      {videoForm.video_url && !videoUploading && (
                        <p className="text-xs text-green-500 mt-1 break-all">✓ {videoForm.video_url}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-muted-foreground mb-1 block">Or paste Video URL</label>
                      <input value={videoForm.video_url} onChange={e => setVideoForm({ ...videoForm, video_url: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="https://..." />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-muted-foreground mb-1 block">YouTube Trailer URL</label>
                      <input value={videoForm.trailer_url} onChange={e => setVideoForm({ ...videoForm, trailer_url: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="https://youtube.com/watch?v=..." />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Landscape Thumbnail (Desktop)</label>
                      <input type="file" accept="image/*" onChange={e => setLandscapeFile(e.target.files?.[0] || null)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Portrait Thumbnail (Mobile)</label>
                      <input type="file" accept="image/*" onChange={e => setPortraitFile(e.target.files?.[0] || null)}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="md:col-span-2 flex gap-4">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={videoForm.is_featured} onChange={e => setVideoForm({ ...videoForm, is_featured: e.target.checked })} /> Featured</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={videoForm.is_trending} onChange={e => setVideoForm({ ...videoForm, is_trending: e.target.checked })} /> Trending</label>
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={videoForm.is_new_release} onChange={e => setVideoForm({ ...videoForm, is_new_release: e.target.checked })} /> New Release</label>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button onClick={handleSaveVideo} className="bg-primary text-primary-foreground hover:bg-primary/90">{editingVideo ? "Update Video" : "Add Video"}</Button>
                    <Button variant="outline" onClick={() => { setShowVideoForm(false); setEditingVideo(null); }}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/50">
                    <th className="text-left p-4 text-muted-foreground font-medium">Video</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Category</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Year</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Rating</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                  </tr></thead>
                  <tbody>
                    {videos.map((v) => (
                      <tr key={v.id} className="border-b border-border/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {v.portrait_thumbnail && <img src={v.portrait_thumbnail} alt={v.title} className="w-10 h-14 rounded object-cover" />}
                            <span className="font-medium">{v.title}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{v.category}</td>
                        <td className="p-4">{v.year || "—"}</td>
                        <td className="p-4">{v.rating}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button onClick={() => handleEditVideo(v)} className="p-1.5 rounded hover:bg-secondary"><Edit className="w-4 h-4 text-muted-foreground" /></button>
                            <button onClick={() => handleDeleteVideo(v.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {videos.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No videos yet. Add your first video!</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Plans Tab */}
          {activeTab === "plans" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Subscription Plans</h2>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                  onClick={() => { setEditingPlan(null); setPlanForm({ name: "", price: 0, duration_days: 1, features: "" }); setShowPlanForm(true); }}>
                  <Plus className="w-4 h-4" /> Add Plan
                </Button>
              </div>
              {showPlanForm && (
                <div className="glass rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">{editingPlan ? "Edit Plan" : "Add New Plan"}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Name</label>
                      <input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Price (RWF)</label>
                      <input type="number" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Duration (days)</label>
                      <input type="number" value={planForm.duration_days} onChange={e => setPlanForm({ ...planForm, duration_days: Number(e.target.value) })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Features (comma-separated)</label>
                      <input value={planForm.features} onChange={e => setPlanForm({ ...planForm, features: e.target.value })}
                        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="HD, No Ads, Unlimited" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <Button onClick={handleSavePlan} className="bg-primary text-primary-foreground hover:bg-primary/90">{editingPlan ? "Update Plan" : "Add Plan"}</Button>
                    <Button variant="outline" onClick={() => { setShowPlanForm(false); setEditingPlan(null); }}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/50">
                    <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Price</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Duration</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Active</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                  </tr></thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id} className="border-b border-border/30">
                        <td className="p-4 font-medium">{p.name}</td>
                        <td className="p-4">{p.price} RWF</td>
                        <td className="p-4">{p.duration_days} days</td>
                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>{p.is_active ? "Active" : "Inactive"}</span></td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button onClick={() => handleEditPlan(p)} className="p-1.5 rounded hover:bg-secondary"><Edit className="w-4 h-4 text-muted-foreground" /></button>
                            <button onClick={() => handleDeletePlan(p.id)} className="p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {plans.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No plans yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="glass rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">User Management</h2>
              <div className="space-y-3">
                {profiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3 border-b border-border/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${p.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {(p.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-sm font-medium">{p.full_name || "Unknown"}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${p.is_active ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => handleToggleUserActive(p.id, p.is_active)}>
                      {p.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                ))}
                {profiles.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No users yet</p>}
              </div>
            </div>
          )}

          {activeTab === "shares" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass rounded-xl p-5">
                  <p className="text-xs text-muted-foreground mb-1">Total Shares</p>
                  <p className="text-3xl font-bold">{totalShares}</p>
                </div>
                <div className="glass rounded-xl p-5">
                  <p className="text-xs text-muted-foreground mb-1">Shares (last 7 days)</p>
                  <p className="text-3xl font-bold">{shares7d}</p>
                </div>
                <div className="glass rounded-xl p-5">
                  <p className="text-xs text-muted-foreground mb-1">Unique Videos Shared</p>
                  <p className="text-3xl font-bold">{new Set(shareEvents.map(s => s.video_id)).size}</p>
                </div>
              </div>

              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Top Shared Videos</h2>
                {shareCounts.filter(s => s.count > 0).length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No shares yet</p>
                ) : (
                  <div className="space-y-2">
                    {shareCounts.filter(s => s.count > 0).slice(0, 20).map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/30">
                        <span className="text-sm font-medium truncate">{s.title}</span>
                        <span className="text-sm text-primary font-semibold">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Share Activity</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {shareEvents.slice(0, 50).map((s) => {
                    const v = videos.find(vv => vv.id === s.video_id);
                    return (
                      <div key={s.id} className="flex items-center justify-between py-2 border-b border-border/30 text-sm">
                        <span className="truncate">{v?.title || "Unknown video"}</span>
                        <span className="text-muted-foreground text-xs">
                          {s.method || "share"} · {new Date(s.created_at).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                  {shareEvents.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No activity yet</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
