import { SiteBehaviorController } from '@/components/behaviors/SiteBehaviorController';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MenuFlipbookController } from '@/components/menu/MenuFlipbookController';
import { MenuModal } from '@/components/menu/MenuModal';
import { BookingModal } from '@/components/reservation/BookingModal';
import { ReservationToast } from '@/components/reservation/ReservationToast';
import { ReservationAuthNotice } from '@/components/reservation/ReservationAuthNotice';
import { FloatingAccountMenu } from '@/components/account/FloatingAccountMenu';
import { AboutSection } from '@/components/sections/AboutSection';
import { EventsSection } from '@/components/sections/EventsSection';
import { ExperiencePillarsSection } from '@/components/sections/ExperiencePillarsSection';
import { GallerySection } from '@/components/sections/GallerySection';
import { HeroSection } from '@/components/sections/HeroSection';
import { MenuSection } from '@/components/sections/MenuSection';
import { PairingsSection } from '@/components/sections/PairingsSection';
import { ReservationSection } from '@/components/sections/ReservationSection';

export default function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/style.css" />
      <link rel="stylesheet" href="/assets/css/menu-flipbook.css" />
      <Header />
      <ReservationAuthNotice />
      <HeroSection />
      <AboutSection />
      <ExperiencePillarsSection />
      <PairingsSection />
      <MenuSection />
      <EventsSection />
      <ReservationSection />
      <GallerySection />
      <Footer />
      <BookingModal />
      <MenuModal />
      <ReservationToast />
      <SiteBehaviorController />
      <MenuFlipbookController />
      <FloatingAccountMenu />
    </>
  );
}
