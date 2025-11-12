import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div>
          <div className="space-y-6">
            <h1 className="heading-1">Welcome to Ziggler</h1>
            <p className="text-lg text-muted">
              Your ultimate task management app to boost productivity and stay organized.
            </p>
          </div>
          <div className="flex items-center justify-center">
            <Link
              href="/register"
              className="mt-10 rounded-full bg-black px-6 py-3 text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 inline-block text-center"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="ml-4 mt-10 rounded-full bg-gray-200 px-6 py-3 text-black hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 inline-block text-center"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
