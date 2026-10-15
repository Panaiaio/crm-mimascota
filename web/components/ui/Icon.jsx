import {
  CalendarCheck,
  Cat,
  Clock,
  Dog,
  Heart,
  MessageCircleHeart,
  PawPrint,
  Mail,
  MapPin,
  Microscope,
  Phone,
  Scissors,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Toothbrush
} from 'lucide-react';

// Traduce el nombre de icono usado en data/site.js al componente de lucide-react
const icons = {
  calendar: CalendarCheck,
  heart: Heart,
  message: MessageCircleHeart,
  paw: PawPrint,
  cat: Cat,
  clock: Clock,
  dog: Dog,
  mail: Mail,
  'map-pin': MapPin,
  microscope: Microscope,
  phone: Phone,
  scissors: Scissors,
  'shield-check': ShieldCheck,
  stethoscope: Stethoscope,
  syringe: Syringe,
  toothbrush: Toothbrush
};

export const Icon = ({ name, size = 20, strokeWidth = 1.5, ...props }) => {
  const Component = icons[name];
  if (!Component) return null;
  return <Component size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" {...props} />;
};
