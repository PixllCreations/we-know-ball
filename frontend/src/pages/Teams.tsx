import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Skeleton from "@/components/Skeleton";
import { getTeams } from "@/lib/nba-api";

const Teams = () => {
  const [q, setQ] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });

  const teams = useMemo(() => {
    const list = data ?? [];
    const filtered = q ? list.filter((t) => t.displayName.toLowerCase().includes(q.toLowerCase())) : list;
    return [...filtered].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [data, q]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Teams</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">All 30 NBA teams</h1>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search teams…"
          className="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm outline-none transition-colors focus:border-primary md:w-72"
        />
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 30 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-36"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
          Failed to load teams.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {teams.map((t) => (
            <Link
              key={t.id}
              to={`/teams/${t.id}`}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-gradient-stat p-5 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
            >
              {t.logos?.[0]?.href ? (
                <img
                  src={t.logos[0].href}
                  alt={`${t.displayName} logo`}
                  className="h-16 w-16 object-contain transition-transform group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted" />
              )}
              <div>
                <div className="font-display text-sm font-bold leading-tight">{t.name}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.abbreviation} · {t.location}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Teams;
