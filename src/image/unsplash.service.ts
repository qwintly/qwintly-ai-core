import crypto from "crypto";
import { BuilderElement } from "../types/elements.js";

export interface ResolvedImage {
  id: string;
  alt: string;
  imageUrl: string;
  thumbUrl: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
  width: number;
  height: number;
}

type UnsplashConfig = {
  url: string;
  accessKey: string;
};

let unsplashConfig: UnsplashConfig | null = null;

const cache = new Map<string, ResolvedImage>();

export function initUnsplash(
  config: Partial<UnsplashConfig> | null | undefined,
) {
  const url = String(config?.url ?? "").trim();
  const accessKey = String(config?.accessKey ?? "").trim();

  if (!url || !accessKey) {
    unsplashConfig = null;
    return;
  }

  unsplashConfig = {
    url: url.replace(/\/+$/, ""),
    accessKey,
  };
}

function hashIntent(imgQuery: string) {
  return crypto.createHash("sha256").update(imgQuery).digest("hex");
}

function scoreImage(photo: any) {
  let score = 0;

  score += (photo.likes || 0) * 0.3;

  if (photo.width > photo.height) {
    score += 50;
  }

  score += (photo.user.total_photos || 0) * 0.05;

  return score;
}

export async function searchUnsplashImage(
  imgQuery: string,
): Promise<ResolvedImage | null> {
  console.log("searchUnsplashImage", imgQuery);
  const cfg = unsplashConfig;
  if (!cfg) throw new Error("Unsplash not configured");

  const cacheKey = hashIntent(imgQuery);

  const cached = cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    imgQuery,
    per_page: "10",
  });

  const response = await fetch(
    `${cfg.url}/search/photos?${params.toString()}`,
    {
      headers: {
        Authorization: `Client-ID ${cfg.accessKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Unsplash API failed: ${response.status}`);
  }

  const data = await response.json();

  const photos = data.results;

  if (!photos.length) {
    return null;
  }

  const ranked = [...photos].sort((a, b) => {
    return scoreImage(b) - scoreImage(a);
  });

  const top3 = ranked.slice(0, 3);

  const selected = top3[Math.floor(Math.random() * top3.length)];

  // IMPORTANT:
  // Required by Unsplash API terms
  // Tracks image download usage
  if (selected.links.download_location) {
    await fetch(selected.links.download_location, {
      headers: {
        Authorization: `Client-ID ${cfg.accessKey}`,
      },
    });
  }

  const resolved: ResolvedImage = {
    id: selected.id,
    alt: imgQuery,

    imageUrl: selected.urls.regular,
    thumbUrl: selected.urls.small,

    photographer: selected.user.name,
    photographerUrl: selected.user.links.html,

    unsplashUrl: selected.links.html,

    width: selected.width,
    height: selected.height,
  };

  cache.set(cacheKey, resolved);

  return resolved;
}

export const resolveUnsplashImageForElement = async (
  el: BuilderElement,
  alt: string,
): Promise<void> => {
  if (!unsplashConfig) return;
  const query = String(alt ?? "").trim();
  if (!query) return;
  if (el.props?.src) {
    console.log("src already exists, skipping");
    return;
  }
  try {
    const resolved = await searchUnsplashImage(query);
    if (!resolved?.imageUrl) return;

    const anyEl = el as any;
    if (!anyEl.props || typeof anyEl.props !== "object") anyEl.props = {};
    anyEl.props.src = resolved.imageUrl;
    anyEl.props.alt = query;
  } catch {
    // Ignore Unsplash lookup errors and still allow prop updates.
  }
};

export const resolveUnsplashImagesDeep = async (
  el: BuilderElement,
): Promise<void> => {
  const anyEl = el as any;

  if (anyEl?.type === "image") {
    const alt = String(anyEl?.props?.alt ?? "").trim();
    resolveUnsplashImageForElement(el, alt);
  }

  const kids = anyEl?.children;
  if (Array.isArray(kids)) {
    for (const child of kids) {
      await resolveUnsplashImagesDeep(child);
    }
  }
};
