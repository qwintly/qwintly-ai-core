import assert from "node:assert/strict";
import test from "node:test";
import { initUnsplash, resolveUnsplashImagesDeep } from "../image/unsplash.service.js";

test("resolveUnsplashImagesDeep: resolves and inserts src for images", async () => {
  const originalFetch = globalThis.fetch;
  
  // Setup fetch mock
  const calls: string[] = [];
  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = String(url);
    calls.push(urlString);
    
    if (urlString.includes("/search/photos")) {
      const urlObj = new URL(urlString);
      assert.equal(urlObj.searchParams.get("query"), "rustic sourdough bread");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            {
              id: "photo_1",
              likes: 100,
              width: 800,
              height: 600,
              user: {
                total_photos: 10,
                name: "Photographer Name",
                links: {
                  html: "https://unsplash.com/@photographer"
                }
              },
              links: {
                download_location: "https://api.unsplash.com/photos/photo_1/download",
                html: "https://unsplash.com/photos/photo_1"
              },
              urls: {
                regular: "https://images.unsplash.com/photo_1_regular",
                small: "https://images.unsplash.com/photo_1_small"
              }
            }
          ]
        })
      } as Response;
    }
    
    if (urlString.includes("/download")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({})
      } as Response;
    }
    
    return {
      ok: false,
      status: 404
    } as Response;
  };

  try {
    initUnsplash({
      url: "https://api.unsplash.com",
      accessKey: "fake_key",
    });

    const element = {
      type: "div",
      children: [
        {
          type: "image",
          props: {
            alt: "rustic sourdough bread"
          },
          className: "w-full h-64"
        },
        {
          type: "text",
          props: {
            text: "Artisanal Breads, Baked Fresh Daily"
          }
        }
      ]
    };

    // Before calling, image prop has no src
    const imageElement = element.children[0] as any;
    assert.ok(!imageElement.props.src);

    // Call and await resolution
    await resolveUnsplashImagesDeep(element as any);

    // After calling, image prop must have the resolved src
    assert.equal(imageElement.props.src, "https://images.unsplash.com/photo_1_regular");
    assert.equal(imageElement.props.alt, "rustic sourdough bread");

    // Make sure we have fetch calls
    assert.ok(calls.some(c => c.includes("/search/photos")));
    assert.ok(calls.some(c => c.includes("/download")));

  } finally {
    globalThis.fetch = originalFetch;
    initUnsplash(null);
  }
});
