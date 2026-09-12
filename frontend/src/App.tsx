import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./lib/wagmi";
import Shell from "./components/layout/Shell";
import Feed from "./pages/Feed";
import { Loading } from "./components/ui";

/* The feed is the entry point so it stays in the main bundle. Everything else
   is split out — it cuts the initial download roughly in half. */
const Compose = lazy(() => import("./pages/Compose"));
const PostDetail = lazy(() => import("./pages/PostDetail"));
const Verify = lazy(() => import("./pages/Verify"));
const Content = lazy(() => import("./pages/Content"));
const LicenseRequest = lazy(() => import("./pages/LicenseRequest"));
const Claim = lazy(() => import("./pages/Claim"));
const Profile = lazy(() => import("./pages/Profile"));
const AllFeed = lazy(() => import("./pages/AllFeed"));
const Communities = lazy(() => import("./pages/Communities"));
const Community = lazy(() => import("./pages/Community"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function Fallback() {
  return (
    <div className="mx-auto max-w-[1440px] px-8">
      <Loading />
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<Fallback />}>
            <Routes>
              <Route element={<Shell />}>
                <Route path="/" element={<Feed />} />
                <Route path="/feed" element={<AllFeed />} />
                <Route path="/m" element={<Communities />} />
                <Route path="/m/:slug" element={<Community />} />
                <Route path="/compose" element={<Compose />} />
                <Route path="/post/:id" element={<PostDetail />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/content/:id" element={<Content />} />
                <Route path="/license/:contentId" element={<LicenseRequest />} />
                <Route path="/claim/:id" element={<Claim />} />
                <Route path="/u/:address" element={<Profile />} />
                <Route path="/studio" element={<Profile />} />
                {/* older paths, kept so existing links resolve */}
                <Route path="/post/new" element={<Navigate to="/compose" replace />} />
                <Route path="/upload" element={<Navigate to="/compose" replace />} />
                <Route path="/dashboard" element={<Navigate to="/studio" replace />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
