import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { WorkflowSection } from '@/components/landing/WorkflowSection';
import { McpSection } from '@/components/landing/McpSection';
import { ToolkitSection } from '@/components/landing/ToolkitSection';
import { PresentationsSection } from '@/components/landing/PresentationsSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">
      <LandingNavbar />
      <main>
        <HeroSection />
        <WorkflowSection />
        <ToolkitSection />
        <PresentationsSection />
        <McpSection />
        <FaqSection />
      </main>
      <LandingFooter />
    </div>
  );
}
