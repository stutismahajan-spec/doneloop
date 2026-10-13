import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="p-8">
      <h1>DoneLoop</h1>
      <p>The static site is served from the project root.</p>
    </main>
  );
}
