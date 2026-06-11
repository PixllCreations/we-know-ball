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
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        to="/"
        className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary"
      >
        ← Scoreboard
      </Link>

      {/* Header */}
      <section className="rounded-2xl border border-border bg-gradient-court p-6 shadow-card md:p-8">
        <div className="mb-8 flex items-center justify-center gap-2 font-mono text-base uppercase tracking-widest md:text-lg">
          {isLive && <span className="live-dot" />}
          <span className={cn("text-muted-foreground", isLive && "text-live font-semibold")}>
            {status.type.detail}
          </span>
        </div>

        <div className="mx-auto flex max-w-3xl items-center justify-between gap-6">
          <TeamSide team={away} />
          <div className="font-display text-2xl font-bold uppercase tracking-widest text-muted-foreground md:text-3xl">
            vs
          </div>
          <TeamSide
            team={home}
            reverse
          />
        </div>

        {/* Linescore */}
        <div className="mt-10 overflow-x-auto">
          <table className="mx-auto text-lg tabular md:text-xl">
            <thead>
              <tr className="font-mono text-xs uppercase tracking-wider text-muted-foreground md:text-sm">
                <th className="px-5 py-2 text-left">Team</th>
                {Array.from({ length: periods }).map((_, i) => (
                  <th
                    key={i}
                    className="px-5 py-2 text-right"
                  >
                    {i < 4 ? `Q${i + 1}` : `OT${i - 3}`}
                  </th>
                ))}
                <th className="px-6 py-2 text-right text-foreground">T</th>
              </tr>
            </thead>
            <tbody>
              {[away, home].map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-border/60"
                >
                  <td className="px-5 py-3 font-display text-xl font-semibold md:text-2xl">
                    {t.team.abbreviation}
                  </td>
                  {Array.from({ length: periods }).map((_, i) => {
                    const ls = t.linescores?.[i] as any;
                    const val = ls?.displayValue ?? ls?.value;
                    return (
                      <td
                        key={i}
                        className="px-5 py-3 text-right text-muted-foreground"
                      >
                        {val ?? "—"}
                      </td>
                    );
                  })}
                  <td className="px-6 py-3 text-right font-display font-bold">{t.score}</td>
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
                  <th className="w-32 px-4 py-2 text-right">{away.team.abbreviation}</th>
                  <th className="w-32 px-4 py-2 text-right">{home.team.abbreviation}</th>
                </tr>
              </thead>
              <tbody>
                {data.boxscore.teams[0].statistics.map((stat, idx) => {
                  const homeStat = data.boxscore!.teams[1].statistics[idx];
                  return (
                    <tr
                      key={stat.name}
                      className="border-b border-border/60 last:border-0 hover:bg-surface-hover"
                    >
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
        <PlayerBox
          key={teamBox.team.id}
          teamBox={teamBox}
        />
      ))}
    </div>
  );
};

const TeamSide = ({ team, reverse }: { team: any; reverse?: boolean }) => {
  const logo = team.team.logo ?? team.team.logos?.[0]?.href;
  const recordSummary =
    team.records?.[0]?.summary ??
    team.record?.find?.((r: any) => r.type === "total")?.summary ??
    team.record?.[0]?.summary;
  return (
    <div className={cn("flex flex-1 items-center gap-6", reverse && "flex-row-reverse text-right")}>
      {logo && (
        <img
          src={logo}
          alt=""
          className="h-28 w-28 shrink-0 object-contain md:h-32 md:w-32"
        />
      )}
      <div className="min-w-0 text-center">
        <div
          className={cn(
            "tabular font-display text-7xl font-bold leading-none md:text-8xl",
            team.winner ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {team.score}
        </div>
        <div className="mt-3 font-display text-2xl font-bold leading-tight md:text-3xl">
          {team.team.shortDisplayName ??
            team.team.displayName ??
            team.team.name ??
            team.team.abbreviation}
        </div>
        <div className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground md:text-sm">
          {recordSummary}
        </div>
      </div>
    </div>
  );
};

const PlayerBox = ({ teamBox }: { teamBox: any }) => {
  const stats = teamBox.statistics?.[0];
  if (!stats) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {(teamBox.team.logo ?? teamBox.team.logos?.[0]?.href) && (
          <img
            src={teamBox.team.logo ?? teamBox.team.logos?.[0]?.href}
            alt=""
            className="h-5 w-5"
          />
        )}
        {teamBox.team.displayName}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
        <table className="w-full text-sm tabular">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2 text-left">Player</th>
              {stats.names.map((n: string) => (
                <th
                  key={n}
                  className="px-2 py-2 text-right"
                >
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
                  <td
                    key={i}
                    className="px-2 py-2 text-right"
                  >
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
