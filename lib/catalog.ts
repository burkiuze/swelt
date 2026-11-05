// Model catalog. Each model maps to one or more candidate RunPod public endpoint IDs;
// the first one RunPod accepts is used (see lib/runpod.ts). Override any of them with
// RUNPOD_ENDPOINT_OVERRIDES='{"model-id":"endpoint-id"}'.

export type FieldType = "text" | "textarea" | "number" | "select" | "image" | "images" | "boolean" | "seed";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  default?: string | number | boolean;
  options?: (string | number)[];
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  advanced?: boolean;
  help?: string;
};

export type Category = "text-to-image" | "image-to-image" | "text-to-video" | "image-to-video" | "video-to-video";

export type Model = {
  id: string; // our slug, e.g. "black-forest-labs/flux-1-schnell"
  name: string;
  lab: string;
  description: string;
  category: Category;
  kind: "image" | "video";
  tags: string[];
  endpoints: string[]; // RunPod public endpoint ID candidates (unused for Higgsfield)
  provider?: "runpod" | "higgsfield"; // default runpod
  match?: string[]; // Higgsfield: keywords that identify the model in its live /models list (fallback)
  hfSlug?: string; // Higgsfield: exact slug
  hfSlugWithImage?: string; // Higgsfield: slug to use when an input image is given (e.g. image-to-video)
  fields: Field[];
  price: number; // estimated USD per run, used when RunPod doesn't report cost
  priceLabel: string;
  isNew?: boolean;
  gradient: [string, string, string];
};

const prompt: Field = { name: "prompt", label: "Prompt", type: "textarea", required: true };
const negative: Field = { name: "negative_prompt", label: "Negative prompt", type: "textarea", advanced: true, default: "" };
const seed: Field = { name: "seed", label: "Seed", type: "seed", advanced: true, default: -1, help: "-1 = random" };
const fmt: Field = { name: "image_format", label: "Output format", type: "select", options: ["png", "jpeg", "webp"], default: "png", advanced: true };
const size = (d = "1024*1024"): Field => ({
  name: "size",
  label: "Size",
  type: "select",
  options: ["1024*1024", "1344*768", "768*1344", "1152*896", "896*1152", "1536*1024", "1024*1536", "2048*2048"],
  default: d,
});
const wh = (w = 1024, h = 1024): Field[] => [
  { name: "width", label: "Width", type: "number", default: w, min: 256, max: 2048, step: 64 },
  { name: "height", label: "Height", type: "number", default: h, min: 256, max: 2048, step: 64 },
];
const images = (max = 4): Field => ({ name: "images", label: `Reference images (up to ${max})`, type: "images", required: true, max });
const image: Field = { name: "image", label: "Start image", type: "image", required: true };
const duration = (opts: number[], d: number): Field => ({ name: "duration", label: "Duration (s)", type: "select", options: opts, default: d });
const resolution = (opts: string[], d: string): Field => ({ name: "resolution", label: "Resolution", type: "select", options: opts, default: d });
const aspect = (d = "16:9"): Field => ({ name: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["16:9", "9:16", "1:1", "4:3", "3:4"], default: d });
const audio: Field = { name: "generate_audio", label: "Generate audio", type: "boolean", default: true };

export const MODELS: Model[] = [
  // ---------------- Higgsfield ----------------
  {
    id: "higgsfield/marketing-studio-image",
    name: "Marketing Studio Image",
    lab: "higgsfield",
    description: "Ad-ready product and campaign images from a prompt and up to 14 reference images (product, logo, model, scene).",
    category: "image-to-image",
    kind: "image",
    tags: ["marketing", "product", "ads"],
    provider: "higgsfield",
    match: ["marketing", "studio", "image"],
    hfSlug: "marketing-studio/image",
    endpoints: [],
    fields: [
      prompt,
      { name: "image_references", label: "Reference images (up to 14)", type: "images", max: 14 },
      { name: "aspect_ratio", label: "Aspect ratio", type: "select", options: ["auto", "1:1", "4:5", "3:4", "2:3", "9:16", "16:9", "3:2", "4:3", "21:9"], default: "1:1" },
      resolution(["1k", "2k", "4k"], "1k"),
    ],
    price: 0.06,
    priceLabel: "via Higgsfield",
    isNew: true,
    gradient: ["#f5d0a9", "#9a3412", "#1c1917"],
  },
  {
    id: "kwaivgi/kling-4.0",
    name: "Kling 4.0",
    lab: "kwaivgi",
    description: "Kling's latest video model: cinematic text-to-video and image-to-video with native sound.",
    category: "text-to-video",
    kind: "video",
    tags: ["cinematic", "audio", "image-to-video"],
    provider: "higgsfield",
    match: ["kling", "v4 0"],
    hfSlug: "kling-video/v4.0/text-to-video",
    hfSlugWithImage: "kling-video/v4.0/image-to-video",
    endpoints: [],
    fields: [
      prompt,
      { name: "image_url", label: "Start image (optional)", type: "image" },
      duration([5, 10], 5),
      aspect(),
      { name: "sound", label: "Sound", type: "boolean", default: true },
    ],
    price: 0.6,
    priceLabel: "via Higgsfield",
    isNew: true,
    gradient: ["#a7f3d0", "#0f766e", "#042f2e"],
  },
  {
    id: "higgsfield/genjutsu-light",
    name: "Genjutsu Light",
    lab: "higgsfield",
    description: "Transfer the motion of a source video onto your reference character (first 15 s, source audio kept).",
    category: "video-to-video",
    kind: "video",
    tags: ["character swap", "video editing"],
    provider: "higgsfield",
    match: ["genjutsu", "light", "motion"],
    hfSlug: "higgsfield/genjutsu-light/motion-transfer/v1.0",
    endpoints: [],
    fields: [
      { name: "video_url", label: "Source video URL", type: "text", required: true },
      { name: "image_url", label: "Character image", type: "image", required: true },
      { ...prompt, required: false, label: "Prompt (optional)" },
    ],
    price: 0.4,
    priceLabel: "via Higgsfield",
    isNew: true,
    gradient: ["#c4b5fd", "#6d28d9", "#0f0a1f"],
  },

  // ---------------- Image ----------------
  {
    id: "google/nano-banana-2",
    name: "Nano Banana 2",
    lab: "google",
    description: "Google's Nano Banana 2 for AI-powered image editing. Up to 14 reference images and a text prompt, outputs at 1K, 2K or 4K.",
    category: "image-to-image",
    kind: "image",
    tags: ["image editing", "realism", "typography"],
    endpoints: ["google-nano-banana-2-edit"],
    fields: [prompt, images(14), resolution(["1k", "2k", "4k"], "1k"), aspect("1:1"), fmt],
    price: 0.08,
    priceLabel: "$0.08 / image",
    isNew: true,
    gradient: ["#f59e0b", "#7c2d12", "#1e3a8a"],
  },
  {
    id: "google/nano-banana-pro-edit",
    name: "Nano Banana Pro Edit",
    lab: "google",
    description: "Google Nano Banana Pro (Gemini 3 Pro Image) edit with 4K-capable output.",
    category: "image-to-image",
    kind: "image",
    tags: ["image editing", "4k"],
    endpoints: ["nano-banana-pro-edit"],
    fields: [prompt, images(14), resolution(["1k", "2k", "4k"], "1k"), aspect("1:1"), fmt],
    price: 0.14,
    priceLabel: "$0.14 / image",
    gradient: ["#fbbf24", "#b91c1c", "#14532d"],
  },
  {
    id: "tongyi-mai/z-image-turbo",
    name: "Z-Image Turbo",
    lab: "tongyi-mai",
    description: "Z-Image is a powerful and highly efficient image generation model family with 6B parameters.",
    category: "text-to-image",
    kind: "image",
    tags: ["fast", "realism"],
    endpoints: ["z-image-turbo"],
    fields: [prompt, size(), seed, fmt],
    price: 0.005,
    priceLabel: "$0.005 / image",
    isNew: true,
    gradient: ["#a3e635", "#166534", "#78350f"],
  },
  {
    id: "qwen/qwen-image-edit-2511",
    name: "Qwen Image Edit 2511",
    lab: "qwen",
    description: "Stronger edit consistency, robust multi-person identity/pose consistency, built-in LoRA styles and product design.",
    category: "image-to-image",
    kind: "image",
    tags: ["image editing", "consistency"],
    endpoints: ["qwen-image-edit-2511"],
    fields: [prompt, images(3), negative, seed, fmt],
    price: 0.03,
    priceLabel: "$0.03 / image",
    gradient: ["#38bdf8", "#7c3aed", "#0f172a"],
  },
  {
    id: "qwen/qwen-image-edit-2511-lora",
    name: "Qwen Image Edit 2511 LoRA",
    lab: "qwen",
    description: "Qwen image editing with complex text rendering, precise edits and LoRA support.",
    category: "image-to-image",
    kind: "image",
    tags: ["image editing", "lora"],
    endpoints: ["qwen-image-edit-2511-lora"],
    fields: [prompt, images(3), { name: "lora_url", label: "LoRA URL", type: "text", advanced: true }, negative, seed, fmt],
    price: 0.035,
    priceLabel: "$0.035 / image",
    gradient: ["#818cf8", "#be185d", "#111827"],
  },
  {
    id: "qwen/qwen-image-edit",
    name: "Qwen Image Edit",
    lab: "qwen",
    description: "The image editing version of Qwen-Image, extending its text rendering to precise image edits.",
    category: "image-to-image",
    kind: "image",
    tags: ["image editing", "typography"],
    endpoints: ["qwen-image-edit"],
    fields: [prompt, images(1), negative, seed, fmt],
    price: 0.02,
    priceLabel: "$0.02 / image",
    gradient: ["#d6d3d1", "#92400e", "#1c1917"],
  },
  {
    id: "qwen/qwen-image",
    name: "Qwen Image",
    lab: "qwen",
    description: "Qwen image generation foundation model with strong complex text rendering.",
    category: "text-to-image",
    kind: "image",
    tags: ["typography", "realism"],
    endpoints: ["qwen-image-t2i"],
    fields: [prompt, negative, size(), seed, fmt],
    price: 0.02,
    priceLabel: "$0.02 / image",
    gradient: ["#fcd34d", "#c2410c", "#292524"],
  },
  {
    id: "qwen/qwen-image-lora",
    name: "Qwen Image LoRA",
    lab: "qwen",
    description: "Qwen-Image text-to-image with LoRA support.",
    category: "text-to-image",
    kind: "image",
    tags: ["lora", "stylized"],
    endpoints: ["qwen-image-t2i-lora"],
    fields: [prompt, { name: "lora_url", label: "LoRA URL", type: "text", advanced: true }, negative, size(), seed, fmt],
    price: 0.025,
    priceLabel: "$0.025 / image",
    gradient: ["#a8a29e", "#57534e", "#0c0a09"],
  },
  {
    id: "alibaba/wan-2.6-t2i",
    name: "Wan 2.6 T2I",
    lab: "alibaba",
    description: "Alibaba WAN 2.6 text-to-image with strong prompt adherence and clean composition.",
    category: "text-to-image",
    kind: "image",
    tags: ["realism", "composition"],
    endpoints: ["wan-2-6-t2i"],
    fields: [prompt, negative, size(), seed, fmt],
    price: 0.03,
    priceLabel: "$0.03 / image",
    gradient: ["#fdba74", "#78350f", "#1c1917"],
  },
  {
    id: "pruna/p-image-edit",
    name: "P-Image Edit",
    lab: "pruna",
    description: "Pruna's premium image editing model: complex compositions, style transfers and targeted edits.",
    category: "image-to-image",
    kind: "image",
    tags: ["image editing", "style transfer"],
    endpoints: ["p-image-edit"],
    fields: [prompt, images(4), seed, fmt],
    price: 0.01,
    priceLabel: "$0.01 / image",
    gradient: ["#fef3c7", "#d97706", "#78716c"],
  },
  {
    id: "pruna/p-image-t2i",
    name: "P-Image",
    lab: "pruna",
    description: "Pruna's ultra-fast text-to-image with automatic prompt enhancement and 2-stage refinement.",
    category: "text-to-image",
    kind: "image",
    tags: ["fast"],
    endpoints: ["p-image-t2i"],
    fields: [prompt, aspect("1:1"), seed, fmt],
    price: 0.005,
    priceLabel: "$0.005 / image",
    gradient: ["#93c5fd", "#b45309", "#292524"],
  },
  {
    id: "black-forest-labs/flux-1-kontext-dev",
    name: "FLUX.1 Kontext [dev]",
    lab: "black-forest-labs",
    description: "12B rectified flow transformer that edits images from text instructions.",
    category: "image-to-image",
    kind: "image",
    tags: ["image editing"],
    endpoints: ["black-forest-labs-flux-1-kontext-dev"],
    fields: [prompt, { ...image, label: "Image" }, negative, ...wh(), { name: "num_inference_steps", label: "Steps", type: "number", default: 28, min: 1, max: 50, advanced: true }, { name: "guidance", label: "Guidance", type: "number", default: 2.5, min: 0, max: 10, step: 0.1, advanced: true }, seed, fmt],
    price: 0.025,
    priceLabel: "$0.025 / image",
    gradient: ["#1e3a8a", "#c2410c", "#020617"],
  },
  {
    id: "black-forest-labs/flux-1-schnell",
    name: "FLUX.1 [schnell]",
    lab: "black-forest-labs",
    description: "Fastest and most lightweight FLUX model, ideal for prototyping.",
    category: "text-to-image",
    kind: "image",
    tags: ["fast"],
    endpoints: ["black-forest-labs-flux-1-schnell"],
    fields: [prompt, negative, ...wh(), { name: "num_inference_steps", label: "Steps", type: "number", default: 4, min: 1, max: 8, advanced: true }, { name: "guidance", label: "Guidance", type: "number", default: 7, min: 0, max: 10, step: 0.1, advanced: true }, seed, fmt],
    price: 0.0024,
    priceLabel: "$0.0024 / image",
    gradient: ["#e0f2fe", "#fda4af", "#1e293b"],
  },
  {
    id: "black-forest-labs/flux-1-dev",
    name: "FLUX.1 [dev]",
    lab: "black-forest-labs",
    description: "Exceptional prompt adherence, high visual fidelity and rich image detail.",
    category: "text-to-image",
    kind: "image",
    tags: ["realism", "detail"],
    endpoints: ["black-forest-labs-flux-1-dev"],
    fields: [prompt, negative, ...wh(), { name: "num_inference_steps", label: "Steps", type: "number", default: 28, min: 1, max: 50, advanced: true }, { name: "guidance", label: "Guidance", type: "number", default: 7, min: 0, max: 10, step: 0.1, advanced: true }, seed, fmt],
    price: 0.02,
    priceLabel: "$0.02 / image",
    gradient: ["#312e81", "#db2777", "#0f172a"],
  },

  // ---------------- Video ----------------
  {
    id: "minimax/hailuo-2.3-fast",
    name: "Hailuo 2.3 Fast",
    lab: "minimax",
    description: "Animate a reference image with a text prompt into 6 or 10 s videos, with prompt enhancement.",
    category: "image-to-video",
    kind: "video",
    tags: ["fast"],
    endpoints: ["minimax-hailuo-2-3-fast"],
    fields: [prompt, image, duration([6, 10], 6), resolution(["768p", "1080p"], "768p"), { name: "prompt_optimizer", label: "Prompt enhancement", type: "boolean", default: true }],
    price: 0.19,
    priceLabel: "$0.19 / video",
    gradient: ["#f9a8d4", "#9a3412", "#1e3a8a"],
  },
  {
    id: "vidu/vidu-q3-t2v",
    name: "Vidu Q3 Text-to-Video",
    lab: "vidu",
    description: "High-quality videos from text with multiple resolutions, aspect ratios and audio.",
    category: "text-to-video",
    kind: "video",
    tags: ["audio"],
    endpoints: ["vidu-q3-t2v"],
    fields: [prompt, duration([4, 8, 16], 4), resolution(["540p", "720p", "1080p"], "720p"), aspect(), audio, seed],
    price: 0.3,
    priceLabel: "≈$0.07 / second",
    gradient: ["#fb923c", "#9a3412", "#fef3c7"],
  },
  {
    id: "vidu/vidu-q3-i2v",
    name: "Vidu Q3 Image-to-Video",
    lab: "vidu",
    description: "Animate a reference image with prompt-driven motion, up to 1080p, with optional audio.",
    category: "image-to-video",
    kind: "video",
    tags: ["audio"],
    endpoints: ["vidu-q3-i2v"],
    fields: [prompt, image, duration([4, 8, 16], 4), resolution(["540p", "720p", "1080p"], "720p"), audio, seed],
    price: 0.3,
    priceLabel: "≈$0.07 / second",
    gradient: ["#e5e7eb", "#ef4444", "#2563eb"],
  },
  {
    id: "kwaivgi/kling-v2.6-motion-control",
    name: "Kling v2.6 Standard Motion Control",
    lab: "kwaivgi",
    description: "Transfer motion from a reference video onto a still character image.",
    category: "video-to-video",
    kind: "video",
    tags: ["motion transfer", "character"],
    endpoints: ["kling-v2-6-std-motion-control"],
    fields: [{ ...prompt, required: false }, { ...image, label: "Character image" }, { name: "video", label: "Motion reference video URL", type: "text", required: true }],
    price: 0.4,
    priceLabel: "≈$0.07 / second",
    gradient: ["#d4a373", "#7f5539", "#e9edc9"],
  },
  {
    id: "alibaba/wan-2.6-t2v",
    name: "Wan 2.6 Text-to-Video",
    lab: "alibaba",
    description: "Plain prompts into coherent, cinematic clips with crisp detail and stable motion.",
    category: "text-to-video",
    kind: "video",
    tags: ["cinematic"],
    endpoints: ["wan-2-6-t2v"],
    fields: [prompt, negative, duration([5, 10, 15], 5), resolution(["720p", "1080p"], "720p"), aspect(), audio, seed],
    price: 0.5,
    priceLabel: "≈$0.10 / second",
    gradient: ["#f472b6", "#1d4ed8", "#065f46"],
  },
  {
    id: "pruna/p-video",
    name: "P-Video",
    lab: "pruna",
    description: "Premium AI video from text, images and audio by Pruna. Generation in under 10 seconds.",
    category: "text-to-video",
    kind: "video",
    tags: ["fast", "audio"],
    endpoints: ["p-video"],
    fields: [prompt, { ...image, required: false, label: "Image (optional)" }, duration([5, 10], 5), resolution(["720p", "1080p"], "720p"), aspect(), seed],
    price: 0.1,
    priceLabel: "$0.10 / video",
    isNew: true,
    gradient: ["#1e1b4b", "#c026d3", "#0f172a"],
  },
  {
    id: "pruna/p-video-edit",
    name: "P-Video Edit",
    lab: "pruna",
    description: "Edit an existing video (≤15 s) from a text prompt, optionally guided by up to 4 reference images.",
    category: "video-to-video",
    kind: "video",
    tags: ["video editing"],
    endpoints: ["p-video-edit"],
    fields: [prompt, { name: "video", label: "Input video URL", type: "text", required: true }, { ...images(4), required: false }, seed],
    price: 0.15,
    priceLabel: "$0.15 / video",
    isNew: true,
    gradient: ["#78716c", "#f59e0b", "#1c1917"],
  },
];

export const LABS = Array.from(new Set(MODELS.map((m) => m.lab)));

export function getModel(id: string): Model | undefined {
  return MODELS.find((m) => m.id === id);
}

export function categoryLabel(c: Category) {
  return c;
}

// Compact listing for the agent's system prompt.
export function catalogForAgent() {
  return MODELS.map((m) => {
    const fields = m.fields
      .map((f) => `${f.name}${f.required ? "*" : ""}:${f.type}${f.options ? `[${f.options.join("|")}]` : ""}`)
      .join(", ");
    return `- ${m.id} (${m.category}, ${m.priceLabel}): ${m.description} Inputs: ${fields}`;
  }).join("\n");
}
