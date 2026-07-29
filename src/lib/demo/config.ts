// Demo mode runs the whole app on localStorage — no Supabase project
// required. Toggle with NEXT_PUBLIC_DEMO_MODE=true in .env.local. Meant for
// quickly previewing the design/flow before wiring up a real database.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
