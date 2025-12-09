/**
 * Image Preprocessing Utilities
 * Provides canvas-based image enhancement for OCR optimization
 */

export interface PreprocessingResult {
    blob: Blob;
    canvas: HTMLCanvasElement;
    qualityScore: number;
    issues: string[];
}

export interface QualityMetrics {
    blur: number;
    brightness: number;
    contrast: number;
    glare: boolean;
    resolution: { width: number; height: number };
}

/**
 * Analyze image quality metrics
 */
export async function analyzeQuality(imageBlob: Blob): Promise<QualityMetrics> {
    const imageBitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Calculate brightness
    let totalBrightness = 0;
    let pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Luminance formula
        totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b);
    }
    const brightness = totalBrightness / pixelCount / 255;

    // Calculate contrast using standard deviation
    let totalSquareDiff = 0;
    const meanBrightness = brightness * 255;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalSquareDiff += Math.pow(lum - meanBrightness, 2);
    }
    const contrast = Math.sqrt(totalSquareDiff / pixelCount) / 128;

    // Estimate blur using Laplacian variance
    const blur = estimateBlur(imageData);

    // Detect glare (very bright spots)
    const glare = detectGlare(data);

    return {
        blur,
        brightness,
        contrast,
        glare,
        resolution: { width: canvas.width, height: canvas.height },
    };
}

/**
 * Estimate blur using Laplacian variance method
 */
function estimateBlur(imageData: ImageData): number {
    const { data, width, height } = imageData;
    const gray = new Float32Array(width * height);

    // Convert to grayscale
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // Apply Laplacian kernel
    let variance = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            const laplacian =
                gray[idx - width] + gray[idx + width] +
                gray[idx - 1] + gray[idx + 1] -
                4 * gray[idx];
            variance += laplacian * laplacian;
            count++;
        }
    }

    // Normalize and invert (higher = less blur)
    const normalizedVariance = variance / count;
    return Math.min(1, normalizedVariance / 500);
}

/**
 * Detect glare/overexposed regions
 */
function detectGlare(data: Uint8ClampedArray): boolean {
    let brightPixels = 0;
    const threshold = 250;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i] > threshold && data[i + 1] > threshold && data[i + 2] > threshold) {
            brightPixels++;
        }
    }

    const ratio = brightPixels / (data.length / 4);
    return ratio > 0.05; // More than 5% very bright pixels
}

/**
 * Apply adaptive binarization (Otsu's method + local thresholding)
 */
export async function binarize(imageBlob: Blob): Promise<Blob> {
    const imageBitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and find histogram
    const gray = new Uint8Array(data.length / 4);
    const histogram = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
        const val = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        gray[i / 4] = val;
        histogram[val]++;
    }

    // Otsu's threshold
    const threshold = otsuThreshold(histogram, gray.length);

    // Apply threshold
    for (let i = 0; i < gray.length; i++) {
        const idx = i * 4;
        const val = gray[i] > threshold ? 255 : 0;
        data[idx] = data[idx + 1] = data[idx + 2] = val;
    }

    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
}

/**
 * Calculate Otsu's threshold
 */
function otsuThreshold(histogram: number[], total: number): number {
    let sum = 0;
    for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVariance = 0;
    let threshold = 0;

    for (let i = 0; i < 256; i++) {
        wB += histogram[i];
        if (wB === 0) continue;

        wF = total - wB;
        if (wF === 0) break;

        sumB += i * histogram[i];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const variance = wB * wF * Math.pow(mB - mF, 2);

        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = i;
        }
    }

    return threshold;
}

/**
 * Deskew image based on detected lines
 */
export async function deskew(imageBlob: Blob): Promise<Blob> {
    const imageBitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);

    // Detect skew angle using projection profile
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const angle = detectSkewAngle(imageData);

    if (Math.abs(angle) < 0.1) {
        // No significant skew
        return imageBlob;
    }

    // Rotate to correct skew
    const rotatedCanvas = document.createElement('canvas');
    const rotatedCtx = rotatedCanvas.getContext('2d')!;

    const rad = (angle * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));

    rotatedCanvas.width = Math.floor(canvas.width * cos + canvas.height * sin);
    rotatedCanvas.height = Math.floor(canvas.height * cos + canvas.width * sin);

    rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    rotatedCtx.rotate(-rad);
    rotatedCtx.drawImage(imageBitmap, -canvas.width / 2, -canvas.height / 2);

    return new Promise((resolve) => {
        rotatedCanvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92);
    });
}

/**
 * Detect skew angle using horizontal projection
 */
function detectSkewAngle(imageData: ImageData): number {
    const { data, width, height } = imageData;
    const gray = new Uint8Array(width * height);

    // Convert to grayscale
    for (let i = 0; i < width * height; i++) {
        const idx = i * 4;
        gray[i] = data[idx] < 128 ? 1 : 0; // Binary for dark text
    }

    let bestAngle = 0;
    let maxVariance = 0;

    // Test angles from -5 to 5 degrees
    for (let angle = -5; angle <= 5; angle += 0.5) {
        const variance = calculateProjectionVariance(gray, width, height, angle);
        if (variance > maxVariance) {
            maxVariance = variance;
            bestAngle = angle;
        }
    }

    return bestAngle;
}

/**
 * Calculate variance of horizontal projection for given angle
 */
function calculateProjectionVariance(
    gray: Uint8Array,
    width: number,
    height: number,
    angle: number
): number {
    const rad = (angle * Math.PI) / 180;
    const projection = new Array(height).fill(0);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const newY = Math.round(y + x * Math.tan(rad));
            if (newY >= 0 && newY < height) {
                projection[newY] += gray[y * width + x];
            }
        }
    }

    // Calculate variance
    const mean = projection.reduce((a, b) => a + b, 0) / projection.length;
    const variance = projection.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / projection.length;

    return variance;
}

/**
 * Enhance image for OCR (contrast, sharpening)
 */
export async function enhance(imageBlob: Blob): Promise<Blob> {
    const imageBitmap = await createImageBitmap(imageBlob);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);

    // Apply contrast enhancement
    ctx.filter = 'contrast(1.2) brightness(1.05)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    // Apply unsharp mask for sharpening
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyUnsharpMask(imageData, 1, 0.5);
    ctx.putImageData(imageData, 0, 0);

    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92);
    });
}

/**
 * Apply unsharp mask for sharpening
 */
function applyUnsharpMask(imageData: ImageData, radius: number, amount: number): void {
    const { data, width, height } = imageData;
    const original = new Uint8ClampedArray(data);

    // Simple box blur for mask
    const blurred = boxBlur(original, width, height, radius);

    // Unsharp mask: original + amount * (original - blurred)
    for (let i = 0; i < data.length; i++) {
        if ((i + 1) % 4 === 0) continue; // Skip alpha
        data[i] = Math.min(255, Math.max(0, original[i] + amount * (original[i] - blurred[i])));
    }
}

/**
 * Simple box blur
 */
function boxBlur(data: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const result = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, count = 0;

            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;

                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const idx = (ny * width + nx) * 4;
                        r += data[idx];
                        g += data[idx + 1];
                        b += data[idx + 2];
                        count++;
                    }
                }
            }

            const idx = (y * width + x) * 4;
            result[idx] = r / count;
            result[idx + 1] = g / count;
            result[idx + 2] = b / count;
            result[idx + 3] = data[idx + 3];
        }
    }

    return result;
}

/**
 * Full preprocessing pipeline
 */
export async function preprocessImage(imageBlob: Blob): Promise<PreprocessingResult> {
    const issues: string[] = [];

    // Analyze quality
    const quality = await analyzeQuality(imageBlob);

    // Check for issues
    if (quality.blur < 0.3) {
        issues.push('Image appears blurry. Consider recapturing.');
    }
    if (quality.brightness < 0.3) {
        issues.push('Image is too dark. Try better lighting.');
    }
    if (quality.brightness > 0.8) {
        issues.push('Image is overexposed. Reduce lighting.');
    }
    if (quality.glare) {
        issues.push('Glare detected. Adjust angle to reduce reflections.');
    }
    if (quality.resolution.width < 1000 || quality.resolution.height < 1000) {
        issues.push('Low resolution. Move closer to document.');
    }

    // Calculate quality score
    const qualityScore = Math.max(0, Math.min(1,
        (quality.blur * 0.4) +
        (Math.abs(quality.brightness - 0.5) < 0.3 ? 0.3 : 0.1) +
        (quality.contrast * 0.2) +
        (quality.glare ? 0 : 0.1)
    ));

    // Apply enhancements
    let processed = imageBlob;

    // Enhance if quality is acceptable
    if (qualityScore > 0.3) {
        processed = await enhance(processed);
        processed = await deskew(processed);
    }

    // Create canvas for final result
    const imageBitmap = await createImageBitmap(processed);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    ctx.drawImage(imageBitmap, 0, 0);

    return {
        blob: processed,
        canvas,
        qualityScore,
        issues,
    };
}

export default {
    analyzeQuality,
    binarize,
    deskew,
    enhance,
    preprocessImage,
};
