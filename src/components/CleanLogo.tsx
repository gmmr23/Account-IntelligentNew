import React, { useEffect, useState } from 'react';

interface CleanLogoProps {
  src: string;
  className?: string;
  alt?: string;
}

export default function CleanLogo({ src, className, alt }: CleanLogoProps) {
  const [cleanedSrc, setCleanedSrc] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const width = canvas.width;
      const height = canvas.height;

      const visited = new Uint8Array(width * height);
      const queue: number[] = [];

      const isWhiteBg = (r: number, g: number, b: number) => {
        return r > 215 && g > 215 && b > 215;
      };

      // Add all border pixels to initial queue
      for (let x = 0; x < width; x++) {
        queue.push(x, 0);
        queue.push(x, height - 1);
      }
      for (let y = 0; y < height; y++) {
        queue.push(0, y);
        queue.push(width - 1, y);
      }

      let qHead = 0;
      while (qHead < queue.length) {
        const cx = queue[qHead++];
        const cy = queue[qHead++];
        const idx = cy * width + cx;

        if (visited[idx]) continue;
        visited[idx] = 1;

        const pixelIdx = idx * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];

        if (isWhiteBg(r, g, b)) {
          data[pixelIdx + 3] = 0; // Make background transparent

          // Add 4-directional neighbors
          if (cx > 0) queue.push(cx - 1, cy);
          if (cx < width - 1) queue.push(cx + 1, cy);
          if (cy > 0) queue.push(cx, cy - 1);
          if (cy < height - 1) queue.push(cx, cy + 1);
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setCleanedSrc(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      setCleanedSrc(src);
    };
  }, [src]);

  if (!cleanedSrc) {
    return <div className={className} style={{ height: '44px' }} />;
  }

  return <img src={cleanedSrc} className={className} alt={alt} />;
}
