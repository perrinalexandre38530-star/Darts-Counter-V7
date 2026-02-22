export function downloadJsonFile(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareOrDownload(
  data: unknown,
  filename: string,
  title = "Darts Counter Export"
) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title,
      files: [file],
    });
  } else {
    downloadJsonFile(data, filename);
  }
}

export function downloadBlobFile(blob: Blob, filename: string) {
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
}

export async function shareOrDownloadBlob(blob: Blob, filename: string, title = "Darts Counter Export") {
const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
if (navigator.share && navigator.canShare?.({ files: [file] })) {
  await navigator.share({ title, files: [file] });
} else {
  downloadBlobFile(blob, filename);
}
}

