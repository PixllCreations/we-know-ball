import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import { getGameSummary } from "@/lib/nba-api";
import { cn } from "@/lib/utils";

const GamePage = () => {
  const { id = "" } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["game", id],
    queryFn: () => getGameSummary(id),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !data) return <p className="text-destructive">Failed to load game.</p>;

  const comp = data.header.competitions[0];
  const status = comp.status;
  const home = comp.competitors.find((c) => c.homeAway === "home")!;
  const away = comp.competitors.find((c) => c.homeAway === "away")!;
  const isLive = status.type.state === "in";
  const periods = Math.max(home.linescores?.length ?? 0, away.linescores?.length ?? 0, 4);

  return (
    <div className="space-y-10">
      <Link to="/" className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary">
        ← Scoreboard
      </Link>

      {/* Header */}
      <section className="rounded-2xl border border-border bg-gradient-court p-8 shadow-card">
        <div className="mb-6 flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider">
          {isLive && <span className="live-dot" />}
          <span className={cn("text-muted-foreground", isLive && "text-live font-semibold")}>
            {status.type.detail}
          </span>
        </div>

        <div className="grid grid-cols-3 items-center gap-4">
          <TeamSide team={away} />
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">vs</div>
          </div>
          <TeamSide team={home} reverse />
        </div>

        {/* Linescore */}
        <div className="mt-8 overflow-x-auto">
          <table className="mx-auto text-sm tabular">
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-1 text-left">Team</th>
                {Array.from({ length: periods }).map((_, i) => (
                  <th key={i} className="px-3 py-1 text-right">
                    {i < 4 ? `Q${i + 1}` : `OT${i - 3}`}
                  </th>
                ))}
                <th className="px-4 py-1 text-right text-foreground">T</th>
              </tr>
            </thead>
            <tbody>
              {[away, home].map((t) => (
                <tr key={t.id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-display font-semibold">{t.team.abbreviation}</td>
                  {Array.from({ length: periods }).map((_, i) => (
                    <td key={i} className="px-3 py-2 text-right text-muted-foreground">
                      {t.linescores?.[i]?.value ?? "—"}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-display font-bold">{t.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Team box stats */}
      {data.boxscore?.teams && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Team stats
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            <table className="w-full text-sm tabular">
              <thead>
                <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 text-left">Stat</th>
                  <th className="px-4 py-2 text-right">{away.team.abbreviation}</th>
                  <th className="px-4 py-2 text-right">{home.team.abbreviation}</th>
                </tr>
              </thead>
              <tbody>
                {data.boxscore.teams[0].statistics.map((stat, idx) => {
                  const homeStat = data.boxscore!.teams[1].statistics[idx];
                  return (
                    <tr key={stat.name} className="border-b border-border/60 last:border-0 hover:bg-surface-hover">
                      <td className="px-4 py-2 text-muted-foreground">{stat.label}</td>
                      <td className="px-4 py-2 text-right">{stat.displayValue}</td>
                      <td className="px-4 py-2 text-right">{homeStat?.displayValue ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Player box scores */}
      {data.boxscore?.players?.map((teamBox) => (
        <PlayerBox key={teamBox.team.id} teamBox={teamBox} />
      ))}
    </div>
  );
};

const TeamSide = ({ team, reverse }: { team: any; reverse?: boolean }) => (
  <div className={cn("flex items-center gap-4", reverse && "flex-row-reverse text-right")}>
    {team.team.logo && (
      <img src={team.team.logo} alt="" className="h-20 w-20 object-contain" />
    )}
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {team.records?.[0]?.summary}
      </div>
      <div className="font-display text-2xl font-bold leading-tight">{team.team.shortDisplayName}</div>
      <div
        className={cn(
          "tabular mt-1 font-display text-5xl font-bold leading-none",
          team.winner ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {team.score}
      </div>
    </div>
  </div>
);

const PlayerBox = ({ teamBox }: { teamBox: any }) => {
  const stats = teamBox.statistics?.[0];
  if (!stats) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {teamBox.team.logo && <img src={teamBox.team.logo} alt="" className="h-5 w-5" />}
        {teamBox.team.displayName}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 text-left">Player</th>
              {stats.names.map((n: string) => (
                <th key={n} className="px-2 py-2 text-right">
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.athletes.map((a: any) => (
              <tr
                key={a.athlete.id}
                className={cn(
                  "border-b border-border/60 last:border-0 hover:bg-surface-hover",
                  a.didNotPlay && "opacity-50",
                )}
              >
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className="font-medium">{a.athlete.shortName}</span>
                  {a.starter && <span className="ml-1 text-[10px] text-primary">★</span>}
                  {a.athlete.position?.abbreviation && (
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      {a.athlete.position.abbreviation}
                    </span>
                  )}
                </td>
                {a.stats.map((s: string, i: number) => (
                  <td key={i} className="px-2 py-2 text-right">
                    {s || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default GamePage;
