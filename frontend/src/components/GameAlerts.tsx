import type { Game } from "@/lib/nba-api";
import PushAlerts from "./PushAlerts";

export default function GameAlerts({ game }: { game: Game }) {
  return <PushAlerts
    path={`games/${encodeURIComponent(game.id)}`}
    title="Game alerts"
    description="Tipoff, each quarter, halftime and final score for this game. Alerts expire after seven days."
    enabledMessage="Alerts enabled on this device. You can close the site."
    disabledMessage="Alerts disabled for this game on this device."
    unavailableMessage="Could not load game alerts. Reload to try again."
    hideWhenDisabled={game.completed}
  />;
}
