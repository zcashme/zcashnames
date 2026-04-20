"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";

const CANVAS_SIZE = 1080;
const DEFAULT_NAME_COLOR = "#f8f8f8";
const DEFAULT_NAME = "ZECHARIAH";
const SAMPLE_IMAGE_SRC = "/namepost/sample.png";
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

const logoVariations = [
  {
    label: "White",
    value: "white",
    src: "/brandkit/zcashnames-primary-logo-white-transparent-377x403.png",
    color: "#f8f8f8",
  },
  {
    label: "Black",
    value: "black",
    src: "/brandkit/zcashnames-primary-logo-black-transparent-377x403.png",
    color: "#111111",
  },
  {
    label: "Monochrome Green",
    value: "monochrome",
    src: "/brandkit/zcashnames-primary-logo-monochrome-green-transparent-377x403.png",
    color: "#9bbc0f",
  },
] as const;

type LogoVariation = (typeof logoVariations)[number]["value"];

const addressFontOptions = [
  {
    label: "UI Sans",
    value: "ui-sans",
    fontKey: "ui",
    weight: 900,
  },
  {
    label: "Brand Sans",
    value: "brand-sans",
    fontKey: "brand",
    weight: 800,
  },
  {
    label: "Script",
    value: "script",
    fontKey: "cursive",
    weight: 700,
  },
  {
    label: "Anton",
    value: "anton",
    fontKey: "anton",
    weight: 400,
  },
  {
    label: "Bebas Neue",
    value: "bebas",
    fontKey: "bebas",
    weight: 400,
  },
  {
    label: "Oswald",
    value: "oswald",
    fontKey: "oswald",
    weight: 700,
  },
  {
    label: "Space Grotesk",
    value: "space-grotesk",
    fontKey: "space",
    weight: 700,
  },
  {
    label: "Playfair Display",
    value: "playfair",
    fontKey: "playfair",
    weight: 900,
  },
] as const;

type AddressFont = (typeof addressFontOptions)[number]["value"];

const samplePosts = [
  "Send $ZEC to my ZcashName instead of copying a long address.",
  "@ZcashNames are easier to remember and easier to share.",
  "For $ZEC payments, skip the address copy-paste and use @ZcashNames.",
  "Send me $ZEC with @ZcashNames. Coming soon!",
] as const;

type LoadedImage = {
  element: HTMLImageElement;
  name: string;
  url: string;
};

type LoadedLogo = {
  element: HTMLImageElement;
};

type NavigatorWithShare = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return withHash.slice(0, 7);
}

function toProperCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b[\p{L}\p{N}]/gu, (letter) => letter.toUpperCase());
}

function getPostFilename(name: string): string {
  const safeName = (name.trim() || DEFAULT_NAME)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `${safeName || DEFAULT_NAME.toLowerCase()}_post.png`;
}

function getCoverCrop(image: HTMLImageElement) {
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  return {
    sx: (image.naturalWidth - side) / 2,
    sy: (image.naturalHeight - side) / 2,
    side,
  };
}

function fitSingleLineText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  initialSize: number,
  minSize: number,
  fontFamily: string,
  weight = 900,
) {
  let size = initialSize;
  do {
    context.font = `${weight} ${size}px ${fontFamily}`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 1;
  } while (size > minSize);

  context.fillText(text, x, y);
}

export default function AddressMeComposer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null);
  const [name, setName] = useState(DEFAULT_NAME);
  const [nameHexInput, setNameHexInput] = useState(DEFAULT_NAME_COLOR);
  const [logoVariation, setLogoVariation] = useState<LogoVariation>("white");
  const [addressFont, setAddressFont] = useState<AddressFont>("ui-sans");
  const [loadedLogo, setLoadedLogo] = useState<LoadedLogo | null>(null);
  const [brandFontFamily, setBrandFontFamily] = useState("Inter, Arial, Helvetica, sans-serif");
  const [uiFontFamily, setUiFontFamily] = useState("Manrope, Arial, Helvetica, sans-serif");
  const [cursiveFontFamily, setCursiveFontFamily] = useState('"Dancing Script", cursive');
  const [antonFontFamily, setAntonFontFamily] = useState("Anton, Arial, Helvetica, sans-serif");
  const [bebasFontFamily, setBebasFontFamily] = useState('"Bebas Neue", Arial, Helvetica, sans-serif');
  const [oswaldFontFamily, setOswaldFontFamily] = useState("Oswald, Arial, Helvetica, sans-serif");
  const [spaceFontFamily, setSpaceFontFamily] = useState('"Space Grotesk", Arial, Helvetica, sans-serif');
  const [playfairFontFamily, setPlayfairFontFamily] = useState('"Playfair Display", Georgia, serif');
  const [canSharePng, setCanSharePng] = useState(false);
  const [status, setStatus] = useState("");
  const [imageStatus, setImageStatus] = useState("");

  const nameColor = useMemo(() => {
    const normalized = normalizeHex(nameHexInput);
    return HEX_PATTERN.test(normalized) ? normalized : DEFAULT_NAME_COLOR;
  }, [nameHexInput]);

  const selectedLogo = useMemo(() => {
    return logoVariations.find((logo) => logo.value === logoVariation) ?? logoVariations[0];
  }, [logoVariation]);

  const selectedAddressFont = useMemo(() => {
    return addressFontOptions.find((font) => font.value === addressFont) ?? addressFontOptions[0];
  }, [addressFont]);

  const selectedAddressFontFamily = useMemo(() => {
    if (selectedAddressFont.fontKey === "ui") return uiFontFamily;
    if (selectedAddressFont.fontKey === "cursive") return cursiveFontFamily;
    if (selectedAddressFont.fontKey === "anton") return antonFontFamily;
    if (selectedAddressFont.fontKey === "bebas") return bebasFontFamily;
    if (selectedAddressFont.fontKey === "oswald") return oswaldFontFamily;
    if (selectedAddressFont.fontKey === "space") return spaceFontFamily;
    if (selectedAddressFont.fontKey === "playfair") return playfairFontFamily;
    return brandFontFamily;
  }, [
    antonFontFamily,
    bebasFontFamily,
    brandFontFamily,
    cursiveFontFamily,
    oswaldFontFamily,
    playfairFontFamily,
    selectedAddressFont,
    spaceFontFamily,
    uiFontFamily,
  ]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    context.fillStyle = "#141414";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (loadedImage) {
      const crop = getCoverCrop(loadedImage.element);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        loadedImage.element,
        crop.sx,
        crop.sy,
        crop.side,
        crop.side,
        0,
        0,
        CANVAS_SIZE,
        CANVAS_SIZE,
      );
    } else {
      const gradient = context.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      gradient.addColorStop(0, "#273a3a");
      gradient.addColorStop(0.58, "#1c1c1d");
      gradient.addColorStop(1, "#0e0f10");
      context.fillStyle = gradient;
      context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.13)";
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    context.restore();

    const logoColor = selectedLogo.color;

    context.fillStyle = logoColor;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(0, 0, 0, 0.18)";
    context.shadowBlur = 2;
    context.shadowOffsetY = 1;

    const rawName = name.trim() || DEFAULT_NAME;
    const useProperCase = selectedAddressFont.fontKey === "cursive";
    const displayName = useProperCase ? toProperCase(rawName) : rawName.toUpperCase();
    const addressText = useProperCase ? "Address Me By My Name" : "ADDRESS ME BY MY NAME";

    context.fillStyle = nameColor;
    fitSingleLineText(
      context,
      displayName,
      540,
      463,
      430,
      38,
      24,
      selectedAddressFontFamily,
      selectedAddressFont.weight,
    );

    context.fillStyle = nameColor;
    fitSingleLineText(
      context,
      addressText,
      540,
      555,
      880,
      74,
      46,
      selectedAddressFontFamily,
      selectedAddressFont.weight,
    );

    context.shadowBlur = 1;
    if (loadedLogo) {
      const logoHeight = 72;
      const logoWidth = (loadedLogo.element.naturalWidth / loadedLogo.element.naturalHeight) * logoHeight;
      context.drawImage(loadedLogo.element, 540 - logoWidth / 2, 900 - logoHeight / 2, logoWidth, logoHeight);
    }

    context.fillStyle = logoColor;
    context.font = `400 34px ${brandFontFamily}`;
    context.fillText("ZcashNames", 540, 982);
  }, [
    brandFontFamily,
    loadedImage,
    loadedLogo,
    name,
    nameColor,
    selectedAddressFont,
    selectedAddressFontFamily,
    selectedLogo,
  ]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const target = rootRef.current ?? document.body;
    const styles = getComputedStyle(target);
    const resolvedBrandFont = styles.getPropertyValue("--font-brand").trim();
    const resolvedUiFont = styles.getPropertyValue("--font-ui").trim();
    const resolvedCursiveFont = styles.getPropertyValue("--font-cursive").trim();
    const resolvedAntonFont = styles.getPropertyValue("--font-namepost-anton").trim();
    const resolvedBebasFont = styles.getPropertyValue("--font-namepost-bebas").trim();
    const resolvedOswaldFont = styles.getPropertyValue("--font-namepost-oswald").trim();
    const resolvedSpaceFont = styles.getPropertyValue("--font-namepost-space").trim();
    const resolvedPlayfairFont = styles.getPropertyValue("--font-namepost-playfair").trim();

    if (resolvedBrandFont) setBrandFontFamily(`${resolvedBrandFont}, Inter, Arial, Helvetica, sans-serif`);
    if (resolvedUiFont) setUiFontFamily(`${resolvedUiFont}, Manrope, Arial, Helvetica, sans-serif`);
    if (resolvedCursiveFont) setCursiveFontFamily(`${resolvedCursiveFont}, "Dancing Script", cursive`);
    if (resolvedAntonFont) setAntonFontFamily(`${resolvedAntonFont}, Anton, Arial, Helvetica, sans-serif`);
    if (resolvedBebasFont) setBebasFontFamily(`${resolvedBebasFont}, "Bebas Neue", Arial, Helvetica, sans-serif`);
    if (resolvedOswaldFont) setOswaldFontFamily(`${resolvedOswaldFont}, Oswald, Arial, Helvetica, sans-serif`);
    if (resolvedSpaceFont) setSpaceFontFamily(`${resolvedSpaceFont}, "Space Grotesk", Arial, Helvetica, sans-serif`);
    if (resolvedPlayfairFont) setPlayfairFontFamily(`${resolvedPlayfairFont}, "Playfair Display", Georgia, serif`);
  }, []);

  useEffect(() => {
    const nav = navigator as NavigatorWithShare;
    if (!nav.share || !nav.canShare) return;

    const testFile = new File([""], "namepost.png", { type: "image/png" });
    setCanSharePng(nav.canShare({ files: [testFile] }));
  }, []);

  useEffect(() => {
    const logo = new Image();
    logo.onload = () => setLoadedLogo({ element: logo });
    logo.onerror = () => {
      setLoadedLogo(null);
      setStatus("That logo variation could not be loaded.");
    };
    logo.src = selectedLogo.src;
  }, [selectedLogo]);

  useEffect(() => {
    return () => {
      if (loadedImage?.url.startsWith("blob:")) URL.revokeObjectURL(loadedImage.url);
    };
  }, [loadedImage]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageStatus("");
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageStatus("Choose an image file.");
      event.target.value = "";
      return;
    }

    const activateImage = (image: HTMLImageElement, src: string) => {
      setLoadedImage((current) => {
        if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
        return { element: image, name: file.name, url: src };
      });
    };

    const loadDataUrlFallback = (objectUrl: string) => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          setImageStatus("That image could not be loaded.");
          return;
        }

        const fallbackImage = new Image();
        fallbackImage.onload = () => activateImage(fallbackImage, reader.result as string);
        fallbackImage.onerror = () => setImageStatus("That image could not be loaded.");
        fallbackImage.src = reader.result;
      };
      reader.onerror = () => setImageStatus("That image could not be loaded.");
      reader.readAsDataURL(file);
    };

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => activateImage(image, url);
    image.onerror = () => loadDataUrlFallback(url);
    image.src = url;
  }

  function removeImage() {
    setLoadedImage((current) => {
      if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
      return null;
    });
    setImageStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function useSampleImage() {
    setImageStatus("");
    const image = new Image();
    image.onload = () => {
      setLoadedImage((current) => {
        if (current?.url.startsWith("blob:")) URL.revokeObjectURL(current.url);
        return { element: image, name: "sample.png", url: SAMPLE_IMAGE_SRC };
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    image.onerror = () => setImageStatus("The sample image could not be loaded.");
    image.src = SAMPLE_IMAGE_SRC;
  }

  function handleNameHexChange(value: string) {
    const normalized = normalizeHex(value);
    setNameHexInput(normalized);
    if (!HEX_PATTERN.test(normalized)) {
      setStatus("Enter a 6-digit hex color.");
      return;
    }
    setStatus("");
  }

  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = getPostFilename(name);
    link.click();
  }

  async function getCanvasPngFile(): Promise<File | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }

        resolve(new File([blob], getPostFilename(name), { type: "image/png" }));
      }, "image/png");
    });
  }

  async function sharePng() {
    const nav = navigator as NavigatorWithShare;
    if (!nav.share || !nav.canShare) {
      setStatus("Sharing is not supported in this browser. Download the PNG instead.");
      return;
    }

    const file = await getCanvasPngFile();
    if (!file) {
      setStatus("Could not prepare the PNG for sharing.");
      return;
    }

    const shareData: ShareData = {
      title: "ZcashNames",
      text: "When you send me $ZEC, use @zcashnames",
      files: [file],
    };

    if (!nav.canShare(shareData)) {
      setStatus("This browser cannot share PNG files. Download the PNG instead.");
      return;
    }

    try {
      await nav.share(shareData);
      setStatus("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Sharing failed. Download the PNG instead.");
    }
  }

  async function copySamplePost(post: string) {
    try {
      await navigator.clipboard.writeText(post);
      setStatus("Post copied.");
    } catch {
      setStatus("Copy failed. Select the text and copy it manually.");
    }
  }

  function sharePostOnX(post: string) {
    const params = new URLSearchParams({ text: post });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div ref={rootRef} className="mx-auto grid w-full max-w-4xl gap-6">
      <section className="rounded-lg border border-border-muted bg-[var(--color-card)] p-5">
        <div className="grid gap-5">
          <div>
            <h2 className="text-lg font-bold text-fg-heading">Make Yours</h2>
            <p className="mt-2 text-sm leading-6 text-fg-body">
              Upload an image, choose a text color, and export a square PNG.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase text-fg-muted" htmlFor="address-name">
              Name
            </label>
            <input
              id="address-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
              placeholder={DEFAULT_NAME}
              maxLength={32}
              spellCheck={false}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase text-fg-muted" htmlFor="address-image">
              Image (Center-Cropped Square)
            </label>
            <input
              ref={fileInputRef}
              id="address-image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-0 text-sm font-semibold text-fg-body">
                {loadedImage ? loadedImage.name : "No file chosen"}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
              >
                Upload image
              </button>
              <button
                type="button"
                onClick={useSampleImage}
                className="rounded-md border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
              >
                See sample
              </button>
              {loadedImage && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="rounded-md border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
                >
                  Remove image
                </button>
              )}
            </div>
          </div>

          {imageStatus && <p className="text-sm font-semibold text-[#ff8a8a]">{imageStatus}</p>}
        </div>
      </section>

      <section className="min-w-0">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          aria-label="Square preview with Address Me By My Name text"
          className="aspect-square w-full rounded-lg border border-border-muted bg-[var(--color-raised)]"
        />
      </section>

      <section className="rounded-lg border border-border-muted bg-[var(--color-card)] p-5">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase text-fg-muted" htmlFor="address-name-color-text">
              Color
            </label>
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-2">
              <input
                id="address-name-color-picker"
                type="color"
                value={nameColor}
                onChange={(event) => handleNameHexChange(event.target.value)}
                className="h-11 w-full rounded-md border border-border-muted bg-transparent p-1"
                aria-label="Pick name color"
              />
              <input
                id="address-name-color-text"
                type="text"
                value={nameHexInput}
                onChange={(event) => handleNameHexChange(event.target.value)}
                className="min-w-0 rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 font-mono text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
                placeholder="#f8f8f8"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase text-fg-muted" htmlFor="address-font">
              Font
            </label>
            <select
              id="address-font"
              value={addressFont}
              onChange={(event) => setAddressFont(event.target.value as AddressFont)}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
            >
              {addressFontOptions.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-bold uppercase text-fg-muted" htmlFor="address-logo-variation">
              Logo
            </label>
            <select
              id="address-logo-variation"
              value={logoVariation}
              onChange={(event) => setLogoVariation(event.target.value as LogoVariation)}
              className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading outline-none focus:border-fg-heading"
            >
              {logoVariations.map((logo) => (
                <option key={logo.value} value={logo.value}>
                  {logo.label}
                </option>
              ))}
            </select>
          </div>

          {status && <p className="text-sm font-semibold text-[#ff8a8a] sm:col-span-3">{status}</p>}

          <div className="grid gap-3 border-t border-border-muted pt-5 sm:col-span-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={downloadPng}
              className="rounded-md border border-fg-heading bg-[var(--fg-heading)] px-4 py-3 text-sm font-bold text-[var(--color-background)] transition-opacity hover:opacity-90"
            >
              Download PNG
            </button>
            {canSharePng && (
              <button
                type="button"
                onClick={() => void sharePng()}
                className="rounded-md border border-fg-heading bg-[var(--fg-heading)] px-4 py-3 text-sm font-bold text-[var(--color-background)] transition-opacity hover:opacity-90"
              >
                Share PNG
              </button>
            )}
          </div>

          <div className="grid gap-3 border-t border-border-muted pt-5 sm:col-span-3">
            <p className="text-xs font-bold uppercase text-fg-muted">Sample Posts</p>
            <div className="grid gap-3">
              {samplePosts.map((post) => (
                <div
                  key={post}
                  className="grid gap-2 rounded-md border border-border-muted bg-[var(--color-raised)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <p className="text-sm leading-6 text-fg-body">{post}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copySamplePost(post)}
                      className="rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => sharePostOnX(post)}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
                    >
                      <span>Share on</span>
                      <svg
                        role="img"
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="currentColor"
                        aria-label="X"
                      >
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
