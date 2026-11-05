import type { Model } from "./catalog";

// Showcase prompts used to generate each model's preview. Image inputs use a base image
// (the FLUX schnell preview) and video inputs use a base video (the P-Video preview).
const PROMPTS: Record<string, string> = {
  "black-forest-labs/flux-1-schnell": "A red fox sitting inside a glass snow globe on a wooden desk, warm bokeh lights, cinematic photo",
  "black-forest-labs/flux-1-dev": "A cowboy on horseback at sunset in a vast desert, orange sky, dust in the air, cinematic wide shot",
  "black-forest-labs/flux-1-kontext-dev": "Turn the scene into a snowy winter night with soft blue moonlight",
  "tongyi-mai/z-image-turbo": "A teddy bear with a camera strap sitting on a park bench, morning light, 35mm photo",
  "qwen/qwen-image": "A cozy cafe storefront with a hand-painted sign that reads 'SWELT', autumn street, golden hour",
  "qwen/qwen-image-lora": "A minimalist poster of a hummingbird made of iridescent glass, pastel background",
  "qwen/qwen-image-edit": "Make it look like a watercolor painting",
  "qwen/qwen-image-edit-2511": "Place the subject in a neon-lit city street at night, reflections on wet pavement",
  "qwen/qwen-image-edit-2511-lora": "Restyle as a soft 3D clay render",
  "alibaba/wan-2.6-t2i": "A lion standing on a rock at dawn, savanna haze, national geographic photo",
  "pruna/p-image-t2i": "A sleek red high-speed train racing through a colorful abstract landscape, motion blur",
  "pruna/p-image-edit": "Change the season to cherry blossom spring",
  "google/nano-banana-2": "Turn this into a premium product campaign shot on golden silk, soft studio lighting",
  "google/nano-banana-pro-edit": "Reimagine the scene as a festive Christmas village at dusk with warm lights",
  "minimax/hailuo-2.3-fast": "Slow cinematic push-in, gentle light flicker, subtle motion",
  "vidu/vidu-q3-t2v": "A kitten playing with a colorful ball on a wooden floor, playful, shallow depth of field",
  "vidu/vidu-q3-i2v": "The camera slowly orbits the subject while particles drift through the air",
  "kwaivgi/kling-v2.6-motion-control": "Character follows the reference motion naturally",
  "alibaba/wan-2.6-t2v": "A young artist spray-painting a colorful flower mural on a brick wall, sunlight, handheld camera",
  "pruna/p-video": "A futuristic robot with a glowing smiley face walking through a neon-lit hangar",
  "pruna/p-video-edit": "Make the whole scene look like a vintage 8mm film",
};

export const BASE_IMAGE_MODEL = "black-forest-labs/flux-1-schnell";
export const BASE_VIDEO_MODEL = "pruna/p-video";

/** Which base media a model's sample needs before it can run. */
export function sampleNeeds(model: Model): { image: boolean; video: boolean } {
  return {
    image: model.fields.some((f) => (f.type === "image" || f.type === "images") && f.required),
    video: model.fields.some((f) => f.name === "video" && f.required),
  };
}

export function sampleInput(model: Model, base: { image?: string; video?: string }): Record<string, unknown> {
  const input: Record<string, unknown> = { prompt: PROMPTS[model.id] ?? `A beautiful showcase of ${model.name}` };
  for (const f of model.fields) {
    if (!f.required) continue;
    if (f.type === "images" && base.image) input[f.name] = [base.image];
    if (f.type === "image" && base.image) input[f.name] = base.image;
    if (f.name === "video" && base.video) input[f.name] = base.video;
  }
  // Keep showcase videos short and cheap.
  const dur = model.fields.find((f) => f.name === "duration");
  if (dur?.options?.length) input.duration = dur.options[0];
  const res = model.fields.find((f) => f.name === "resolution");
  if (res?.options?.length) input.resolution = res.options[0];
  return input;
}
