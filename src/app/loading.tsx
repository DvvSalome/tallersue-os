import { SpaceLoader } from "@/components/space-loader";

export default function Loading() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-12">
      <SpaceLoader />
    </main>
  );
}
