import { Injectable } from "@nestjs/common";
import type { NotebookCell } from "../ai/ai.service";

interface IpynbCell {
  cell_type: "markdown" | "code";
  metadata: Record<string, any>;
  source: string[];
  execution_count?: null;
  outputs?: any[];
}

interface IpynbNotebook {
  nbformat: number;
  nbformat_minor: number;
  metadata: Record<string, any>;
  cells: IpynbCell[];
}

@Injectable()
export class NotebookBuilderService {
  build(
    cells: NotebookCell[],
    figures?: { page: number; base64: string; caption?: string }[]
  ): IpynbNotebook {
    const ipynbCells: IpynbCell[] = cells.map((cell) =>
      this.convertCell(cell)
    );

    // Append figure cells at the end if any
    if (figures && figures.length > 0) {
      for (const fig of figures) {
        const caption = fig.caption || `Figure from page ${fig.page}`;
        const mdSource = `### ${caption}\n\n![${caption}](data:image/png;base64,${fig.base64})`;
        ipynbCells.push(this.convertCell({ cell_type: "markdown", source: mdSource }));
      }
    }

    return {
      nbformat: 4,
      nbformat_minor: 5,
      metadata: {
        colab: {
          name: "Paper2Notebook_Tutorial.ipynb",
          provenance: [],
        },
        kernelspec: {
          display_name: "Python 3",
          language: "python",
          name: "python3",
        },
        language_info: {
          name: "python",
          version: "3.10.0",
        },
      },
      cells: ipynbCells,
    };
  }

  toJson(
    cells: NotebookCell[],
    figures?: { page: number; base64: string; caption?: string }[]
  ): string {
    const notebook = this.build(cells, figures);
    return JSON.stringify(notebook, null, 2);
  }

  private convertCell(cell: NotebookCell): IpynbCell {
    // nbformat requires source as an array of lines
    const sourceLines = this.splitToLines(cell.source);

    if (cell.cell_type === "code") {
      return {
        cell_type: "code",
        metadata: {},
        source: sourceLines,
        execution_count: null,
        outputs: [],
      };
    }

    return {
      cell_type: "markdown",
      metadata: {},
      source: sourceLines,
    };
  }

  private splitToLines(source: string): string[] {
    // Split into lines, preserving newline characters within each line
    const lines = source.split("\n");
    return lines.map((line, i) => (i < lines.length - 1 ? line + "\n" : line));
  }
}
