import { SpaceLoader } from "@/components/space-loader";
import { SolarSystem } from "@/components/solar-system";

export default function PreviewLoading() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-32 px-6 py-24">
      <SpaceLoader />
      <div className="mt-24">
        <SolarSystem />
      </div>
    </main>
  );
}
