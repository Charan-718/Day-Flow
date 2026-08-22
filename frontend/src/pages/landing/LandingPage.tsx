import { useState } from 'react';
import './landing.css';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import WorkflowBuilder from './components/WorkflowBuilder';
import RoiCalculator from './components/RoiCalculator';
import PricingSection from './components/PricingSection';
import TestimonialsSection from './components/TestimonialsSection';
import FaqSection from './components/FaqSection';
import Footer from './components/Footer';
import DemoModal from './components/DemoModal';
import { RoleEntry } from './RoleEntry';

/**
 * Public marketing page, ported from the standalone DayFlow-landing-page app.
 *
 * The `.dayflow-landing` class is what activates the ported stylesheet — its body/heading
 * rules are scoped to it (see landing.css) so they cannot leak into authenticated screens.
 */
export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div
      className="dayflow-landing landing-bg-grid-pattern"
      style={{ minHeight: '100vh', background: 'var(--color-background)' }}
    >
      <Navbar onOpenDemo={() => setDemoOpen(true)} />
      <main>
        <HeroSection onOpenDemo={() => setDemoOpen(true)} />
        <FeaturesSection />
        <WorkflowBuilder />
        <RoiCalculator />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <RoleEntry />
      </main>
      <Footer />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
