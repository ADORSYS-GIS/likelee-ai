import "./App.css";
import Pages from "@/pages";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/auth/AuthProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { createPersistedQueryClient } from "@/lib/queryClient";

const queryClient = createPersistedQueryClient();

export default // Trigger CI
function App() {
  const isPublicShareRoute = (() => {
    try {
      const path = window.location?.pathname || "";
      return path.startsWith("/share/package/") || path.startsWith("/share/catalog/");
    } catch {
      return false;
    }
  })();

  return (
    <>
      <QueryClientProvider client={queryClient}>
        {isPublicShareRoute ? (
          <Pages />
        ) : (
          <AuthProvider>
            <Pages />
          </AuthProvider>
        )}
      </QueryClientProvider>
      <Toaster />
    </>
  );
}
