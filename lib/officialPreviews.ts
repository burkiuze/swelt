// Sample outputs published by the model authors in their official GitHub repositories
// (all Apache-2.0). Cropped and resized into /public/previews. A preview generated in
// Swelt (Previews page) takes priority over these.
export type OfficialPreview = { url: string; kind: "image" | "video"; source: string; license: string };

export const OFFICIAL_PREVIEWS: Record<string, OfficialPreview> = {
  "black-forest-labs/flux-1-schnell": {
    url: "/previews/flux-1-schnell.webp",
    kind: "image",
    source: "https://github.com/black-forest-labs/flux/blob/main/assets/schnell_grid.jpg",
    license: "Apache-2.0",
  },
  "black-forest-labs/flux-1-dev": {
    url: "/previews/flux-1-dev.webp",
    kind: "image",
    source: "https://github.com/black-forest-labs/flux/blob/main/assets/dev_grid.jpg",
    license: "Apache-2.0",
  },
  "qwen/qwen-image-lora": {
    url: "/previews/qwen-image-lora.webp",
    kind: "image",
    source: "https://github.com/QwenLM/Qwen-Image/blob/main/assets/magicbeauty.png",
    license: "Apache-2.0",
  },
  "tongyi-mai/z-image-turbo": {
    url: "/previews/z-image-turbo.webp",
    kind: "image",
    source: "https://github.com/Tongyi-MAI/Z-Image/blob/main/assets/showcase.jpg",
    license: "Apache-2.0",
  },
};
