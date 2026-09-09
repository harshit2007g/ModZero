import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "./lib/wagmi";
import Nav from "./components/Nav";
import AuroraBackground from "./components/AuroraBackground";
import PageTransition from "./components/PageTransition";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Dashboard from "./pages/Dashboard";
import Content from "./pages/Content";
import LicenseRequest from "./pages/LicenseRequest";
import Claim from "./pages/Claim";
import Feed from "./pages/Feed";
import NewPost from "./pages/NewPost";
import PostDetail from "./pages/PostDetail";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/upload" element={<PageTransition><Upload /></PageTransition>} />
        <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/content/:id" element={<PageTransition><Content /></PageTransition>} />
        <Route path="/license/:contentId" element={<PageTransition><LicenseRequest /></PageTransition>} />
        <Route path="/claim/:id" element={<PageTransition><Claim /></PageTransition>} />
        <Route path="/feed" element={<PageTransition><Feed /></PageTransition>} />
        <Route path="/post/new" element={<PageTransition><NewPost /></PageTransition>} />
        <Route path="/post/:id" element={<PageTransition><PostDetail /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuroraBackground />
          <Nav />
          <AnimatedRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;