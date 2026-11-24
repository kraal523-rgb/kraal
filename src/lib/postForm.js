// Multipart upload helper.
//
// Newer Expo runtimes can replace the global `fetch`, and that replacement
// rejects React Native's { uri, name, type } file parts with
// "Unsupported FormDataPart implementation". XMLHttpRequest always uses React
// Native's own networking, which supports those parts, so uploads go through it.
//
// Resolves to { ok, status, data, text } (data is parsed JSON or null).
export function postFormData(url, formData, headers = {}, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    // Do NOT set Content-Type: the multipart boundary is added automatically.
    xhr.timeout = timeoutMs;
    xhr.onload = () => {
      const text = xhr.responseText || "";
      let data = null;
      try {
        data = JSON.parse(text);
      } catch {
        // not JSON (e.g. a proxy or Cloudflare error page)
      }
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data,
        text,
      });
    };
    xhr.onerror = () => reject(new Error("Network request failed. Check your connection."));
    xhr.ontimeout = () => reject(new Error("The upload timed out. Please try again."));
    xhr.send(formData);
  });
}