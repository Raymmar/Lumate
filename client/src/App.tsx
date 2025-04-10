import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import Dashboard from "@/pages/Dashboard";
import PersonProfilePage from "@/pages/PersonProfilePage";
import VerifyPage from "@/pages/VerifyPage";
import LoginPage from "@/pages/LoginPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import UserSettingsPage from "@/pages/UserSettingsPage";
import CompanyProfilePage from "@/pages/CompanyProfilePage";
import CompaniesPage from "@/pages/CompaniesPage";
import CompanyPublicProfilePage from "@/pages/CompanyPublicProfilePage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminMembersPage from "@/pages/admin/AdminMembersPage";
import AdminEventsPage from "@/pages/admin/AdminEventsPage";
import AdminPeoplePage from "@/pages/admin/AdminPeoplePage";
import AdminCompaniesPage from "@/pages/admin/AdminCompaniesPage";
import RolesPage from "@/pages/admin/RolesPage";
import AboutPage from "@/pages/AboutPage";
import NotFound from "@/pages/not-found";
import SubscriptionSuccessPage from "@/pages/subscription/SuccessPage";
import SubscriptionCancelPage from "@/pages/subscription/CancelPage";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/about" component={AboutPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/settings" component={UserSettingsPage} />
          <Route path="/company-profile" component={CompanyProfilePage} />
          <Route path="/companies" component={CompaniesPage} />
          <Route path="/companies/:companyName" component={CompanyPublicProfilePage} />
          <Route path="/people/:username" component={PersonProfilePage} />
          <Route path="/verify" component={VerifyPage} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/members" component={AdminMembersPage} />
          <Route path="/admin/events" component={AdminEventsPage} />
          <Route path="/admin/people" component={AdminPeoplePage} />
          <Route path="/admin/companies" component={AdminCompaniesPage} />
          <Route path="/admin/roles" component={RolesPage} />
          <Route path="/subscription/success" component={SubscriptionSuccessPage} />
          <Route path="/subscription/cancel" component={SubscriptionCancelPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;