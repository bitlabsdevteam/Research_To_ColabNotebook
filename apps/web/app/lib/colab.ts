export function downloadNotebook(notebook: object, filename = "Paper2Notebook_Tutorial.ipynb") {
  const json = JSON.stringify(notebook, null, 2);
  const blob = new Blob([json], { type: "application/x-ipynb+json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function openInColab(notebook: object) {
  // Create a blob URL for the notebook, encode it, and open Colab's upload page
  // Since Colab can't open local blobs, we use the #create=true approach
  // which opens Colab's new notebook page. The user can then upload.
  // Alternative: create a data URI and use the Colab upload endpoint.

  // Best v1 approach: download the file and provide instructions,
  // or open Colab's upload page directly
  const json = JSON.stringify(notebook, null, 2);
  const blob = new Blob([json], { type: "application/x-ipynb+json" });
  const url = URL.createObjectURL(blob);

  // Trigger download first so the user has the file
  const a = document.createElement("a");
  a.href = url;
  a.download = "Paper2Notebook_Tutorial.ipynb";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Then open Colab's upload page
  window.open("https://colab.research.google.com/#create=true", "_blank");

  URL.revokeObjectURL(url);
}
