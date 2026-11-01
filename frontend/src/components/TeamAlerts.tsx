import PushAlerts from "./PushAlerts";

export default function TeamAlerts({ teamId, teamName }: { teamId: string; teamName: string }) {
  return <PushAlerts
    path={`teams/${encodeURIComponent(teamId)}`}
    title={`${teamName} alerts`}
    description="Tipoff, each quarter, halftime and final score for every team game. This device stays subscribed across games."
    enabledMessage={`Alerts enabled for every ${teamName} game on this device.`}
    disabledMessage={`Team alerts disabled for ${teamName} on this device.`}
    unavailableMessage="Could not load team alerts. Reload to try again."
  />;
}
