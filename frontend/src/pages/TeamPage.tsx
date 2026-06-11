import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import { getTeam, getTeamRoster, getTeamSchedule, formatGameDate } from "@/lib/nba-api";
import { cn } from "@/lib/utils";

const inchesToFeet = (inches?: number) => {
  if (!inches) return "—";
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
};

const TeamPage = () => {
  const { id = "" } = useParams();

  const teamQ = useQuery({ queryKey: ["team", id], queryFn: () => getTeam(id), enabled: !!id });
  const rosterQ = useQuery({
    queryKey: ["roster", id],
    queryFn: () => getTeamRoster(id),
    enabled: !!id,
  });
  const scheduleQ = useQuery({
    queryKey: ["schedule", id],
    queryFn: () => getTeamSchedule(id),
    enabled: !!id,
  });

  if (teamQ.isLoading) return <Skeleton className="h-72" />;
  if (teamQ.isError || !teamQ.data) return <p className="text-destructive">Failed to load team.</p>;

  const team = teamQ.data.team;
  const summary = team.record?.items?.[0]?.summary;
  const stats = team.record?.items?.[0]?.stats ?? [];
  const accent = team.color ? `#${team.color}` : "hsl(var(--primary))";

  return (
    <div className="space-y-10">
      <Link
        to="/teams"
        className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary"
      >
        ← All teams
      </Link>

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-border p-8 shadow-card"
        style={{
          background: `radial-gradient(circle at 0% 0%, ${accent}33, transparent 60%), hsl(var(--surface))`,
        }}
      >
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          {team.logos?.[0]?.href && (
            <img
              src={team.logos[0].href}
              alt={`${team.displayName} logo`}
              className="h-32 w-32 object-contain"
            />
          )}
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {team.location}
            </p>
            <h1 className="mt-1 font-display text-5xl font-bold tracking-tight">{team.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              {summary && (
                <span className="rounded-md border border-border bg-surface-elevated px-3 py-1 font-mono">
                  {summary}
                </span>
              )}
              {team.standingSummary && (
                <span className="text-muted-foreground">{team.standingSummary}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      {stats.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {stats.slice(0, 6).map((s) => (
            <div
              key={s.name}
              className="rounded-lg border border-border bg-gradient-stat p-4"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.name}
              </div>
              <div className="mt-1 tabular font-display text-2xl font-bold">{s.value}</div>
            </div>
          ))}
        </section>
      )}

      {/* Roster + schedule */}
      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Roster
          </h2>
          {rosterQ.isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <table className="w-full text-sm tabular">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2 w-12">#</th>
                    <th className="px-4 py-2">Player</th>
                    <th className="px-3 py-2">Pos</th>
                    <th className="px-3 py-2 text-right">Ht</th>
                    <th className="px-3 py-2 text-right">Wt</th>
                    <th className="px-3 py-2 text-right">Age</th>
                    <th className="px-3 py-2 text-right">Exp</th>
                  </tr>
                </thead>
                <tbody>
                  {rosterQ.data?.athletes?.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/60 last:border-0 hover:bg-surface-hover"
                    >
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {p.jersey ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2.5">
                          {p.headshot?.href ? (
                            <img
                              src={p.headshot.href}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover bg-muted"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted" />
                          )}
                          <span className="font-medium">{p.displayName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.position?.abbreviation ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">{inchesToFeet(p.height)}</td>
                      <td className="px-3 py-2 text-right">{p.weight ? `${p.weight}` : "—"}</td>
                      <td className="px-3 py-2 text-right">{p.age ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{p.experience?.years ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Schedule
          </h2>
          {scheduleQ.isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <div className="space-y-2">
              {scheduleQ.data?.events?.slice(0, 12).map((g) => {
                const comp = g.competitions?.[0];
                if (!comp) return null;
                const opp = comp.competitors?.find((c) => c.team.id !== id);
                const me = comp.competitors?.find((c) => c.team.id === id);
                const isHome = me?.homeAway === "home";
                const state = g.status?.type?.state;
                const won = me?.winner;
                return (
                  <Link
                    key={g.id}
                    to={`/games/${g.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {opp?.team.logo && (
                        <img
                          src={opp.team.logo}
                          alt=""
                          className="h-8 w-8 object-contain"
                          loading="lazy"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          <span className="text-muted-foreground">{isHome ? "vs" : "@"}</span>{" "}
                          {opp?.team.abbreviation}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatGameDate(g.date)}
                        </div>
                      </div>
                    </div>
                    {state === "post" ? (
                      <div
                        className={cn(
                          "text-right tabular text-sm font-semibold",
                          won ? "text-success" : "text-muted-foreground",
                        )}
                      >
                        <div>{won ? "W" : "L"}</div>
                        <div className="font-mono text-[10px]">
                          {me?.score}-{opp?.score}
                        </div>
                      </div>
                    ) : (
                      <div className="font-mono text-[10px] uppercase text-muted-foreground">
                        {g.status?.type?.shortDetail ?? formatGameDate(g.date)}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default TeamPage;
