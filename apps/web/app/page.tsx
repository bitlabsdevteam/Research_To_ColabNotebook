export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 data-testid="app-title" className="text-4xl font-bold mb-4">
        Paper2Notebook
      </h1>
      <p data-testid="app-description" className="text-lg text-gray-600">
        Convert research papers into interactive Google Colab tutorials
      </p>
    </main>
  );
}
