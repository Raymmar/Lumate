import { Switch, Route, Redirect } from "wouter";
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
import NewsPage from "@/pages/NewsPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminMembersPage from "@/pages/admin/AdminMembersPage";
import AdminEventsPage from "@/pages/admin/AdminEventsPage";
import AdminPeoplePage from "@/pages/admin/AdminPeoplePage";
import AdminCompaniesPage from "@/pages/admin/AdminCompaniesPage";
import AdminSponsorsPage from "@/pages/admin/AdminSponsorsPage";
import AdminSummitsPage from "@/pages/admin/AdminSummitsPage";
import IndustriesPage from "@/pages/admin/IndustriesPage";
import RolesPage from "@/pages/admin/RolesPage";
import BadgesPage from "@/pages/admin/BadgesPage";
import AdminCouponsPage from "@/pages/admin/AdminCouponsPage";
import AdminPostsPage from "@/pages/admin/AdminPostsPage";
import AboutPage from "@/pages/AboutPage";
import SummitHubPage from "@/pages/SummitHubPage";
import SummitYearPage from "@/pages/SummitYearPage";
import LegacySummit2026Page from "@/pages/legacy/LegacySummit2026Page";
import LegacySummit2025Page from "@/pages/legacy/LegacySummit2025Page";
import SponsorShowcasePage from "@/pages/SponsorShowcasePage";
import MembershipsPage from "@/pages/MembershipsPage";
import NotFound from "@/pages/not-found";
import SubscriptionSuccessPage from "@/pages/subscription/SuccessPage";
import SubscriptionCancelPage from "@/pages/subscription/CancelPage";
import { ArticlePage } from "@/pages/ArticlePage";
import { EventPage } from "@/pages/EventPage";
import SpeakersPage from "@/pages/SpeakersPage";
import CardCreatorPage from "@/pages/CardCreatorPage";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/about" component={AboutPage} />
          <Route path="/summit" component={SummitHubPage} />
          <Route path="/summit/:year" component={SummitYearPage} />
          {/* Original summit pages, kept for side-by-side comparison until the new pages are approved */}
          <Route path="/summit-original/2026" component={LegacySummit2026Page} />
          <Route path="/summit-original/2025" component={LegacySummit2025Page} />
          <Route path="/summit2025">
            <Redirect to="/summit/2025" replace />
          </Route>
          <Route path="/news" component={NewsPage} />
          <Route path="/post/:title" component={ArticlePage} />
          <Route path="/event/:title" component={EventPage} />
          <Route path="/login" component={LoginPage} />
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/settings" component={UserSettingsPage} />
          <Route path="/company-profile" component={CompanyProfilePage} />
          <Route path="/companies" component={CompaniesPage} />
          <Route path="/companies/:companySlug" component={CompanyPublicProfilePage} />
          <Route path="/speakers" component={SpeakersPage} />
          <Route path="/card-creator" component={CardCreatorPage} />
          <Route path="/people/:username" component={PersonProfilePage} />
          <Route path="/memberships" component={MembershipsPage} />
          <Route path="/verify" component={VerifyPage} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/members" component={AdminMembersPage} />
          <Route path="/admin/events" component={AdminEventsPage} />
          <Route path="/admin/posts" component={AdminPostsPage} />
          <Route path="/admin/coupons" component={AdminCouponsPage} />
          <Route path="/admin/people" component={AdminPeoplePage} />
          <Route path="/admin/companies" component={AdminCompaniesPage} />
          <Route path="/admin/sponsors" component={AdminSponsorsPage} />
          <Route path="/admin/summits" component={AdminSummitsPage} />
          <Route path="/admin/industries" component={IndustriesPage} />
          <Route path="/admin/badges" component={BadgesPage} />
          <Route path="/admin/roles" component={RolesPage} />
          <Route path="/admin/sponsor-showcase" component={SponsorShowcasePage} />
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