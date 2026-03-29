import { NotebookViewer } from "./NotebookViewer";

interface Props {
  params: { id: string };
}

export default function NotebookPage({ params }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-base)",
      }}
    >
      <NotebookViewer id={params.id} />
    </div>
  );
}
