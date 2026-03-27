/**
 * Service Worker Registration
 *
 * Registers the service worker for background sync and offline support.
 * Call register() in main.tsx or App.tsx
 */

const SW_ENABLED =
  import.meta.env.PROD || import.meta.env.VITE_SW_ENABLED === "true";

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    console.log("[SW] Service workers not supported");
    return null;
  }

  if (!SW_ENABLED) {
    console.log("[SW] Service worker disabled in development");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[SW] Service worker registered:", registration.scope);

    // Check for updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // New version available
            console.log("[SW] New version available");
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error("[SW] Failed to register service worker:", error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    console.log("[SW] Service worker unregistered");
  } catch (error) {
    console.error("[SW] Failed to unregister service worker:", error);
  }
}

/**
 * Register a background sync event
 */
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    if ("sync" in registration) {
      await (registration as any).sync.register(tag);
      console.log("[SW] Registered sync:", tag);
    } else {
      console.log("[SW] Background sync not supported");
    }
  } catch (error) {
    console.error("[SW] Failed to register sync:", error);
  }
}

/**
 * Register periodic background sync (if supported)
 */
export async function registerPeriodicSync(
  tag: string,
  minInterval: number,
): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;

    if ("periodicSync" in registration) {
      const status = await navigator.permissions.query({
        name: "periodic-background-sync" as any,
      });

      if (status.state === "granted") {
        await (registration as any).periodicSync.register(tag, {
          minInterval,
        });
        console.log("[SW] Registered periodic sync:", tag);
      }
    } else {
      console.log("[SW] Periodic sync not supported");
    }
  } catch (error) {
    console.error("[SW] Failed to register periodic sync:", error);
  }
}

/**
 * Send message to service worker
 */
export async function sendMessageToSW(message: any): Promise<any> {
  if (!("serviceWorker" in navigator)) return null;

  const controller = navigator.serviceWorker.controller;
  if (!controller) return null;

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    controller.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Check if service worker is active
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    return !!registration.active;
  } catch {
    return false;
  }
}
