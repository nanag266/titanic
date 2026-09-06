import "dotenv/config";
import PocketBase from "pocketbase";

const url = process.env.POCKETBASE_URL;
const email = process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !email || !password) throw new Error("Set POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD before seeding.");

const pb = new PocketBase(url);

const variants = (entries: Array<[string, string]>) => entries.map(([id, label]) => ({ id, label, pricePesewas: null }));
const items = [
  ["groundnut", "Groundnut", "Starters", "/menu/page-02.webp", 1], ["spring-roll", "Spring Roll", "Starters", "/menu/page-02.webp", 2], ["samosa", "Samosa", "Starters", "/menu/page-02.webp", 3],
  ["chicken-wings-thighs", "Chicken Wings / Thighs", "Grills & Proteins", "/menu/page-03.webp", 10, true], ["turkey-wings", "Turkey Wings", "Grills & Proteins", "/menu/page-04.webp", 11, true], ["grilled-red-fish", "Grilled Red Fish", "Grills & Proteins", "/menu/page-05.webp", 12, true], ["grouper", "Grouper", "Grills & Proteins", "/menu/page-06.webp", 13], ["octopus-calamari", "Octopus / Calamari", "Grills & Proteins", "/menu/page-07.webp", 14], ["gizzard", "Gizzard", "Grills & Proteins", "/menu/page-08.webp", 15], ["goat-meat", "Goat Meat", "Grills & Proteins", "/menu/page-09.webp", 16],
  ["yam-chips", "Yam Chips", "Sides", "/menu/page-10.webp", 20], ["potato-chips", "Potato Chips", "Sides", "/menu/page-10.webp", 21],
  ["chicken-fried-rice", "Chicken with Fried Rice", "Rice Meals", "/menu/page-11.webp", 30, true, variants([["grilled", "Grilled Chicken"], ["fried", "Fried Chicken"]])], ["assorted-fried-rice", "Assorted Fried Rice", "Rice Meals", "/menu/page-12.webp", 31, true], ["chicken-jollof-rice", "Chicken with Jollof Rice", "Rice Meals", "/menu/page-13.webp", 32, true, variants([["grilled", "Grilled Chicken"], ["fried", "Fried Chicken"]])], ["assorted-jollof-rice", "Assorted Jollof Rice", "Rice Meals", "/menu/page-14.webp", 33, true], ["chicken-plain-rice", "Chicken with Plain Rice", "Rice Meals", "/menu/page-15.webp", 34, false, variants([["stew", "Chicken Stew"], ["grilled", "Grilled Chicken"], ["fried", "Fried Chicken"]])],
  ["banku-tilapia", "Banku & Tilapia", "Local Favourites", "/menu/page-16.webp", 40, true, variants([["medium", "Medium"], ["large", "Large"]])], ["tilapia-light-soup", "Tilapia Light Soup", "Local Favourites", "/menu/page-17.webp", 41], ["goat-meat-light-soup", "Goat Meat Light Soup", "Local Favourites", "/menu/page-18.webp", 42], ["ewokple-abobitadi", "Ewokple Abobitadi", "Local Favourites", "/menu/page-19.webp", 43, false, variants([["medium", "Medium"], ["large", "Large"]])], ["akyeke", "Akyeke", "Local Favourites", "/menu/page-20.webp", 44], ["eba", "Eba", "Local Favourites", "/menu/page-21.webp", 45]
] as Array<[string, string, string, string, number, boolean | undefined, Array<{ id: string; label: string; pricePesewas: null }> | undefined]>;

const main = async () => {
await pb.collection("_superusers").authWithPassword(email, password);
try {
  const config = await pb.collection("site_config").getFirstListItem("id != ''");
  if (config.maxDeliveryKm === 25) await pb.collection("site_config").update(config.id, { maxDeliveryKm: 50 });
} catch {
  await pb.collection("site_config").create({ restaurantName: "Titanic City Ventures", tagline: "A Place to Be!", heroTitle: "Accra's table, turned all the way up.", heroSubtitle: "Bold Ghanaian favourites, grills, rice dishes and more — ordered online and delivered across our Accra service area.", phone: "+233 54 324 5511", whatsapp: "", address: "Titanic Beach, Tema, Ghana", restaurantPlaceId: "ChIJE7EZ2K-H3w8R8efP8YXbK-w", deliveryBaseFeePesewas: 400, deliveryPerKmPesewas: 150, deliveryPerMinutePesewas: 10, deliveryMinimumFeePesewas: 1000, deliveryTrafficWeight: 0.6, deliveryTrafficCap: 1.25, deliverySurgeMultiplier: 1, deliveryRoundToPesewas: 100, maxDeliveryKm: 50, serviceMinLat: 5.45, serviceMaxLat: 5.75, serviceMinLng: -0.35, serviceMaxLng: -0.05, ordersEnabled: true });
}

for (const [slug, name, category, image, sortOrder, featured = false, itemVariants = []] of items) {
  const data = { slug, name, category, image, sortOrder, featured, variants: itemVariants, available: true, pricePesewas: null, description: null };
  try {
    const existing = await pb.collection("menu_items").getFirstListItem(`slug = "${slug}"`);
    await pb.collection("menu_items").update(existing.id, data);
  } catch {
    await pb.collection("menu_items").create(data);
  }
}
console.log(`Seeded ${items.length} PocketBase menu items.`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
