import americanBullyImg from '../assets/images/american_bully_breed_1795757734284.jpg';
import exoticBullImg from '../assets/images/exotic_bull_breed_1795757734201.jpg';
import frenchBulldogImg from '../assets/images/french_bulldog_breed_1795757735140.jpg';
import englishBulldogImg from '../assets/images/english_bulldog_breed_1795757735186.jpg';
import caneCorsoImg from '../assets/images/cane_corso_breed_1795757736072.jpg';
import pastorBelgaMalinoisImg from '../assets/images/pastor_belga_malinois_1795757736600.jpg';
import pastorAlemanImg from '../assets/images/pastor_aleman_breed_1795757736441.jpg';
import dobermanImg from '../assets/images/doberman_pinscher_breed_1795757737198.jpg';
import rottweilerImg from '../assets/images/rottweiler_breed_1795757738221.jpg';
import apbtImg from '../assets/images/american_pitbull_terrier_1795757739252.jpg';
import nanoBullImg from '../assets/images/nano_bull_special_1795757766482.jpg';
import heroBannerImg from '../assets/images/inbr_hero_banner_1795757740124.jpg';

export const BREED_IMAGES = {
  americanBully: americanBullyImg,
  exoticBull: exoticBullImg,
  frenchBulldog: frenchBulldogImg,
  englishBulldog: englishBulldogImg,
  caneCorso: caneCorsoImg,
  pastorBelgaMalinois: pastorBelgaMalinoisImg,
  pastorAleman: pastorAlemanImg,
  doberman: dobermanImg,
  rottweiler: rottweilerImg,
  apbt: apbtImg,
  nanoBull: nanoBullImg,
  heroBanner: heroBannerImg,
} as const;

export function getBreedImageByIdOrName(idOrName: string): string {
  const s = (idOrName || '').toLowerCase();
  if (s.includes('pastor-aleman') || s.includes('pastor alemán') || s.includes('pastor aleman') || s.includes('german shepherd')) {
    return BREED_IMAGES.pastorAleman;
  }
  if (s.includes('malinois') || s.includes('pastor-belga') || s.includes('pastor belga')) {
    return BREED_IMAGES.pastorBelgaMalinois;
  }
  if (s.includes('french') || s.includes('francés') || s.includes('frances')) {
    return BREED_IMAGES.frenchBulldog;
  }
  if (s.includes('english') || s.includes('inglés') || s.includes('ingles')) {
    return BREED_IMAGES.englishBulldog;
  }
  if (s.includes('cane-corso') || s.includes('cane corso')) {
    return BREED_IMAGES.caneCorso;
  }
  if (s.includes('doberman')) {
    return BREED_IMAGES.doberman;
  }
  if (s.includes('rottweiler')) {
    return BREED_IMAGES.rottweiler;
  }
  if (s.includes('pit') || s.includes('apbt')) {
    return BREED_IMAGES.apbt;
  }
  if (s.includes('nano')) {
    return BREED_IMAGES.nanoBull;
  }
  if (s.includes('exotic')) {
    return BREED_IMAGES.exoticBull;
  }
  if (s.includes('bully')) {
    return BREED_IMAGES.americanBully;
  }
  return '/logo-inbr.jpg';
}

export function isLegacyStockUrl(url?: string): boolean {
  if (!url) return true;
  return url.includes('images.unsplash.com');
}
