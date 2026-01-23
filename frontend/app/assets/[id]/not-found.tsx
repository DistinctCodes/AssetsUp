import Link from 'next/link';

export default function AssetNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <h2 className="text-2xl font-semibold text-gray-900 mt-4">
        Asset Not Found
      </h2>
      <p className="text-gray-600 mt-2 text-center">
        The asset you&apos;re looking for doesn&apos;t exist or has been
        removed.
      </p>
      <Link
        href="/assets"
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Back to Assets
      </Link>
    </div>
  );
}
