import "./App.css";
import Pages from "@/pages";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/auth/AuthProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

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
