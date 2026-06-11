import { NextRequest } from "next/server";

const ALLOWED_HOSTS = new Set(["www.thesportsdb.com", "r2.thesportsdb.com"]);

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");

  if (!rawUrl) {
    return new Response("Missing url parameter.", { status: 400 });
  }

  let imageUrl: URL;

  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return new Response("Invalid image url.", { status: 400 });
  }

  if (imageUrl.protocol !== "https:" || !ALLOWED_HOSTS.has(imageUrl.hostname)) {
    return new Response("Image host is not allowed.", { status: 403 });
  }

  const imageResponse = await fetch(imageUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
    },
    next: {
      revalidate: 60 * 60 * 24,
    },
  });

  if (!imageResponse.ok) {
    return new Response("Image request failed.", {
      status: imageResponse.status,
    });
  }

  const contentType = imageResponse.headers.get("content-type") || "";

  if (!contentType.startsWith("image/")) {
    return new Response("URL did not return an image.", { status: 415 });
  }

  return new Response(await imageResponse.arrayBuffer(), {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Content-Type": contentType,
    },
  });
}
