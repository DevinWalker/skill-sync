import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/app-shell";
import { HomePage } from "./pages/home";
import { LibraryPage } from "./pages/library";
import { TargetsPage } from "./pages/targets";
import { ActivityPage } from "./pages/activity";
import { PackagesPage } from "./pages/packages";
import { SettingsPage } from "./pages/settings";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "targets", element: <TargetsPage /> },
      { path: "activity", element: <ActivityPage /> },
      { path: "packages", element: <PackagesPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
