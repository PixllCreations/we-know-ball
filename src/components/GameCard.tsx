import { Link } from "react-router-dom";
import { Game } from "@/lib/nba-api";
import { cn } from "@/lib/utils";

interface Props {
  game: Game;
}

const TeamRow = ({
  logo,
  abbr,
  name,
  record,
  score,
  isWinner,
  isLive,
}: {
  logo?: string;
  abbr: string;
  name: string;
  record?: string;
  score: string;
  isWinner: boolean;
  isLive: boolean;
}) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <div className="flex min-w-0 items-center gap-3">
      {logo ? (
        <img src={logo} alt={`${name} logo`} className="h-8 w-8 object-contain" loading="lazy" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-muted" />
      )}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-bold tracking-wide">{abbr}</span>
          <span className="truncate text-xs text-muted-foreground">{name}</span>
        </div>
        {record && <div className="font-mono text-[10px] text-muted-foreground">{record}</div>}
      </div>
    </div>
    <div
      className={cn(
        "tabular font-display text-2xl font-bold leading-none",
        !score && "text-muted-foreground",
        isLive && "text-primary",
        !isLive && !isWinner && score && "text-muted-foreground",
      )}
    >
      {score || "—"}
    </div>
  </div>
);

const GameCard = ({ game }: Props) => {
  const comp = game.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home")!;
  const away = comp.competitors.find((c) => c.homeAway === "away")!;
  const state = game.status.type.state;
  const isLive = state === "in";
  const isFinal = state === "post";
  const broadcast = comp.broadcasts?.[0]?.names?.[0];

  return (
    <Link
      to={`/games/${game.id}`}
      className={cn(
        "group block rounded-xl border border-border bg-gradient-stat p-4 shadow-card transition-all",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated",
      )}
    >
      <div className="mb-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          {isLive && <span className="live-dot" />}
          <span
            className={cn(
              "text-muted-foreground",
              isLive && "text-live font-semibold",
              isFinal && "text-foreground",
            )}
          >
            {game.status.type.shortDetail}
          </span>
        </div>
        {broadcast && <span className="text-muted-foreground">{broadcast}</span>}
      </div>

      <div className="divide-y divide-border/50">
        <TeamRow
          logo={away.team.logo}
          abbr={away.team.abbreviation}
          name={away.team.shortDisplayName}
          record={away.records?.[0]?.summary}
          score={away.score}
          isWinner={!!away.winner}
          isLive={isLive}
        />
        <TeamRow
          logo={home.team.logo}
          abbr={home.team.abbreviation}
          name={home.team.shortDisplayName}
          record={home.records?.[0]?.summary}
          score={home.score}
          isWinner={!!home.winner}
          isLive={isLive}
        />
      </div>
    </Link>
  );
};

export default GameCard;
