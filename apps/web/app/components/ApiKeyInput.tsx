"use client";

import { useApiKey } from "../context/ApiKeyContext";

export function ApiKeyInput() {
  const { apiKey, setApiKey } = useApiKey();

  return (
    <div className="w-full max-w-md">
      <label
        htmlFor="api-key"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        OpenAI API Key
      </label>
      <input
        id="api-key"
        data-testid="api-key-input"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      {apiKey.length > 0 && (
        <p
          data-testid="api-key-indicator"
          className="mt-1 text-sm text-green-600"
        >
          Key set
        </p>
      )}
    </div>
  );
}
