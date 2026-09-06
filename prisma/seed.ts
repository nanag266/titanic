import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type SeedVariant = { id: string; label: string; pricePesewas: null };

type SeedItem = {
  slug: string;
  name: string;
  category: string;
  image: string;
  sortOrder: number;
  featured?: boolean;
  variants?: SeedVariant[];
};

const items: SeedItem[] = [
  { slug: "groundnut", name: "Groundnut", category: "Starters", image: "/menu/page-02.webp", sortOrder: 1 },
  { slug: "spring-roll", name: "Spring Roll", category: "Starters", image: "/menu/page-02.webp", sortOrder: 2 },
  { slug: "samosa", name: "Samosa", category: "Starters", image: "/menu/page-02.webp", sortOrder: 3 },
  { slug: "chicken-wings-thighs", name: "Chicken Wings / Thighs", category: "Grills & Proteins", image: "/menu/page-03.webp", sortOrder: 10, featured: true },
  { slug: "turkey-wings", name: "Turkey Wings", category: "Grills & Proteins", image: "/menu/page-04.webp", sortOrder: 11, featured: true },
  { slug: "grilled-red-fish", name: "Grilled Red Fish", category: "Grills & Proteins", image: "/menu/page-05.webp", sortOrder: 12, featured: true },
  { slug: "grouper", name: "Grouper", category: "Grills & Proteins", image: "/menu/page-06.webp", sortOrder: 13 },
  { slug: "octopus-calamari", name: "Octopus / Calamari", category: "Grills & Proteins", image: "/menu/page-07.webp", sortOrder: 14 },
  { slug: "gizzard", name: "Gizzard", category: "Grills & Proteins", image: "/menu/page-08.webp", sortOrder: 15 },
  { slug: "goat-meat", name: "Goat Meat", category: "Grills & Proteins", image: "/menu/page-09.webp", sortOrder: 16 },
  { slug: "yam-chips", name: "Yam Chips", category: "Sides", image: "/menu/page-10.webp", sortOrder: 20 },
  { slug: "potato-chips", name: "Potato Chips", category: "Sides", image: "/menu/page-10.webp", sortOrder: 21 },
  {
    slug: "chicken-fried-rice",
    name: "Chicken with Fried Rice",
    category: "Rice Meals",
    image: "/menu/page-11.webp",
    sortOrder: 30,
    featured: true,
    variants: [
      { id: "grilled", label: "Grilled Chicken", pricePesewas: null },
      { id: "fried", label: "Fried Chicken", pricePesewas: null }
    ]
  },
  { slug: "assorted-fried-rice", name: "Assorted Fried Rice", category: "Rice Meals", image: "/menu/page-12.webp", sortOrder: 31, featured: true },
  {
    slug: "chicken-jollof-rice",
    name: "Chicken with Jollof Rice",
    category: "Rice Meals",
    image: "/menu/page-13.webp",
    sortOrder: 32,
    featured: true,
    variants: [
      { id: "grilled", label: "Grilled Chicken", pricePesewas: null },
      { id: "fried", label: "Fried Chicken", pricePesewas: null }
    ]
  },
  { slug: "assorted-jollof-rice", name: "Assorted Jollof Rice", category: "Rice Meals", image: "/menu/page-14.webp", sortOrder: 33, featured: true },
  {
    slug: "chicken-plain-rice",
    name: "Chicken with Plain Rice",
    category: "Rice Meals",
    image: "/menu/page-15.webp",
    sortOrder: 34,
    variants: [
      { id: "stew", label: "Chicken Stew", pricePesewas: null },
      { id: "grilled", label: "Grilled Chicken", pricePesewas: null },
      { id: "fried", label: "Fried Chicken", pricePesewas: null }
    ]
  },
  {
    slug: "banku-tilapia",
    name: "Banku & Tilapia",
    category: "Local Favourites",
    image: "/menu/page-16.webp",
    sortOrder: 40,
    featured: true,
    variants: [
      { id: "medium", label: "Medium", pricePesewas: null },
      { id: "large", label: "Large", pricePesewas: null }
    ]
  },
  { slug: "tilapia-light-soup", name: "Tilapia Light Soup", category: "Local Favourites", image: "/menu/page-17.webp", sortOrder: 41 },
  { slug: "goat-meat-light-soup", name: "Goat Meat Light Soup", category: "Local Favourites", image: "/menu/page-18.webp", sortOrder: 42 },
  {
    slug: "ewokple-abobitadi",
    name: "Ewokple Abobitadi",
    category: "Local Favourites",
    image: "/menu/page-19.webp",
    sortOrder: 43,
    variants: [
      { id: "medium", label: "Medium", pricePesewas: null },
      { id: "large", label: "Large", pricePesewas: null }
    ]
  },
  { slug: "akyeke", name: "Akyeke", category: "Local Favourites", image: "/menu/page-20.webp", sortOrder: 44 },
  { slug: "eba", name: "Eba", category: "Local Favourites", image: "/menu/page-21.webp", sortOrder: 45 }
];

const main = async () => {
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      phone: "+233 54 324 5511",
      address: "Titanic Beach, Tema, Ghana",
      restaurantPlaceId: "ChIJE7EZ2K-H3w8R8efP8YXbK-w",
      deliveryBaseFeePesewas: 400,
      deliveryPerKmPesewas: 150,
      deliveryPerMinutePesewas: 10,
      deliveryMinimumFeePesewas: 1000,
      deliveryTrafficWeight: 0.6,
      deliveryTrafficCap: 1.25,
      deliverySurgeMultiplier: 1,
      deliveryRoundToPesewas: 100
    }
  });

  for (const item of items) {
    await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        slug: item.slug,
        name: item.name,
        category: item.category,
        image: item.image,
        sortOrder: item.sortOrder,
        featured: item.featured ?? false,
        variants: item.variants ?? []
      }
    });
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
