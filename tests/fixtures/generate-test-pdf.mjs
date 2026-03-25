import { PDFDocument, StandardFonts } from "pdf-lib";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateTestPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([612, 792]);
  let y = 750;

  const drawHeading = (text) => {
    page.drawText(text, { x: 50, y, size: 16, font: boldFont });
    y -= 30;
  };

  const drawText = (text) => {
    const lines = text.match(/.{1,80}/g) || [text];
    for (const line of lines) {
      page.drawText(line, { x: 50, y, size: 11, font });
      y -= 16;
    }
    y -= 8;
  };

  drawHeading("Abstract");
  drawText(
    "This paper presents a novel algorithm for sorting large datasets using quantum-inspired classical techniques. We demonstrate a 2x speedup over traditional merge sort on datasets exceeding 10 million records."
  );

  drawHeading("1. Introduction");
  drawText(
    "Sorting remains a fundamental operation in computer science. Despite decades of research, opportunities for improvement exist in specific domains."
  );

  drawHeading("2. Methods");
  drawText(
    "We propose the QuantumSort algorithm which leverages superposition-inspired partitioning. The algorithm operates in O(n log n) average time with reduced constant factors."
  );

  drawHeading("3. Algorithm");
  drawText(
    "function quantumSort(arr): if len(arr) <= 1: return arr; pivot = quantumPartition(arr); left = quantumSort(arr[..pivot]); right = quantumSort(arr[pivot..]); return merge(left, right);"
  );

  drawHeading("4. Results");
  drawText(
    "Our experiments show that QuantumSort achieves a 2.1x speedup on arrays of size n > 10^7 compared to standard merge sort implementations."
  );

  drawHeading("5. Conclusion");
  drawText(
    "We have presented QuantumSort, a novel sorting algorithm. Future work includes parallelization and GPU acceleration."
  );

  const bytes = await doc.save();
  const outPath = path.join(__dirname, "sample-paper.pdf");
  fs.writeFileSync(outPath, bytes);
  console.log(`Generated: ${outPath} (${bytes.length} bytes)`);
}

generateTestPdf();
