import { getDocument, PDFDocumentProxy } from "pdfjs-dist";
import { PDFPageProxy } from "pdfjs-dist/types/src/display/api";

/**
 * Converts a specified page of a PDF file to an image.
 *
 * @param pdfInput - The PDF file or URL to the PDF file.
 * @param pageNumber - The page number to convert to an image.
 * @param scale - The scale factor for rendering the page. Higher values result in higher resolution.
 * @returns A promise that resolves with the image data URL.
 */
async function convertPdfPageToImage(
  pdfInput: File | string,
  pageNumber: number = 1,
  scale: number = 2,
): Promise<string> {
  try {
    // Determine the source of the PDF document
    const src =
      typeof pdfInput === "string" ? pdfInput : URL.createObjectURL(pdfInput);

    // Load the PDF document
    const pdf: PDFDocumentProxy = await getDocument(src).promise;

    // Fetch the specified page
    const page: PDFPageProxy = await pdf.getPage(pageNumber);

    // Prepare the viewport and canvas for rendering
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to obtain canvas context");
    }
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render the page onto the canvas
    await page.render({ canvasContext: context, viewport }).promise;

    // Convert the canvas to an image data URL and return it
    return canvas.toDataURL();
  } catch (error) {
    console.error("Error converting PDF page to image:", error);
    throw error;
  }
}

export default convertPdfPageToImage;
