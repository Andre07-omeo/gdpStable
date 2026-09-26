'use client';

export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💥</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Erreur critique</h2>
            <p className="text-gray-600 text-sm mb-6">
              Une erreur grave s'est produite. Veuillez réessayer.
            </p>
            <button
              onClick={reset}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}