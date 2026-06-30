# Internal Repo Cleanup Checklist

Use this workflow for every batch:

1. Delete or move the listed paths.
2. Run `rg` with the suggested keywords.
3. Run `pnpm exec tsc --noEmit`.
4. Run `pnpm build`.
5. Only continue if all of that is clean.

## Batch 0

- [x] Move `app/(site)/quotepost/` to `app/(site)/internal/quotepost/` or equivalent internal-only location
- [x] Update `app/(site)/internal/page.tsx` to point from `/quotepost` to `/internal/quotepost`
- [x] Remove any internal links that expect this repo to host `/unsubscribe`
- [x] Confirm `/internal/link-previews` still intentionally depends on `app/og/**`

Check:

```powershell
rg -n "/quotepost|/unsubscribe|/internal/quotepost" app components lib
pnpm exec tsc --noEmit
pnpm build
```

## Batch 1

- [x] Delete `app/(site)/indexerbb/`
- [x] Delete `components/indexerbb/`
- [x] Delete `zechariah-manifesto.md`
- [x] Delete `engineering-tenets-draft.md`
- [x] Delete `naming-ceremony.md`

Check:

```powershell
rg -n "indexerbb|zechariah-manifesto|engineering-tenets|naming-ceremony" .
pnpm exec tsc --noEmit
pnpm build
```

## Batch 2

- [x] Delete `app/(docs)/`
- [x] Delete `content/`
- [x] Delete `components/docs/`
- [x] Delete `mdx-components.tsx`

Check:

```powershell
rg -n "/docs|components/docs|content/|mdx-components" app components lib
pnpm exec tsc --noEmit
pnpm build
```

## Batch 3

- [x] Delete `app/(site)/page.tsx`
- [x] Delete `app/(site)/waitlist/`
- [x] Delete `app/(site)/NetworkPageClient.tsx`
- [x] Delete `components/landing/`
- [x] Delete `components/waitlist/`
- [x] Delete `lib/waitlist/`
- [x] Delete public-site logic from `middleware.ts`
- [x] Delete waitlist/homepage redirects and rewrites from `next.config.ts`
- [x] Delete `app/manifest.ts`
- [x] Delete `public/sw.js`

Check:

```powershell
rg -n "/waitlist|waitlist/|BetaApplyBar|manifest|sw.js|NetworkPageClient" app components lib next.config.ts middleware.ts public
pnpm exec tsc --noEmit
pnpm build
```

## Batch 4

- [x] Delete `app/(site)/community/`
- [x] Delete `components/community/`
- [x] Delete `lib/community/`
- [x] Delete `app/(site)/leaders/`
- [x] Delete `app/(site)/sharekit/`
- [x] Delete `lib/sharekit.ts`
- [x] Delete `lib/share.ts`
- [x] Delete `lib/sharekit-recovery.ts`
- [x] Delete `lib/sharekit-recovery-throttle.ts`
- [x] Delete `components/ReferralCodeRecovery.tsx`
- [x] Keep `lib/leaders/commission-access.ts`
- [x] Keep `lib/leaders/commission-pin.ts`
- [x] Keep `lib/leaders/referral-dashboard.ts`

Check:

```powershell
rg -n "/leaders|/sharekit|/community|sharekit|referral-dashboard|commission-access|community/" app components lib
pnpm exec tsc --noEmit
pnpm build
```

## Batch 5

- [x] Delete `app/(site)/explorer/`
- [x] Delete `app/(site)/collections/`
- [x] Delete `components/search/`
- [x] Delete `components/NameStatus.tsx`
- [x] Delete `components/ActionBadge.tsx`
- [x] Remove header links to `/explorer` and `/collections`
- [x] Keep `app/og/`
- [x] Keep `lib/seo/`
- [x] Keep `lib/zns/` for now
- [x] Keep `lib/network-stats.ts` for now
- [x] Keep `lib/exchange-rate.ts` for now

Check:

```powershell
rg -n "/explorer|/collections|@/app/\\(site\\)/explorer|NameStatus|ActionBadge|components/search" app components lib
pnpm exec tsc --noEmit
pnpm build
```

## Batch 6

Delete:

- [x] Delete `app/(site)/beta/`
- [x] Delete `app/(beta-popout)/`
- [x] Delete `components/beta/`
- [x] Delete `components/closedbeta/`
- [x] Delete `components/NetworkToggle.tsx`
- [x] Delete `lib/beta/walletFaq.tsx`
- [ ] Remove `lib/beta/gate.ts` if nothing retained still imports it

Keep:

- [x] Keep `app/admin/beta/`
- [x] Keep `app/admin/beta-v2/`
- [x] Keep `lib/beta/drafts.ts`
- [x] Keep `lib/beta/report.ts`
- [x] Keep `lib/beta/checklist.ts`
- [x] Keep `lib/beta/git-changes.ts`
- [x] Keep `lib/beta/schedule.ts`
- [x] Keep `lib/beta/invite-template.ts`
- [x] Keep `lib/beta/wallet-selection.ts`
- [x] Keep `lib/beta-v2/`
- [x] Keep `lib/wallets/`
- [x] Keep `lib/beta/gate.ts` while shared layout or admin actions still import it

Check:

```powershell
rg -n "/beta/|beta-popout|closedbeta|walletFaq|readCurrentStage|BETA_COOKIE_NAME|components/beta" app components lib
pnpm exec tsc --noEmit
pnpm build
```

## Batch 7

- [x] Delete `app/(site)/cabal/`
- [x] Delete `components/influencer/`
- [x] Delete `lib/cabal/`
- [x] Delete `deck/`

Check:

```powershell
rg -n "/cabal|cabal-|InfluencerDeck|CabalAccess|CabalLaunchBar|deck/" app components lib deck
pnpm exec tsc --noEmit
pnpm build
```

## Batch 8

- [x] Delete `app/(site)/roadmap/`
- [x] Delete `lib/roadmap.ts`
- [x] Delete `lib/roadmap-status.ts`
- [x] Delete `app/(site)/brandkit/`
- [x] Delete `app/(site)/gallery/`
- [x] Delete `components/gallery/`
- [x] Delete `app/(site)/namepost/`
- [x] Delete `public/namepost/`
- [x] Delete `app/(site)/indexers/`
- [x] Remove dead header menu links for deleted public routes
- [x] Keep `public/brandkit/`

Check:

```powershell
rg -n "/roadmap|/brandkit|/gallery|/namepost|/indexers|roadmap-status|lib/roadmap" app components lib public
pnpm exec tsc --noEmit
pnpm build
```

## Batch 9

- [x] Delete `components/Header.tsx`
- [x] Delete `components/HeaderMenu.tsx`
- [x] Delete `components/Footer.tsx`
- [x] Delete `components/PwaShellClient.tsx`
- [x] Delete `components/NetworkToggle.tsx`
- [x] Delete `components/ThemeToggle.tsx`
- [x] Delete `components/ShareDropdown.tsx`
- [x] Delete `components/SurveyForm.tsx`
- [x] Delete `components/purchases/PurchaseResumeShell.tsx`
- [x] Remove any now-dead imports from `app/(site)/layout.tsx` if that layout still exists temporarily

Check:

```powershell
rg -n "HeaderMenu|Header|Footer|PwaShellClient|NetworkToggle|ThemeToggle|ShareDropdown|SurveyForm" app components lib
pnpm exec tsc --noEmit
pnpm build
```

## Batch 10

- [x] Delete `app/(site)/unsubscribe/`
- [x] Confirm all retained email links now point to `dotzcash_main` canonical unsubscribe URLs
- [x] Confirm internal preview pages no longer require this repo to host `/unsubscribe`

Check:

```powershell
rg -n "/unsubscribe|unsubscribe-token|subscriber-confirm-token|listSubscriberPreferences|applySubscriberPreferences" app components lib
pnpm exec tsc --noEmit
pnpm build
```

## Batch 11

- [x] Delete `lib/referrals.ts`
- [x] Delete `lib/referral-code.ts`
- [x] Keep `lib/beta/gate.ts` because retained admin/layout code still imports it
- [x] Delete `components/wallets/WalletFeatureMatrix.tsx`
- [x] Delete `components/ThemeToggle.tsx` if still present
- [x] Delete `components/hooks/useWaitlistVerification.ts`
- [x] Delete `components/hooks/useUsdPrice.ts`
- [x] Delete `components/hooks/useSearchState.ts`
- [x] Delete `components/hooks/usePwaInstall.ts`
- [x] Delete `components/hooks/usePurchaseResume.ts`
- [x] Delete `components/hooks/usePointerProximity.ts`
- [x] Keep `lib/referral-code-core.ts`
- [x] Keep `lib/seo/`
- [x] Keep `components/wallets/WalletBrandLogo.tsx`
- [x] Keep `components/hooks/usePoll.ts`
- [x] Keep `components/hooks/useLocalStorage.ts`
- [x] Keep `components/hooks/useCopy.ts`
- [x] Keep `components/hooks/useChecklistProgress.ts`
- [x] Keep `lib/types.ts`
- [x] Keep `scripts/`

Check:

```powershell
rg -n "referrals|referral-code|beta/gate|WalletFeatureMatrix|useWaitlistVerification|useUsdPrice|useSearchState|usePwaInstall|usePurchaseResume|usePointerProximity" app components lib scripts
pnpm exec tsc --noEmit
pnpm build
```

## Batch 12

- [x] Simplify `middleware.ts` to only what admin/internal still need, or delete it
- [x] Simplify `next.config.ts` to remove all dead redirects/rewrites
- [x] Review `package.json` and remove unused dependencies
- [x] Review `playwright.config.ts` and keep only if you still want admin/internal smoke tests
- [x] Review `README.md` and `INTERNAL_TOOLS.md` so they match the new repo purpose

Check:

```powershell
rg -n "redirect\\(|rewrite\\(|waitlist|docs\\.|leaders|sharekit|explorer|community|roadmap|brandkit\\?|beta/apply|unsubscribe" next.config.ts middleware.ts app components lib
pnpm exec tsc --noEmit
pnpm build
```

## Final kept core

- [x] `app/admin/`
- [x] `app/(site)/internal/` or its replacement internal route group
- [x] moved internal `quotepost`
- [x] `app/og/`
- [x] `components/admin/`
- [x] `components/emails/`
- [x] `components/SiteRouteTitle.tsx`
- [x] `components/ZcashNamesLogoMark.tsx`
- [x] selected generic hooks/utilities still in use
- [x] `lib/admin/`
- [x] `lib/campaigns/`
- [x] `lib/email/`
- [x] `lib/email-preview/`
- [x] `lib/db.ts`
- [x] `lib/hmac.ts`
- [x] `lib/site-url.ts`
- [x] retained beta admin libs
- [x] `lib/wallets/`
- [x] `lib/seo/` if `app/og/` still needs it
- [x] `public/banner-preview-assets/`
- [x] `public/brandkit/`
- [x] `sql/`
- [x] `INTERNAL_TOOLS.md`
- [x] `README.md`
