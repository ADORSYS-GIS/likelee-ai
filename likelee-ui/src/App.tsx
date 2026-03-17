import "./App.css";
import Pages from "@/pages";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/auth/AuthProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/queryClient";

const queryClient = createQueryClient();

export default // Trigger CI
function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Pages />
        </AuthProvider>
      </QueryClientProvider>
      <Toaster />
    </>
  );
}
