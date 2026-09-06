import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = async () => {
  const items = await db.menuItem.findMany({
    where: { available: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
  return Response.json({ items });
};
