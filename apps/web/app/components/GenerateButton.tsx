"use client";

interface GenerateButtonProps {
  disabled: boolean;
  onClick?: () => void;
}

export function GenerateButton({ disabled, onClick }: GenerateButtonProps) {
  return (
    <button
      data-testid="generate-button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full max-w-md px-6 py-3 rounded-lg font-medium text-white transition-colors ${
        disabled
          ? "bg-gray-300 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
      }`}
    >
      Generate Notebook
    </button>
  );
}
