import { NotebookViewer } from "./NotebookViewer";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NotebookPage({ params }: Props) {
  const { id } = await params;
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg-base)",
      }}
    >
      <NotebookViewer id={id} />
    </div>
  );
}
