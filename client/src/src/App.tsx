import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AccountSetup from "./pages/AccountSetup";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import UserManagement from "./pages/UserManagement";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={AccountSetup} />
      <Route path={"/login"} component={Login} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/users"} component={UserManagement} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
