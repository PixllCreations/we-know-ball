import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import GameAlerts from "./GameAlerts";
import type { Game } from "@/lib/nba-api";
const game = { id: "123", completed: false } as Game;
const permission = vi.fn();
const fetchMock = vi.fn();
const subscribe = vi.fn();
const getSubscription = vi.fn();
const unsubscribe = vi.fn();
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("PushManager", function () {});
  vi.stubGlobal("Notification", { requestPermission: permission });
  vi.stubGlobal("fetch", fetchMock);
  getSubscription.mockResolvedValue(null);
  const registration = { pushManager: { getSubscription, subscribe } };
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
    register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration),
  } });
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () =>
    url.endsWith("config") ? { publicKey: "AQID" } : { enabled: false },
  }));
  subscribe.mockResolvedValue({ toJSON: () => ({ endpoint: "https://fcm.googleapis.com/test" }) });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
it("requests permission on click, saves the subscription, and disables alerts", async () => {
  permission.mockResolvedValue("granted");
  render(<GameAlerts game={game} />);
  const button = await screen.findByRole("button", { name: "Enable alerts" });
  expect(permission).not.toHaveBeenCalled();
  fireEvent.click(button);
  await screen.findByRole("button", { name: "Disable alerts" });
  expect(permission).toHaveBeenCalledOnce();
  expect(subscribe).toHaveBeenCalledOnce();
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/push/games/123"), expect.objectContaining({ method: "PUT" }));
  fireEvent.click(screen.getByRole("button", { name: "Send test alert" }));
  await screen.findByText(/Test alert accepted/);
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/push/games/123/test"), expect.objectContaining({ method: "POST" }));
  fireEvent.click(screen.getByRole("button", { name: "Disable alerts" }));
  await screen.findByRole("button", { name: "Enable alerts" });
  expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "DELETE" }));
});
it("explains denied permission without subscribing", async () => {
  permission.mockResolvedValue("denied");
  render(<GameAlerts game={game} />);
  fireEvent.click(await screen.findByRole("button", { name: "Enable alerts" }));
  await screen.findByText(/Notifications are blocked/);
  expect(subscribe).not.toHaveBeenCalled();
});
it("replaces a subscription created with an old VAPID key", async () => {
  permission.mockResolvedValue("granted");
  getSubscription.mockResolvedValue({
    options: { applicationServerKey: new Uint8Array([9, 9, 9]).buffer },
    unsubscribe,
    toJSON: () => ({ endpoint: "https://web.push.apple.com/old" }),
  });
  unsubscribe.mockResolvedValue(true);
  render(<GameAlerts game={game} />);
  fireEvent.click(await screen.findByRole("button", { name: "Enable alerts" }));
  await screen.findByRole("button", { name: "Disable alerts" });
  expect(unsubscribe).toHaveBeenCalledOnce();
  expect(subscribe).toHaveBeenCalledOnce();
});
