import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { CompareBar } from "./CompareBar";
import { MainWithCompareSpacer } from "./MainWithCompareSpacer";
import { PageTransition } from "./PageTransition";
import { ScrollToTopOnRouteChange } from "./ScrollToTopOnRouteChange";
import { BookingsProvider } from "@/lib/bookingsStore";
import { CompareProvider } from "@/lib/compareStore";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <BookingsProvider>
      <CompareProvider>
        <ScrollToTopOnRouteChange />
        <div className="flex min-h-screen flex-col relative z-10 bg-transparent">
          <Navbar />
          <main className="flex-1 relative z-10 bg-transparent">
            <MainWithCompareSpacer>
              <PageTransition>{children}</PageTransition>
            </MainWithCompareSpacer>
          </main>
          <Footer />
          <CompareBar />
        </div>
      </CompareProvider>
    </BookingsProvider>
  );
}
