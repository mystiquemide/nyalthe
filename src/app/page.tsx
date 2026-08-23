import SiteNav from "./components/site/SiteNav";
import Hero from "./components/site/Hero";
import HowItWorks from "./components/site/HowItWorks";

export default function Page() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
      </main>
    </>
  );
}
