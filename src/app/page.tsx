import { redirect } from "next/navigation";
import { getActor } from "@/lib/actor";
import { DEMO_MODE } from "@/lib/demo/config";
import { DemoRootRedirect } from "./demo-root-redirect";
import { LandingClient } from "./landing-client";

export default async function RootPage() {
  if (DEMO_MODE) {
    return (
      <>
        <DemoRootRedirect />
        <LandingClient />
      </>
    );
  }

  const actor = await getActor();

  if (actor?.kind === "participante") redirect("/home");
  if (actor?.kind === "facilitador") redirect("/facilitador/dashboard");

  return <LandingClient />;
}
