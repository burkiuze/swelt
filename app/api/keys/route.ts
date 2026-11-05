// API keys are disabled: Vlipa is used through the website only.
export const dynamic = "force-dynamic";

const gone = () => Response.json({ error: "API keys are not available" }, { status: 404 });

export const GET = gone;
export const POST = gone;
export const DELETE = gone;
