"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SocialIcon from "@/components/SocialIcon";
import { COMMUNITIES } from "@/lib/zns/brand";

const SUPPORT_EMAIL = "support@zcashnames.com";
const SUPPORT_MENU_ACTIONS_ID = "site-support-actions";

type SupportAction = {
  label: "Discord" | "Telegram" | "Email" | "FAQ";
  href: string;
  external: boolean;
};

function HeadsetIcon({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 225 13 L 224 14 L 218 14 L 217 15 L 211 15 L 210 16 L 207 16 L 206 17 L 203 17 L 202 18 L 199 18 L 198 19 L 195 19 L 194 20 L 192 20 L 191 21 L 189 21 L 188 22 L 186 22 L 183 24 L 181 24 L 180 25 L 178 25 L 177 26 L 176 26 L 171 29 L 169 29 L 168 30 L 167 30 L 166 31 L 165 31 L 164 32 L 161 33 L 159 35 L 158 35 L 157 36 L 156 36 L 155 37 L 152 38 L 150 40 L 149 40 L 147 42 L 146 42 L 143 45 L 142 45 L 140 47 L 139 47 L 137 49 L 136 49 L 131 54 L 130 54 L 124 60 L 123 60 L 113 70 L 113 71 L 107 77 L 107 78 L 102 83 L 102 84 L 100 86 L 100 87 L 97 90 L 97 91 L 93 96 L 92 99 L 90 101 L 89 104 L 87 106 L 87 107 L 86 108 L 86 109 L 85 110 L 85 111 L 84 112 L 84 113 L 81 118 L 81 120 L 78 125 L 78 127 L 77 128 L 77 130 L 75 133 L 75 135 L 74 136 L 74 138 L 73 139 L 73 141 L 72 142 L 72 145 L 71 146 L 71 149 L 70 150 L 70 153 L 69 154 L 69 157 L 68 158 L 68 163 L 67 164 L 67 170 L 66 171 L 66 175 L 65 176 L 65 177 L 63 179 L 62 179 L 61 180 L 36 180 L 35 181 L 33 181 L 32 182 L 31 182 L 30 183 L 27 184 L 25 186 L 24 186 L 16 194 L 16 195 L 13 198 L 13 199 L 12 200 L 12 201 L 11 202 L 11 203 L 10 204 L 10 205 L 7 210 L 7 212 L 6 213 L 6 215 L 5 216 L 5 218 L 4 219 L 4 222 L 3 223 L 3 227 L 2 228 L 2 233 L 1 234 L 1 241 L 0 242 L 0 310 L 1 311 L 1 316 L 2 317 L 2 321 L 3 322 L 3 324 L 4 325 L 4 327 L 5 328 L 5 330 L 6 331 L 6 332 L 7 333 L 7 334 L 8 335 L 9 338 L 11 340 L 11 341 L 21 351 L 22 351 L 24 353 L 25 353 L 30 356 L 32 356 L 33 357 L 36 357 L 37 358 L 109 358 L 110 357 L 112 357 L 113 356 L 116 355 L 118 353 L 119 353 L 122 350 L 122 349 L 124 347 L 124 346 L 126 343 L 126 341 L 127 340 L 127 198 L 126 197 L 126 195 L 125 194 L 125 193 L 124 192 L 123 189 L 117 183 L 116 183 L 113 181 L 111 181 L 110 180 L 105 180 L 102 178 L 102 170 L 103 169 L 103 165 L 104 164 L 104 161 L 105 160 L 105 157 L 106 156 L 106 153 L 107 152 L 107 150 L 108 149 L 108 147 L 110 144 L 110 142 L 111 141 L 111 139 L 112 138 L 112 137 L 113 136 L 113 135 L 114 134 L 114 133 L 115 132 L 115 131 L 116 130 L 116 129 L 117 128 L 117 127 L 118 126 L 118 125 L 119 124 L 120 121 L 122 119 L 123 116 L 125 114 L 125 113 L 127 111 L 127 110 L 130 107 L 130 106 L 133 103 L 133 102 L 140 95 L 140 94 L 145 89 L 146 89 L 154 81 L 155 81 L 160 76 L 161 76 L 163 74 L 164 74 L 166 72 L 167 72 L 172 68 L 173 68 L 174 67 L 175 67 L 176 66 L 179 65 L 181 63 L 182 63 L 185 61 L 187 61 L 188 60 L 189 60 L 194 57 L 196 57 L 197 56 L 199 56 L 200 55 L 202 55 L 203 54 L 205 54 L 206 53 L 209 53 L 210 52 L 213 52 L 214 51 L 217 51 L 218 50 L 223 50 L 224 49 L 230 49 L 231 48 L 245 48 L 246 47 L 265 47 L 266 48 L 280 48 L 281 49 L 287 49 L 288 50 L 293 50 L 294 51 L 297 51 L 298 52 L 301 52 L 302 53 L 305 53 L 306 54 L 308 54 L 309 55 L 311 55 L 312 56 L 314 56 L 315 57 L 317 57 L 322 60 L 324 60 L 325 61 L 326 61 L 327 62 L 328 62 L 329 63 L 332 64 L 334 66 L 335 66 L 336 67 L 339 68 L 341 70 L 342 70 L 344 72 L 345 72 L 347 74 L 348 74 L 350 76 L 351 76 L 355 80 L 356 80 L 360 84 L 361 84 L 373 96 L 373 97 L 379 103 L 379 104 L 385 111 L 385 112 L 387 114 L 388 117 L 390 119 L 391 122 L 393 124 L 393 125 L 394 126 L 394 127 L 395 128 L 395 129 L 396 130 L 396 131 L 399 136 L 399 138 L 401 141 L 401 143 L 402 144 L 402 146 L 403 147 L 403 149 L 404 150 L 404 152 L 405 153 L 405 156 L 406 157 L 406 159 L 407 160 L 407 164 L 408 165 L 408 169 L 409 170 L 409 178 L 407 180 L 401 180 L 400 181 L 398 181 L 397 182 L 394 183 L 388 189 L 388 190 L 385 195 L 385 197 L 384 198 L 384 340 L 385 341 L 385 343 L 386 344 L 387 347 L 389 349 L 389 350 L 392 353 L 393 353 L 395 355 L 396 355 L 399 357 L 401 357 L 402 358 L 420 358 L 421 359 L 421 364 L 420 365 L 420 368 L 419 369 L 419 372 L 418 373 L 418 375 L 417 376 L 417 379 L 416 380 L 416 382 L 415 383 L 415 385 L 414 386 L 414 388 L 413 389 L 413 391 L 412 392 L 412 394 L 411 395 L 411 396 L 408 401 L 408 403 L 407 404 L 407 405 L 406 406 L 406 407 L 405 408 L 405 409 L 404 410 L 404 411 L 403 412 L 402 415 L 400 417 L 400 418 L 398 420 L 398 421 L 396 423 L 396 424 L 393 427 L 393 428 L 382 439 L 381 439 L 378 442 L 377 442 L 372 446 L 371 446 L 366 449 L 364 449 L 363 450 L 361 450 L 360 451 L 357 451 L 356 452 L 352 452 L 351 453 L 306 453 L 302 449 L 301 446 L 293 438 L 292 438 L 290 436 L 289 436 L 286 434 L 284 434 L 283 433 L 281 433 L 280 432 L 233 432 L 232 433 L 230 433 L 229 434 L 227 434 L 226 435 L 225 435 L 224 436 L 221 437 L 212 446 L 212 447 L 209 452 L 209 454 L 208 455 L 208 457 L 207 458 L 207 473 L 208 474 L 208 476 L 209 477 L 209 479 L 210 480 L 211 483 L 213 485 L 213 486 L 219 492 L 220 492 L 222 494 L 223 494 L 228 497 L 230 497 L 231 498 L 234 498 L 235 499 L 278 499 L 279 498 L 283 498 L 286 496 L 288 496 L 290 494 L 291 494 L 293 492 L 294 492 L 300 486 L 300 485 L 302 483 L 303 480 L 306 478 L 353 478 L 354 477 L 360 477 L 361 476 L 365 476 L 366 475 L 368 475 L 369 474 L 371 474 L 372 473 L 374 473 L 375 472 L 377 472 L 378 471 L 379 471 L 380 470 L 381 470 L 382 469 L 383 469 L 384 468 L 387 467 L 389 465 L 390 465 L 392 463 L 393 463 L 395 461 L 396 461 L 407 451 L 407 450 L 413 444 L 413 443 L 416 440 L 416 439 L 418 437 L 418 436 L 421 433 L 421 432 L 422 431 L 423 428 L 425 426 L 425 425 L 426 424 L 426 423 L 427 422 L 427 421 L 428 420 L 428 419 L 429 418 L 429 417 L 432 412 L 432 410 L 433 409 L 433 408 L 434 407 L 434 405 L 436 402 L 436 400 L 437 399 L 437 397 L 438 396 L 438 394 L 439 393 L 439 391 L 440 390 L 440 388 L 441 387 L 441 385 L 442 384 L 442 381 L 443 380 L 443 377 L 444 376 L 444 373 L 445 372 L 445 369 L 446 368 L 446 364 L 447 363 L 447 361 L 450 358 L 474 358 L 475 357 L 478 357 L 479 356 L 481 356 L 482 355 L 483 355 L 484 354 L 487 353 L 489 351 L 490 351 L 500 341 L 500 340 L 502 338 L 502 337 L 503 336 L 503 335 L 506 330 L 506 328 L 507 327 L 507 325 L 508 324 L 508 322 L 509 321 L 509 317 L 510 316 L 510 311 L 511 310 L 511 242 L 510 241 L 510 234 L 509 233 L 509 228 L 508 227 L 508 224 L 507 223 L 507 220 L 506 219 L 506 216 L 505 215 L 505 213 L 503 210 L 503 208 L 502 207 L 502 206 L 501 205 L 501 204 L 500 203 L 499 200 L 497 198 L 497 197 L 494 194 L 494 193 L 488 187 L 487 187 L 484 184 L 483 184 L 480 182 L 478 182 L 475 180 L 451 180 L 450 179 L 448 179 L 445 176 L 445 171 L 444 170 L 444 164 L 443 163 L 443 158 L 442 157 L 442 154 L 441 153 L 441 150 L 440 149 L 440 146 L 439 145 L 439 142 L 438 141 L 438 139 L 437 138 L 437 136 L 436 135 L 436 133 L 434 130 L 434 128 L 433 127 L 433 125 L 432 124 L 432 123 L 429 118 L 429 116 L 428 115 L 428 114 L 427 113 L 427 112 L 426 111 L 425 108 L 423 106 L 423 105 L 422 104 L 421 101 L 419 99 L 418 96 L 416 94 L 416 93 L 414 91 L 414 90 L 411 87 L 411 86 L 409 84 L 409 83 L 399 72 L 399 71 L 387 59 L 386 59 L 375 49 L 374 49 L 372 47 L 371 47 L 369 45 L 368 45 L 365 42 L 364 42 L 362 40 L 359 39 L 357 37 L 356 37 L 355 36 L 352 35 L 350 33 L 349 33 L 348 32 L 347 32 L 342 29 L 340 29 L 339 28 L 338 28 L 333 25 L 331 25 L 330 24 L 328 24 L 325 22 L 323 22 L 322 21 L 320 21 L 319 20 L 317 20 L 316 19 L 313 19 L 312 18 L 309 18 L 308 17 L 305 17 L 304 16 L 300 16 L 299 15 L 294 15 L 293 14 L 287 14 L 286 13 L 276 13 L 275 12 L 236 12 L 235 13 Z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MailIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function FaqIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.25 9a2.75 2.75 0 1 1 4.64 2l-1.02.95a2 2 0 0 0-.63 1.47V14" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function ActionIcon({ label }: { label: SupportAction["label"] }) {
  if (label === "Email") {
    return <MailIcon className="h-8 w-8" />;
  }

  if (label === "FAQ") {
    return <FaqIcon className="h-8 w-8" />;
  }

  return <SocialIcon label={label} className="h-8 w-8" />;
}

export default function SiteSupportMenu({
  feedbackLauncherEnabled,
}: {
  feedbackLauncherEnabled: boolean;
}) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuHeight, setMenuHeight] = useState(112);
  const [footerHidden, setFooterHidden] = useState(false);

  const shouldHideForFeedback = pathname === "/" && feedbackLauncherEnabled;
  const supportActions = useMemo<SupportAction[]>(
    () => [
      ...COMMUNITIES.filter(
        (community): community is (typeof COMMUNITIES)[number] & { label: "Discord" | "Telegram" } =>
          community.label === "Discord" || community.label === "Telegram",
      ).map((community) => ({
        label: community.label,
        href: community.href,
        external: true,
      })),
      {
        label: "Email",
        href: `mailto:${SUPPORT_EMAIL}`,
        external: false,
      },
      {
        label: "FAQ",
        href: "/faq",
        external: false,
      },
    ],
    [],
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname, shouldHideForFeedback]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(menu.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setMenuHeight(nextHeight);
      }
    };

    updateHeight();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }

    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(menu);

    return () => resizeObserver.disconnect();
  }, [open]);

  useEffect(() => {
    if (shouldHideForFeedback) {
      setFooterHidden(false);
      return;
    }

    const footerElement = document.querySelector<HTMLElement>("[data-site-footer]");
    if (!footerElement) {
      setFooterHidden(false);
      return;
    }
    const footer = footerElement;

    let frameId = 0;
    const footerResizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => scheduleUpdate())
        : null;

    function updateFooterVisibility() {
      const shellBottom = window.innerHeight - 20;
      const shellTop = shellBottom - menuHeight;
      const clearance = 12;
      const footerRect = footer.getBoundingClientRect();
      const overlapsFooter =
        footerRect.top <= shellBottom + clearance &&
        footerRect.bottom >= shellTop - clearance;

      setFooterHidden(overlapsFooter);
    }

    function scheduleUpdate() {
      cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateFooterVisibility);
    }

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    footerResizeObserver?.observe(footer);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      footerResizeObserver?.disconnect();
    };
  }, [menuHeight, pathname, shouldHideForFeedback]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (shouldHideForFeedback) {
    return null;
  }

  const floatingShellStyle: React.CSSProperties = {
    transform: footerHidden ? "translate3d(0, calc(100% + 1.5rem), 0)" : "translate3d(0, 0, 0)",
    opacity: footerHidden ? 0 : 1,
    pointerEvents: footerHidden ? "none" : "auto",
    transition:
      "transform 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease",
  };

  const supportButtonStyle: React.CSSProperties = {
    background: "var(--home-result-primary-bg)",
    color: "var(--home-result-primary-fg)",
    boxShadow: "var(--home-result-primary-shadow)",
  };

  const actionButtonStyle: React.CSSProperties = {
    background: "var(--color-raised)",
    border: "1px solid var(--border-muted)",
    color: "var(--fg-body)",
    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.16)",
  };

  const actionLabelStyle: React.CSSProperties = {
    background: "color-mix(in srgb, var(--color-raised) 84%, transparent)",
    border: "1px solid color-mix(in srgb, var(--border-muted) 88%, transparent)",
    color: "var(--fg-body)",
    boxShadow: "0 10px 22px rgba(0, 0, 0, 0.12)",
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9997]" style={floatingShellStyle}>
      <div ref={menuRef} className="flex flex-col items-end">
        <div
          id={SUPPORT_MENU_ACTIONS_ID}
          aria-hidden={!open}
          className="site-support-actions"
          data-open={open ? "true" : "false"}
        >
          <div className="site-support-actions-inner">
            <div className="site-support-actions-stack">
              {supportActions.map((action) => (
                <div
                  key={action.label}
                  className="group flex items-center justify-end gap-3"
                >
                  <span
                    className="inline-flex min-h-[2.75rem] items-center rounded-full px-4 text-[0.95rem] font-semibold transition-colors duration-150 group-hover:bg-[var(--verify-menu-hover-fill)]"
                    style={actionLabelStyle}
                  >
                    {action.label}
                  </span>
                  <a
                    href={action.href}
                    target={action.external ? "_blank" : undefined}
                    rel={action.external ? "noopener noreferrer" : undefined}
                    onClick={() => setOpen(false)}
                    tabIndex={open ? undefined : -1}
                    aria-label={action.label}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-full transition-[transform,opacity,border-color,background-color] duration-150 hover:opacity-85 group-hover:bg-[var(--verify-menu-hover-fill)]"
                    style={actionButtonStyle}
                  >
                    <ActionIcon label={action.label} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-controls={SUPPORT_MENU_ACTIONS_ID}
          aria-expanded={open}
          aria-label={open ? "Close support menu" : "Open support menu"}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-16 w-16 items-center justify-center rounded-full transition-[transform,opacity] duration-150 hover:opacity-90"
          style={supportButtonStyle}
        >
          <HeadsetIcon />
        </button>
      </div>
    </div>
  );
}
