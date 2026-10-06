import Link from "next/link";

export default function NotFound() { return <main className="grid min-h-screen place-items-center px-5"><div className="text-center"><div className="text-sm text-white/30">404</div><h1 className="mt-2 text-3xl font-semibold">Page not found.</h1><p className="mt-2 text-sm text-white/35">The Smaran route you opened does not exist.</p><Link href="/" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black">Back to Smaran</Link></div></main>; }
