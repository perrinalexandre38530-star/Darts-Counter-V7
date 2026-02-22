export async function encryptData(
    data: string,
    password: string
  ): Promise<{ iv: Uint8Array; encrypted: ArrayBuffer }> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
  
    const salt = encoder.encode("darts-counter-salt");
  
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
  
    const iv = crypto.getRandomValues(new Uint8Array(12));
  
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoder.encode(data)
    );
  
    return { iv, encrypted };
  }