// Redimensiona/comprime una imagen en el navegador a JPEG base64 (~maxDim px).
// Mantiene el payload pequeño para guardarla en la DB sin infra de storage.
export const fileToResizedBase64 = (
	file: File,
	maxDim = 800,
	quality = 0.7,
): Promise<{ base64: string; mime: string }> =>
	new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		img.onload = () => {
			URL.revokeObjectURL(url);
			let { width, height } = img;
			if (width >= height && width > maxDim) {
				height = Math.round((height * maxDim) / width);
				width = maxDim;
			} else if (height > maxDim) {
				width = Math.round((width * maxDim) / height);
				height = maxDim;
			}
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("No se pudo procesar la imagen"));
				return;
			}
			ctx.drawImage(img, 0, 0, width, height);
			const dataUrl = canvas.toDataURL("image/jpeg", quality);
			resolve({ base64: dataUrl.split(",")[1] ?? "", mime: "image/jpeg" });
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("No se pudo leer la imagen"));
		};
		img.src = url;
	});
