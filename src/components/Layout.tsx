import { NavLink, Outlet, Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Scores", end: true },
  { to: "/standings", label: "Standings" },
  { to: "/teams", label: "Teams" },
];

const Layout = () => {
  return (
    <div className="min-h-screen bg-gradient-hero text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center gap-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight"
          >
            <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-primary text-primary-foreground shadow-glow">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                />
                <path d="M3 12h18M12 3v18M5.5 5.5l13 13M18.5 5.5l-13 13" />
              </svg>
            </span>
            <span>
              We<span className="text-primary">Know</span>Ball
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                    "hover:bg-surface-hover hover:text-foreground",
                    isActive && "bg-surface-elevated text-foreground",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span className="live-dot" />
            <span className="font-mono uppercase tracking-wider">Live data</span>
          </div>
        </div>
      </header>

      <main className="container py-8 animate-fade-in">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
