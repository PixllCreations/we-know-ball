import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import GameCard from "@/components/GameCard";
import Skeleton from "@/components/Skeleton";
import { getScoreboard, todayYYYYMMDD } from "@/lib/nba-api";
import { cn } from "@/lib/utils";

function shiftDate(yyyymmdd: string, days: number) {
  const y = +yyyymmdd.slice(0, 4);
  const m = +yyyymmdd.slice(4, 6) - 1;
  const d = +yyyymmdd.slice(6, 8);
  const dt = new Date(y, m, d);
  dt.setDate(dt.getDate() + days);
  return todayYYYYMMDD(dt);
}

function prettyDate(yyyymmdd: string) {
  const y = +yyyymmdd.slice(0, 4);
  const m = +yyyymmdd.slice(4, 6) - 1;
  const d = +yyyymmdd.slice(6, 8);
  return new Date(y, m, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const Index = () => {
  const [date, setDate] = useState(() => todayYYYYMMDD());

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["scoreboard", date],
    queryFn: () => getScoreboard(date),
    refetchInterval: 30_000,
  });

  // Update document title with live game count
  useEffect(() => {
    const live = data?.events?.filter((e) => e.status.type.state === "in").length ?? 0;
    document.title = live ? `(${live} LIVE) We Know Ball — NBA` : "We Know Ball — NBA scores, standings & stats";
  }, [data]);

  const games = data?.events ?? [];
  const grouped = useMemo(() => {
    const live = games.filter((g) => g.status.type.state === "in");
    const upcoming = games.filter((g) => g.status.type.state === "pre");
    const final = games.filter((g) => g.status.type.state === "post");
    return { live, upcoming, final };
  }, [games]);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-court p-8 shadow-card">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Scoreboard</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">{prettyDate(date)}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {games.length} game{games.length === 1 ? "" : "s"}
              {grouped.live.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1.5 text-live">
                  <span className="live-dot" /> {grouped.live.length} live
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDate((d) => shiftDate(d, -1))}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover"
              aria-label="Previous day"
            >
              ← Prev
            </button>
            <button
              onClick={() => setDate(todayYYYYMMDD())}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                date === todayYYYYMMDD()
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-surface hover:bg-surface-hover",
              )}
            >
              Today
            </button>
            <button
              onClick={() => setDate((d) => shiftDate(d, 1))}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover"
              aria-label="Next day"
            >
              Next →
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      </section>

      {/* Games */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-32"
            />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
          Failed to load games.{" "}
          <button
            onClick={() => refetch()}
            className="underline"
          >
            Retry
          </button>
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-muted-foreground">
          No games scheduled for this date.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.live.length > 0 && (
            <Section
              title="Live now"
              tone="live"
              count={grouped.live.length}
            >
              <Grid>
                {grouped.live.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                  />
                ))}
              </Grid>
            </Section>
          )}
          {grouped.upcoming.length > 0 && (
            <Section
              title="Upcoming"
              count={grouped.upcoming.length}
            >
              <Grid>
                {grouped.upcoming.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                  />
                ))}
              </Grid>
            </Section>
          )}
          {grouped.final.length > 0 && (
            <Section
              title="Final"
              count={grouped.final.length}
            >
              <Grid>
                {grouped.final.map((g) => (
                  <GameCard
                    key={g.id}
                    game={g}
                  />
                ))}
              </Grid>
            </Section>
          )}
        </div>
      )}

      {isFetching && !isLoading && (
        <p className="text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Refreshing…</p>
      )}
    </div>
  );
};

const Section = ({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "live";
  children: React.ReactNode;
}) => (
  <section>
    <div className="mb-3 flex items-center gap-2">
      {tone === "live" && <span className="live-dot" />}
      <h2
        className={cn(
          "font-display text-sm font-semibold uppercase tracking-[0.18em]",
          tone === "live" ? "text-live" : "text-muted-foreground",
        )}
      >
        {title}
      </h2>
      <span className="font-mono text-xs text-muted-foreground">{count}</span>
    </div>
    {children}
  </section>
);

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
);

export default Index;
