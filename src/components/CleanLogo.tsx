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

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate max difference between channels to detect gray/white/neutral tones
        const maxVal = Math.max(r, g, b);
        const minVal = Math.min(r, g, b);
        const diff = maxVal - minVal;

        // If it's a shade of gray/white (very low color saturation)
        // or if it's very bright (white background/watermarks)
        if (diff < 40 || (r > 200 && g > 200 && b > 200)) {
          // Make it fully transparent
          data[i + 3] = 0;
        } else {
          // Keep the vibrant blue logo pixels
          data[i + 3] = 255;
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
