export type AdCategory = "Shop" | "Product";

export interface Ad {
  id: string;
  category: AdCategory;
  title: string;
  description: string;
  image: string;
  price?: string;
  location: string;
  contact: string;
  createdAt: string;
  featured: boolean;
}

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const IMAGES = {
  store: photo("photo-1604719312566-8912e9227c6a"),
  cafe: photo("photo-1554118811-1e0d58224f24"),
  boutique: photo("photo-1441986300917-64674bd600d8"),
  studio: photo("photo-1524758631624-e2822e304c36"),
  bakery: photo("photo-1509440159596-0249088772ff"),
  books: photo("photo-1507842217343-583bb7270b66"),
  restaurant: photo("photo-1517248135467-4c7edcad34c4"),
  office: photo("photo-1497366754035-f200968a6e72"),
} as const;

export const imageOptions = [
  { label: "Retail store", value: IMAGES.store },
  { label: "Café", value: IMAGES.cafe },
  { label: "Boutique", value: IMAGES.boutique },
  { label: "Studio", value: IMAGES.studio },
  { label: "Bakery", value: IMAGES.bakery },
  { label: "Books", value: IMAGES.books },
  { label: "Restaurant", value: IMAGES.restaurant },
  { label: "Office", value: IMAGES.office },
];

export const allowedImages = new Set<string>(Object.values(IMAGES));

export const seedAds: Ad[] = [
  {
    id: "ad-1",
    category: "Shop",
    title: "Turnkey café space in SoHo",
    description:
      "Fitted café with espresso bar, seating for 28 and a bright street-facing window. Ready to open.",
    image: IMAGES.cafe,
    price: "$6,800/mo",
    location: "SoHo, Manhattan",
    contact: "hello@shopspace.app",
    createdAt: "2026-11-18",
    featured: true,
  },
  {
    id: "ad-2",
    category: "Product",
    title: "Artisan sourdough — wholesale",
    description:
      "Slow-fermented country loaves baked daily. Supplying cafés and grocers across the city.",
    image: IMAGES.bakery,
    price: "From $6/loaf",
    location: "Brooklyn, NY",
    contact: "bakery@shopspace.app",
    createdAt: "2026-11-17",
    featured: false,
  },
  {
    id: "ad-3",
    category: "Product",
    title: "Hand-thrown ceramic tableware",
    description:
      "Small-batch plates, bowls and cups in warm glazes. Perfect for restaurants and home shops.",
    image: IMAGES.studio,
    price: "From $24",
    location: "Queens, NY",
    contact: "studio@shopspace.app",
    createdAt: "2026-11-16",
    featured: false,
  },
  {
    id: "ad-4",
    category: "Shop",
    title: "Bright studio with street frontage",
    description:
      "Open-plan studio with tall windows, a private workroom and strong foot traffic on weekends.",
    image: IMAGES.studio,
    price: "$3,950/mo",
    location: "Williamsburg, Brooklyn",
    contact: "space@shopspace.app",
    createdAt: "2026-11-15",
    featured: false,
  },
  {
    id: "ad-5",
    category: "Product",
    title: "Cold brew concentrate, 1-gallon kegs",
    description:
      "Smooth, low-acid concentrate made from single-origin beans. Keeps for two weeks refrigerated.",
    image: IMAGES.cafe,
    price: "$42/keg",
    location: "Lower East Side, NY",
    contact: "coffee@shopspace.app",
    createdAt: "2026-11-14",
    featured: false,
  },
  {
    id: "ad-6",
    category: "Shop",
    title: "Corner retail unit — Williamsburg",
    description:
      "Glass corner unit opposite the park. Ideal for a flagship brand, gallery or neighborhood shop.",
    image: IMAGES.boutique,
    price: "$5,200/mo",
    location: "Williamsburg, Brooklyn",
    contact: "leases@shopspace.app",
    createdAt: "2026-11-13",
    featured: true,
  },
];
