export async function gzipCompress(data: string): Promise<Blob> {
    const stream = new Blob([data]).stream();
    const compressedStream = stream.pipeThrough(
      new CompressionStream("gzip")
    );
    return await new Response(compressedStream).blob();
  }