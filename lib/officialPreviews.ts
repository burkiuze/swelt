// Real outputs of each model found online under licenses that allow reuse: the model
// authors' official repositories (Apache-2.0) and the CC BY 4.0 Awesome-Nano-Banana-images
// gallery. Cropped and resized into /public/previews and credited in CREDITS.md.
// These take priority over previews generated in Vlipa.
export type OfficialPreview = { url: string; kind: "image" | "video"; source: string; license: string };

export const OFFICIAL_PREVIEWS: Record<string, OfficialPreview> = {
  "kwaivgi/kling-4.0": {
    url: "https://pub-62cf7640cd0f4066b60933bd2e9b85ef.r2.dev/model-repo-media/awesome-kling-4-usecases/assets/cases/D31/video-94729ec66a60.mp4",
    kind: "video",
    source: "https://x.com/higgsfield_ai/status/2110928479734964409",
    license: "CC BY 4.0 (awesome-kling-4-usecases, by @higgsfield_ai)",
  },
  "google/nano-banana-pro-edit": {
    url: "/previews/nano-banana-pro-edit.webp",
    kind: "image",
    source: "https://x.com/toolfolio/status/1992847853212012705",
    license: "CC BY 4.0 (Awesome-Nano-Banana-images, by @toolfolio)",
  },
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
