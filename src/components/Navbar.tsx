import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Menu, X, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import InstallPWAButton from "@/components/InstallPWAButton";
import kivuLogo from "@/assets/kivu-logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, hasActiveSubscription, signOut } = useAuth();

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/movies", label: "Videos" },
    { to: "/pricing", label: "Pricing" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 leading-none">
            <img
              src={kivuLogo}
              alt="Kivu Cinema logo"
              className="h-8 md:h-10 w-auto object-contain shrink-0"
            />
            <span className="text-xl md:text-2xl font-extrabold text-gradient tracking-tight leading-none">
              Kivu Cinema
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}
                className={`text-sm font-medium transition-colors duration-200 ${
                  location.pathname === link.to ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}>{link.label}</Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Desktop search */}
            <div className="hidden md:flex items-center">
              {searchOpen ? (
                <div className="flex items-center gap-2 animate-scale-in">
                  <input type="text" placeholder="Search videos..."
                    className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 w-48"
                    autoFocus onBlur={() => setSearchOpen(false)} />
                  <button onClick={() => setSearchOpen(false)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="hidden sm:block"><InstallPWAButton /></div>

            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="ghost" size="sm" className="text-primary gap-1">
                      <Shield className="w-4 h-4" /> Admin
                    </Button>
                  </Link>
                )}
                {!hasActiveSubscription && (
                  <Link to="/pricing">
                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm">Join Now</Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1" onClick={() => signOut()}>
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm">Join Now</Button>
                </Link>
              </>
            )}

            <button className="md:hidden p-2" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden pb-4 animate-fade-in space-y-3">
            <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search videos..."
                className="bg-transparent text-sm focus:outline-none w-full"
              />
            </div>
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to}
                className="block py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsOpen(false)}>{link.label}</Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
