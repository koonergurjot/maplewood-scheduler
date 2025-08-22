import fs from "fs";
import pdfParse from "pdf-parse";

const uploadDir = new URL("./uploads", import.meta.url);
const storedPath = new URL("./uploads/agreement", import.meta.url);

let agreementText = "";

export async function initAgreement() {
  try {
    if (fs.existsSync(storedPath)) {
      await loadAgreement(storedPath.pathname);
    }
  } catch (err) {
    console.error("Failed to initialize agreement", err);
  }
}

export async function loadAgreement(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (filePath.toLowerCase().endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    agreementText = data.text;
  } else {
    agreementText = buffer.toString();
  }
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.copyFileSync(filePath, storedPath);
}

export function searchAgreement(query) {
  if (!agreementText) return [];
  const lines = agreementText.split(/\r?\n/);
  const q = query.toLowerCase();
  return lines.filter((l) => l.toLowerCase().includes(q)).slice(0, 5);
}
