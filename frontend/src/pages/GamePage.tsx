import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import GameAlerts from "@/components/GameAlerts";
import { BoxscorePlayerLine, BoxscorePlayers, Game, GameParticipant, formatGameDate, getGame } from "@/lib/nba-api";
import { cn } from "@/lib/utils";

const participantLogo = (p: GameParticipant) => p.logo ?? p.logos?.[0]?.href;

const normalizedText = (value?: string) => value?.trim().replace(/\s+/g, " ").toLocaleLowerCase();

const TeamSide = ({ team, reverse }: { team: GameParticipant; reverse?: boolean }) => {
  const logo = participantLogo(team);
  const record = team.records?.find((r) => r.type === "total")?.displayValue ?? team.records?.[0]?.displayValue;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 text-center sm:gap-3 md:flex-1 md:flex-row md:gap-6 md:text-left",
        reverse && "md:flex-row-reverse md:text-right",
      )}
    >
      {logo ? (
        <img
          src={logo}
          alt=""
          className="h-16 w-16 shrink-0 object-contain min-[400px]:h-20 min-[400px]:w-20 sm:h-24 sm:w-24 md:h-32 md:w-32"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-full bg-muted min-[400px]:h-20 min-[400px]:w-20 sm:h-24 sm:w-24 md:h-32 md:w-32" />
      )}
      <div className="min-w-0 text-center">
        <div
          className={cn(
            "tabular font-display text-4xl font-bold leading-none min-[400px]:text-5xl sm:text-6xl md:text-8xl",
            team.winner ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {team.score || "—"}
        </div>
        <div className="mt-2 break-words font-display text-sm font-bold leading-tight min-[400px]:text-base sm:text-xl md:mt-3 md:text-3xl">
          <span className="sm:hidden">{team.abbreviation}</span>
          <span className="hidden sm:inline">{team.displayName}</span>
        </div>
        {record ? (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs md:text-sm">
            {record}
          </div>
        ) : (
          <div className="mt-1 hidden font-mono text-xs uppercase tracking-wider text-muted-foreground sm:block md:text-sm">
            {team.abbreviation}
          </div>
        )}
      </div>
    </div>
  );
};

const teamLogo = (team: { logo?: string; logos?: { href: string }[] }) => team.logo ?? team.logos?.[0]?.href;

const playerColumns = (block: BoxscorePlayers) => {
  const labels = block.columns;
  const preferred = ["MIN", "PTS", "FG", "3PT", "FT", "REB", "AST", "TO", "STL", "BLK", "+/-"];
  const shown = preferred.filter((p) => labels.includes(p));
  return shown.length > 0 ? shown : labels;
};

const columnIndex = (block: BoxscorePlayers, col: string) => {
  const labels = block.columns;
  return labels.indexOf(col);
};

const playerStatForColumn = (block: BoxscorePlayers, line: BoxscorePlayerLine, col: string) => {
  const idx = columnIndex(block, col);
  if (idx < 0) return "—";
  return line.values?.[idx] ?? "—";
};

const totalForColumn = (block: BoxscorePlayers, col: string) => {
  const idx = columnIndex(block, col);
  if (idx < 0) return "—";
  return block.totalsRow?.[idx] ?? "—";
};

const GamePage = () => {
  const { id = "" } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["game", id],
    queryFn: () => getGame(id),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (isError || !data) return <p className="text-destructive">Failed to load game.</p>;

  return <GameDetail game={data} />;
};

const GameDetail = ({ game }: { game: Game }) => {
  const { home, away } = game;
  const isLive = game.state === "in";
  const isFinal = game.state === "post";
  const statusText = game.detail || game.shortDetail || game.status;
  const headline = [statusText, game.name, game.shortName].some(
    (value) => normalizedText(value) === normalizedText(game.headline),
  )
    ? undefined
    : game.headline;
  const notes = (game.notes ?? []).filter(
    (note, index, allNotes) =>
      ![headline, statusText, game.name, game.shortName].some(
        (value) => normalizedText(value) === normalizedText(note.headline),
      ) &&
      allNotes.findIndex((candidate) => normalizedText(candidate.headline) === normalizedText(note.headline)) === index,
  );
  const boxscoreTeams = game.boxscore?.teams ?? [];
  const boxscorePlayers = game.boxscore?.players ?? [];
  const [viewMode, setViewMode] = useState<"team" | "player">("team");
  const [selectedSide, setSelectedSide] = useState<"away" | "home">("away");
  const awayTeam = boxscoreTeams.find((t) => t.homeAway === "away") ?? boxscoreTeams[0];
  const homeTeam = boxscoreTeams.find((t) => t.homeAway === "home") ?? boxscoreTeams[1];
  const homeStatsMap = new Map((homeTeam?.stats ?? []).map((s) => [s.name, s]));
  const teamStatsRows = (awayTeam?.stats ?? []).map((a) => ({
    key: a.name,
    label: a.label || a.abbreviation || a.name,
    away: a.displayValue,
    home: homeStatsMap.get(a.name)?.displayValue ?? "—",
  }));
  const selectedTeamBlock = useMemo(
    () =>
      boxscoreTeams.find((t) => t.homeAway === selectedSide) ??
      (selectedSide === "away" ? awayTeam : homeTeam),
    [boxscoreTeams, selectedSide, awayTeam, homeTeam],
  );
  const selectedPlayerBlock = useMemo(() => {
    const picked = boxscorePlayers.find((p) => p.team.id === selectedTeamBlock?.team.id);
    return picked ?? (selectedSide === "away" ? boxscorePlayers[0] : boxscorePlayers[1]) ?? boxscorePlayers[0];
  }, [boxscorePlayers, selectedTeamBlock?.team.id, selectedSide]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        to="/"
        className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary"
      >
        ← Scoreboard
      </Link>

      <section className="rounded-2xl border border-border bg-gradient-court px-3 py-5 shadow-card min-[400px]:px-4 sm:p-6 md:p-8">
        <div className="mb-2 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {formatGameDate(game.date)}
        </div>

        {headline && (
          <p className="mb-4 text-center font-display text-base font-semibold text-foreground/90 sm:text-lg">{headline}</p>
        )}

        <div className="mb-6 flex items-center justify-center gap-2 text-center font-mono text-xs uppercase tracking-widest sm:text-base md:mb-8 md:text-lg">
          {isLive && <span className="live-dot" />}
          <span className={cn("text-muted-foreground", isLive && "text-live font-semibold")}>
            {statusText}
          </span>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 min-[400px]:gap-3 sm:gap-5 md:flex md:justify-between md:gap-6">
          <TeamSide team={away} />
          <div className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground min-[400px]:text-sm sm:text-xl sm:tracking-widest md:text-3xl">
            {isFinal ? "final" : "vs"}
          </div>
          <TeamSide
            team={home}
            reverse
          />
        </div>

        {(game.venue || game.attendance) && (
          <div className="mt-6 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs md:mt-8">
            {game.venue?.fullName}
            {game.venue?.city && game.venue?.state && ` · ${game.venue.city}, ${game.venue.state}`}
            {game.attendance ? ` · ${game.attendance.toLocaleString()} attendance` : ""}
          </div>
        )}
      </section>

      <GameAlerts key={game.id} game={game} />

      {game.leaders && game.leaders.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Game leaders
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {game.leaders.map((leader) => (
              <div
                key={`${leader.category}-${leader.athlete}`}
                className="rounded-xl border border-border bg-surface p-4 shadow-card"
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {leader.displayName}
                </div>
                <div className="mt-1 font-medium">{leader.athlete}</div>
                <div className="mt-1 tabular font-display text-2xl font-bold">{leader.value}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(boxscoreTeams.length > 0 || boxscorePlayers.length > 0) && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Box scores
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode("team")}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors",
                  viewMode === "team"
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                )}
              >
                Team Boxscore
              </button>
              <button
                type="button"
                onClick={() => setViewMode("player")}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors",
                  viewMode === "player"
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                )}
              >
                Player Boxscores
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedSide("away")}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors",
                selectedSide === "away"
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
              )}
            >
              {away.abbreviation}
            </button>
            <button
              type="button"
              onClick={() => setSelectedSide("home")}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors",
                selectedSide === "home"
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground",
              )}
            >
              {home.abbreviation}
            </button>
          </div>

          {viewMode === "team" && selectedTeamBlock && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <header className="flex items-center gap-2 border-b border-border bg-gradient-stat px-4 py-3">
                {teamLogo(selectedTeamBlock.team) && (
                  <img
                    src={teamLogo(selectedTeamBlock.team)}
                    alt=""
                    className="h-6 w-6 object-contain"
                  />
                )}
                <h3 className="font-display text-base font-semibold">{selectedTeamBlock.team.displayName}</h3>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular">
                  <thead>
                    <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Stat</th>
                      <th className="px-3 py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTeamBlock.stats ?? []).map((row) => (
                      <tr
                        key={row.name}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-3 py-2 font-medium">{row.label || row.abbreviation || row.name}</td>
                        <td className="px-3 py-2 text-right">{row.displayValue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === "player" && selectedPlayerBlock && (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <header className="flex items-center gap-2 border-b border-border bg-gradient-stat px-4 py-3">
                {teamLogo(selectedPlayerBlock.team) && (
                  <img
                    src={teamLogo(selectedPlayerBlock.team)}
                    alt=""
                    className="h-6 w-6 object-contain"
                  />
                )}
                <h3 className="font-display text-base font-semibold">{selectedPlayerBlock.team.displayName}</h3>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular">
                  <thead>
                    <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Player</th>
                      {playerColumns(selectedPlayerBlock).map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-right"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPlayerBlock.rows.map((line) => (
                      <tr
                        key={line.player.id}
                        className="border-b border-border/60 last:border-0 hover:bg-surface-hover"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {line.player.headshot && (
                              <img
                                src={line.player.headshot}
                                alt=""
                                className="h-7 w-7 rounded-full bg-muted object-cover"
                              />
                            )}
                            <span className="font-medium">{line.player.displayName}</span>
                            {line.didNotPlay && (
                              <span className="font-mono text-[10px] text-muted-foreground">DNP</span>
                            )}
                          </div>
                        </td>
                        {playerColumns(selectedPlayerBlock).map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 text-right"
                          >
                            {playerStatForColumn(selectedPlayerBlock, line, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {selectedPlayerBlock.totalsRow && selectedPlayerBlock.totalsRow.length > 0 && (
                      <tr className="bg-surface-elevated font-semibold">
                        <td className="px-3 py-2">Team</td>
                        {playerColumns(selectedPlayerBlock).map((col) => (
                          <td
                            key={col}
                            className="px-3 py-2 text-right"
                          >
                            {totalForColumn(selectedPlayerBlock, col)}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {notes.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          {notes.map((note) => (
            <p key={`${note.type}-${note.headline}`}>{note.headline}</p>
          ))}
        </section>
      )}
    </div>
  );
};

export default GamePage;
