import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Skeleton from "@/components/Skeleton";
import { getStandings, StandingsTeam } from "@/lib/nba-api";
import { cn } from "@/lib/utils";

const COLS: { key: string; label: string; align?: "right" }[] = [
  { key: "wins", label: "W", align: "right" },
  { key: "losses", label: "L", align: "right" },
  { key: "winPercent", label: "PCT", align: "right" },
  { key: "gamesBehind", label: "GB", align: "right" },
  { key: "streak", label: "STRK", align: "right" },
];

function statValue(team: StandingsTeam, key: string) {
  const s = team.stats.find((x) => x.name === key);
  return s?.displayValue ?? "—";
}

const ConferenceTable = ({ name, teams }: { name: string; teams: StandingsTeam[] }) => (
  <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
    <header className="flex items-center justify-between border-b border-border bg-gradient-stat px-5 py-3">
      <h2 className="font-display text-lg font-bold tracking-tight">{name}</h2>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {teams.length} teams
      </span>
    </header>
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-2 w-10">#</th>
            <th className="px-4 py-2">Team</th>
            {COLS.map((c) => (
              <th key={c.key} className={cn("px-3 py-2", c.align === "right" && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((entry, i) => {
            const t = entry.team;
            const seedClass =
              i < 6
                ? "text-success"
                : i < 10
                ? "text-warning"
                : "text-muted-foreground";
            return (
              <tr
                key={t.id}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-hover"
              >
                <td className={cn("px-4 py-3 font-mono text-xs font-semibold", seedClass)}>
                  {i + 1}
                </td>
                <td className="px-4 py-3">
                  <Link to={`/teams/${t.id}`} className="flex items-center gap-2.5 group">
                    {t.logos?.[0]?.href ? (
                      <img src={t.logos[0].href} alt="" className="h-6 w-6 object-contain" loading="lazy" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-muted" />
                    )}
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {t.displayName}
                    </span>
                  </Link>
                </td>
                {COLS.map((c) => (
                  <td key={c.key} className={cn("px-3 py-3 text-foreground/90", c.align === "right" && "text-right")}>
                    {statValue(entry, c.key)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);

const Standings = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["standings"],
    queryFn: getStandings,
  });

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Standings</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Conference standings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Top 6 clinch playoffs · 7–10 enter the play-in tournament.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[640px]" />
          <Skeleton className="h-[640px]" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm">
          Failed to load standings.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.children.map((conf) => (
            <ConferenceTable
              key={conf.abbreviation}
              name={`${conf.name}ern Conference`.replace(/ernern/, "ern")}
              teams={conf.standings.entries}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Standings;
