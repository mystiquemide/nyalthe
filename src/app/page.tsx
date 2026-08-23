import SiteNav from "./components/site/SiteNav";
import Hero from "./components/site/Hero";
import HowItWorks from "./components/site/HowItWorks";
import PrivateByDesign from "./components/site/PrivateByDesign";

export default function Page() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
        <PrivateByDesign />
      </main>
    </>
  );
}
