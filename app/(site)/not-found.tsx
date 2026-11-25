import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-svh flex-col justify-center gap-6 px-6 md:px-10">
      <p className="slate text-ember-500">Error 404 · Reel missing</p>
      <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
        This frame is not on the reel.
      </h1>
      <Link href="/" className="slate text-bone-400 hover:text-bone-100">
        Back to home
      </Link>
    </section>
  );
}
