import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import Dashboard from "@/pages/Dashboard";
import PersonProfilePage from "@/pages/PersonProfilePage";
import VerifyPage from "@/pages/VerifyPage";
import LoginPage from "@/pages/LoginPage";
import UserSettingsPage from "@/pages/UserSettingsPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <main> {/*The provided change would apply here if a main element with the specified class existed*/}
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/login" component={LoginPage} />
          <Route path="/settings" component={UserSettingsPage} />
          <Route path="/people/:id" component={PersonProfilePage} />
          <Route path="/verify" component={VerifyPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;