"use client";

import Image, { type ImageProps } from "next/image";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ImageWithLoaderProps = ImageProps & {
  loaderClassName?: string;
};

function getImageKey(src: ImageProps["src"]) {
  if (typeof src === "string") {
    return src;
  }

  return "src" in src ? src.src : String(src);
}

export function ImageWithLoader({
  alt,
  className,
  loaderClassName,
  onError,
  onLoad,
  src,
  ...props
}: ImageWithLoaderProps) {
  const imageKey = getImageKey(src);
  const [loadedImageKey, setLoadedImageKey] = useState<string | null>(null);
  const isLoaded = loadedImageKey === imageKey;

  return (
    <>
      <Image
        {...props}
        alt={alt}
        src={src}
        className={cn(className, !isLoaded && "opacity-0")}
        onError={(event) => {
          setLoadedImageKey(imageKey);
          onError?.(event);
        }}
        onLoad={(event) => {
          setLoadedImageKey(imageKey);
          onLoad?.(event);
        }}
      />
      {!isLoaded ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center bg-background/45 text-muted-foreground",
            loaderClassName
          )}
        >
          <Loader2 className="size-4 animate-spin" />
        </span>
      ) : null}
    </>
  );
}
