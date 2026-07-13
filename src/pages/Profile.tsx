import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User as UserIcon,
  Camera,
  Activity,
  Shield,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  Trash2,
  Heart,
} from "lucide-react";

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("en");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);
  const [notifySite, setNotifySite] = useState(true);

  // password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  // activity
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [totalWatched, setTotalWatched] = useState(0);
  const [lastWatched, setLastWatched] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (p) {
        setProfile(p);
        setFullName(p.full_name || "");
        setPhone(p.phone || "");
        setCountry((p as any).country || "");
        setLanguage((p as any).language || "en");
        setNotifyEmail((p as any).notify_email ?? true);
        setNotifyPush((p as any).notify_push ?? true);
        setNotifySite((p as any).notify_site ?? true);
      }

      // watch history (with joined video)
      const { data: watches } = await (supabase as any)
        .from("watch_events")
        .select("id, created_at, watch_seconds, video_id, videos(id,title,portrait_thumbnail,landscape_thumbnail)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setWatchHistory(watches || []);
      setTotalWatched(new Set((watches || []).map((w: any) => w.video_id)).size);
      setLastWatched(watches?.[0]?.created_at || null);

      // favorites
      const { data: favs } = await (supabase as any)
        .from("favorites")
        .select("id, created_at, video_id, videos(id,title,portrait_thumbnail,landscape_thumbnail)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setFavorites(favs || []);

      setLoading(false);
    };
    load();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
      const avatar_url = signed?.signedUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url } as any)
        .eq("user_id", user.id);
      if (dbErr) throw dbErr;
      setProfile((p: any) => ({ ...p, avatar_url }));
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        country,
        language,
        notify_email: notifyEmail,
        notify_push: notifyPush,
        notify_site: notifySite,
      } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "At least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) {
      toast({ title: "Change failed", description: error.message, variant: "destructive" });
    } else {
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed" });
    }
  };

  const handleLogoutAll = async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Signed out on all devices" });
      navigate("/login");
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    await (supabase as any).from("favorites").delete().eq("id", id);
    setFavorites((f) => f.filter((x) => x.id !== id));
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    // Best effort: mark profile inactive + sign out. Full deletion requires admin key.
    await supabase.from("profiles").update({ is_active: false } as any).eq("user_id", user.id);
    await supabase.auth.signOut();
    toast({
      title: "Account deactivation requested",
      description: "Contact support to permanently remove your data.",
    });
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!user) return null;

  const initials = (fullName || user.email || "U")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-secondary border border-border overflow-hidden flex items-center justify-center text-2xl font-bold">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow-sm hover:bg-primary/90 transition-colors"
              aria-label="Change avatar"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{fullName || "Your Profile"}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6 h-auto">
            <TabsTrigger value="account" className="gap-1"><UserIcon className="w-4 h-4" /> Account</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1"><Activity className="w-4 h-4" /> Activity</TabsTrigger>
            <TabsTrigger value="security" className="gap-1"><Shield className="w-4 h-4" /> Security</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1"><SettingsIcon className="w-4 h-4" /> Settings</TabsTrigger>
          </TabsList>

          {/* Account */}
          <TabsContent value="account" className="space-y-6">
            <div className="glass rounded-xl p-6 border border-border/50 space-y-4">
              <h2 className="text-lg font-semibold">Account Information</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user.email || ""} disabled />
                  <p className="text-xs text-muted-foreground mt-1">Contact support to change your email.</p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} />
                </div>
              </div>
              <Separator />
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs">{user.id}</span></div>
                <div><span className="text-muted-foreground">Join Date:</span> {new Date(user.created_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Last Login:</span> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}</div>
                <div><span className="text-muted-foreground">Status:</span> <span className="text-primary">{profile?.is_active === false ? "Inactive" : "Active"}</span></div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* Activity */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="Total Videos Watched" value={totalWatched} />
              <StatCard label="Favorites" value={favorites.length} />
              <StatCard label="Last Watched" value={lastWatched ? new Date(lastWatched).toLocaleDateString() : "—"} />
            </div>

            <div className="glass rounded-xl p-6 border border-border/50">
              <h2 className="text-lg font-semibold mb-4">Recently Watched</h2>
              {watchHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No watch history yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {watchHistory.slice(0, 8).map((w) => (
                    <Link key={w.id} to={`/movie/${w.video_id}`} className="group">
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
                        <img
                          src={w.videos?.portrait_thumbnail || w.videos?.landscape_thumbnail}
                          alt={w.videos?.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <p className="mt-1 text-xs font-medium truncate">{w.videos?.title}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-6 border border-border/50">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Heart className="w-4 h-4 text-primary" /> Favorites</h2>
              {favorites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No favorites yet. Tap the heart on any video.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {favorites.map((f) => (
                    <div key={f.id} className="group relative">
                      <Link to={`/movie/${f.video_id}`}>
                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
                          <img
                            src={f.videos?.portrait_thumbnail || f.videos?.landscape_thumbnail}
                            alt={f.videos?.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="mt-1 text-xs font-medium truncate">{f.videos?.title}</p>
                      </Link>
                      <button
                        onClick={() => handleRemoveFavorite(f.id)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        aria-label="Remove favorite"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-6">
            <div className="glass rounded-xl p-6 border border-border/50 space-y-4">
              <h2 className="text-lg font-semibold">Change Password</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={changingPw}>
                {changingPw ? "Updating..." : "Update Password"}
              </Button>
            </div>

            <div className="glass rounded-xl p-6 border border-border/50 space-y-3">
              <h2 className="text-lg font-semibold">Sessions</h2>
              <div className="text-sm space-y-1">
                <div><span className="text-muted-foreground">Current Session:</span> {navigator.userAgent.split(") ")[0].split("(")[1] || "Unknown"}</div>
                <div><span className="text-muted-foreground">Last Sign-in:</span> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Detailed active-session listing is not exposed by the auth provider. You can sign out everywhere below.
              </p>
              <Button variant="outline" className="gap-2" onClick={handleLogoutAll}>
                <LogOut className="w-4 h-4" /> Log out from all devices
              </Button>
            </div>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <div className="glass rounded-xl p-6 border border-border/50 space-y-4">
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
              <ToggleRow label="Email notifications" description="Receive updates and offers by email." checked={notifyEmail} onChange={setNotifyEmail} />
              <ToggleRow label="Push notifications" description="Get alerts on this device." checked={notifyPush} onChange={setNotifyPush} />
              <ToggleRow label="Website notifications" description="Show alerts inside the app." checked={notifySite} onChange={setNotifySite} />
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <div className="glass rounded-xl p-6 border border-border/50 space-y-4">
              <h2 className="text-lg font-semibold">Preferences</h2>
              <ToggleRow label="Dark Mode" description="Kivu Cinema uses a dark theme by default." checked={true} onChange={() => toast({ title: "Dark theme is always on for now." })} />
              <div>
                <Label>Language</Label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="rw">Kinyarwanda</option>
                  <option value="sw">Kiswahili</option>
                </select>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>

            <div className="glass rounded-xl p-6 border border-destructive/40 space-y-3">
              <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">
                Deleting your account signs you out and marks your profile inactive. Contact support to permanently delete your data.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action deactivates your account and signs you out. This cannot be undone from within the app.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="glass rounded-xl p-4 border border-border/50">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
  </div>
);

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div>
      <p className="font-medium">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default Profile;
