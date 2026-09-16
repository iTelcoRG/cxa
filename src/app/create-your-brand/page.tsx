import type { Metadata } from "next";
import { ApparelCategoryGrid } from "../../components/apparel-category-grid.tsx";

export const metadata: Metadata = {
  title: "Create Your Brand | CXA",
  description: "Start with an apparel category, choose your garment and add branding details to request a tailored CXA quote.",
  alternates: { canonical: "/create-your-brand" },
};

const journey = ["Choose your apparel", "Select colours and quantities", "Choose a branding technique", "Add artwork details", "Request a quote"];

function JourneyIcon({ step }: { step: number }) {
  const paths = [
    "M9 4 4 7 1 13l5 3 2-4v16h16V12l2 4 5-3-3-6-5-3c-1 5-13 5-14 0Z",
    "M7 5h18v18H7ZM3 11v18h18M12 10h8v8h-8Z",
    "M6 4h20v9H6ZM10 13v7h12v-7M3 26h26M8 30h16",
    "M6 3h15l6 6v21H6ZM21 3v7h6M10 25l5-6 4 4 3-3M12 13h.01",
    "M7 3h14l6 6v21H7ZM21 3v7h6M12 15h10M12 20h10M12 25h6",
  ];
  return <svg aria-hidden="true" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={paths[step]} /></svg>;
}

export default function CreateYourBrand() {
  return <main className="page-shell shell create-brand-page">
    <header className="page-heading">
      <h1 id="choose-category-title">Start with the right base.</h1>
      <p>Start by choosing an apparel category. Find your garment, then add your colours, sizes and branding details for a tailored quote.</p>
    </header>
    <section aria-labelledby="choose-category-title" className="launch-categories">
      <ApparelCategoryGrid />
    </section>
    <section className="create-brand-journey" aria-labelledby="journey-title">
      <h2 id="journey-title">Your next steps</h2>
      <ol role="list">{journey.map((step, index) => <li key={step}>
        <div className="journey-card-top"><span className="journey-number" aria-hidden="true">{index + 1}</span><JourneyIcon step={index} /></div>
        <h3>{step}</h3>
      </li>)}</ol>
      <p>We review your requirements and confirm your quote before production.</p>
    </section>
  </main>;
}
