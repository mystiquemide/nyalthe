import SiteNav from "./components/site/SiteNav";
import Hero from "./components/site/Hero";
import HowItWorks from "./components/site/HowItWorks";
import PrivateByDesign from "./components/site/PrivateByDesign";
import ProofModel from "./components/site/ProofModel";
import TrustBoundary from "./components/site/TrustBoundary";

export default function Page() {
  return (
    <>
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
        <PrivateByDesign />
        <ProofModel />
        <TrustBoundary />
      </main>
    </>
  );
}
