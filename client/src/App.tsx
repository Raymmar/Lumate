import { lazy, Suspense, startTransition, useEffect, useState } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { PageLoader } from "@/components/PageLoader";
// The home page and not-found page stay in the main bundle: home is the most
// common entry point and should never flash a loader.
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

// Every other page is downloaded only when its route is visited.
const PersonProfilePage = lazy(() => import("@/pages/PersonProfilePage"));
const VerifyPage = lazy(() => import("@/pages/VerifyPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));
const UserSettingsPage = lazy(() => import("@/pages/UserSettingsPage"));
const CompanyProfilePage = lazy(() => import("@/pages/CompanyProfilePage"));
const CompaniesPage = lazy(() => import("@/pages/CompaniesPage"));
const CompanyPublicProfilePage = lazy(() => import("@/pages/CompanyPublicProfilePage"));
const NewsPage = lazy(() => import("@/pages/NewsPage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const SummitHubPage = lazy(() => import("@/pages/SummitHubPage"));
const SummitYearPage = lazy(() => import("@/pages/SummitYearPage"));
const LegacySummit2026Page = lazy(() => import("@/pages/legacy/LegacySummit2026Page"));
const LegacySummit2025Page = lazy(() => import("@/pages/legacy/LegacySummit2025Page"));
const MembershipsPage = lazy(() => import("@/pages/MembershipsPage"));
const SubscriptionSuccessPage = lazy(() => import("@/pages/subscription/SuccessPage"));
const SubscriptionCancelPage = lazy(() => import("@/pages/subscription/CancelPage"));
const ArticlePage = lazy(() => import("@/pages/ArticlePage").then((m) => ({ default: m.ArticlePage })));
const EventPage = lazy(() => import("@/pages/EventPage").then((m) => ({ default: m.EventPage })));
const SpeakersPage = lazy(() => import("@/pages/SpeakersPage"));
const CardCreatorPage = lazy(() => import("@/pages/CardCreatorPage"));

// Admin screens: never downloaded unless an admin route is opened.
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminMembersPage = lazy(() => import("@/pages/admin/AdminMembersPage"));
const AdminEventsPage = lazy(() => import("@/pages/admin/AdminEventsPage"));
const AdminPeoplePage = lazy(() => import("@/pages/admin/AdminPeoplePage"));
const AdminCompaniesPage = lazy(() => import("@/pages/admin/AdminCompaniesPage"));
const AdminSponsorsPage = lazy(() => import("@/pages/admin/AdminSponsorsPage"));
const AdminSummitsPage = lazy(() => import("@/pages/admin/AdminSummitsPage"));
const AdminAgendaPage = lazy(() => import("@/pages/admin/AdminAgendaPage"));
const AdminSpeakersPage = lazy(() => import("@/pages/admin/AdminSpeakersPage"));
const IndustriesPage = lazy(() => import("@/pages/admin/IndustriesPage"));
const RolesPage = lazy(() => import("@/pages/admin/RolesPage"));
const BadgesPage = lazy(() => import("@/pages/admin/BadgesPage"));
const AdminCouponsPage = lazy(() => import("@/pages/admin/AdminCouponsPage"));
const AdminPostsPage = lazy(() => import("@/pages/admin/AdminPostsPage"));
const SponsorShowcasePage = lazy(() => import("@/pages/SponsorShowcasePage"));

/**
 * Routes on a location that changes inside a transition, so while the next
 * page's code downloads, the current page stays on screen instead of being
 * replaced by the loader. The loader only shows on a fresh load.
 */
function useTransitionedLocation() {
  const [browserLocation] = useLocation();
  const [location, setLocation] = useState(browserLocation);

  useEffect(() => {
    if (browserLocation !== location) {
      startTransition(() => setLocation(browserLocation));
    }
  }, [browserLocation, location]);

  return location;
}

function Router() {
  const location = useTransitionedLocation();

  return (
    <div className="min-h-screen bg-background">
      <main>
        <Suspense fallback={<PageLoader />}>
          <Switch location={location}>
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
            <Route path="/admin/agenda" component={AdminAgendaPage} />
            <Route path="/admin/speakers" component={AdminSpeakersPage} />
            <Route path="/admin/industries" component={IndustriesPage} />
            <Route path="/admin/badges" component={BadgesPage} />
            <Route path="/admin/roles" component={RolesPage} />
            <Route path="/admin/sponsor-showcase" component={SponsorShowcasePage} />
            <Route path="/subscription/success" component={SubscriptionSuccessPage} />
            <Route path="/subscription/cancel" component={SubscriptionCancelPage} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
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
