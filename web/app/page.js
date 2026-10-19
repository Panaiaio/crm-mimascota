import { Preloader } from '@/components/ui/Preloader';
import { Navbar } from '@/components/layout/Navbar';
import { Hero } from '@/components/sections/Hero';
import { Services } from '@/components/sections/Services';
import { Process } from '@/components/sections/Process';
import { About } from '@/components/sections/About';
import { Specialties } from '@/components/sections/Specialties';
import { Team } from '@/components/sections/Team';
import { Testimonials } from '@/components/sections/Testimonials';
import { Faq } from '@/components/sections/Faq';
import { Contact } from '@/components/sections/Contact';
import { Footer } from '@/components/layout/Footer';
import { Marquee } from '@/components/ui/Marquee';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import { FloatingActions } from '@/components/ui/FloatingActions';

export default function Home() {
  return (
    <>
      <Preloader />
      <ScrollProgress />
      <Navbar />
      <main id="main-content">
        <Hero />
        <Marquee />
        <Services />
        <Process />
        <About />
        <Specialties />
        <Team />
        <Testimonials />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <FloatingActions />
    </>
  );
}
