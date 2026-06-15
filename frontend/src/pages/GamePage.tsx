import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Skeleton from "@/components/Skeleton";
import { formatGameDate, getGame, Game, GameParticipant } from "@/lib/nba-api";
import { cn } from "@/lib/utils";

const participantLogo = (p: GameParticipant) => p.logo ?? p.logos?.[0]?.href;

const TeamSide = ({ team, reverse }: { team: GameParticipant; reverse?: boolean }) => {
  const logo = participantLogo(team);
  const record = team.records?.find((r) => r.type === "total")?.displayValue ?? team.records?.[0]?.displayValue;

  return (
    <div className={cn("flex flex-1 items-center gap-6", reverse && "flex-row-reverse text-right")}>
      {logo ? (
        <img
          src={logo}
          alt=""
          className="h-28 w-28 shrink-0 object-contain md:h-32 md:w-32"
        />
      ) : (
        <div className="h-28 w-28 shrink-0 rounded-full bg-muted md:h-32 md:w-32" />
      )}
      <div className="min-w-0 text-center">
        <div
          className={cn(
            "tabular font-display text-7xl font-bold leading-none md:text-8xl",
            team.winner ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {team.score || "—"}
        </div>
        <div className="mt-3 font-display text-2xl font-bold leading-tight md:text-3xl">{team.displayName}</div>
        <div className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground md:text-sm">
          {record ?? team.abbreviation}
        </div>
      </div>
    </div>
  );
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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        to="/"
        className="font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary"
      >
        ← Scoreboard
      </Link>

      <section className="rounded-2xl border border-border bg-gradient-court p-6 shadow-card md:p-8">
        <div className="mb-2 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {formatGameDate(game.date)}
        </div>

        {game.headline && (
          <p className="mb-4 text-center font-display text-lg font-semibold text-foreground/90">{game.headline}</p>
        )}

        <div className="mb-8 flex items-center justify-center gap-2 font-mono text-base uppercase tracking-widest md:text-lg">
          {isLive && <span className="live-dot" />}
          <span className={cn("text-muted-foreground", isLive && "text-live font-semibold")}>
            {game.detail || game.shortDetail || game.status}
          </span>
        </div>

        <div className="mx-auto flex max-w-3xl items-center justify-between gap-6">
          <TeamSide team={away} />
          <div className="font-display text-2xl font-bold uppercase tracking-widest text-muted-foreground md:text-3xl">
            {isFinal ? "final" : "vs"}
          </div>
          <TeamSide
            team={home}
            reverse
          />
        </div>

        {(game.venue || game.attendance) && (
          <div className="mt-8 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {game.venue?.fullName}
            {game.venue?.city && game.venue?.state && ` · ${game.venue.city}, ${game.venue.state}`}
            {game.attendance ? ` · ${game.attendance.toLocaleString()} attendance` : ""}
          </div>
        )}
      </section>

      {game.leaders && game.leaders.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Game leaders
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
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

      {game.notes && game.notes.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
          {game.notes.map((note) => (
            <p key={`${note.type}-${note.headline}`}>{note.headline}</p>
          ))}
        </section>
      )}
    </div>
  );
};

export default GamePage;
