import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import TeamAlerts from "./TeamAlerts";

const permission = vi.fn();
const subscribe = vi.fn();
const getSubscription = vi.fn();

beforeEach(() => {
  vi.stubGlobal("Notification", { requestPermission: permission });
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  vi.stubGlobal("PushManager", function PushManager() {});
  const registration = { pushManager: { getSubscription, subscribe } };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
    register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration),
  } });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => ({
    ok: true, json: async () => url.endsWith("config") ? { publicKey: "AQID" } : { enabled: false },
  })));
  permission.mockResolvedValue("granted");
  subscribe.mockResolvedValue({ toJSON: () => ({ endpoint: "https://fcm.googleapis.com/test" }) });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("subscribes to the team endpoint", async () => {
  render(<TeamAlerts teamId="7" teamName="Lakers" />);
  fireEvent.click(await screen.findByRole("button", { name: "Enable alerts" }));
  await screen.findByRole("button", { name: "Disable alerts" });
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/push/teams/7"), expect.objectContaining({ method: "PUT" }));
  expect(screen.getByText(/every Lakers game/)).toBeInTheDocument();
});
