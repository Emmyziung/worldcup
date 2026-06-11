# New Next App AI Starter Brief

Use this file as the instruction brief when setting up a fresh, unrelated Next.js project. The goal is to create a ready-to-code app with the same kind of tooling and conventions as the source project, without copying its business logic, API setup, routes, env vars, branding, or deployment details.

## Goal

Set up a modern Next.js App Router project with:

- Next.js 16, React 19, TypeScript
- `src/` directory and `@/*` import alias
- Tailwind CSS
- shadcn/ui using CSS variables and lucide icons
- Urbanist font via `next/font/google`
- Server-first component conventions
- Reusable UI primitives and helper utilities
- Sensible lint/type-check scripts

Do not add project-specific environment variables, backend URLs, payment integrations, maps, product/catalog code, auth flows, deployment files, or business-domain routes unless explicitly requested later.

## Important Next.js Rule

This project uses a newer Next.js version. Before writing Next-specific code, read the relevant local docs after dependencies are installed:

```bash
rg -n "topic to check" node_modules/next/dist/docs
```

For example, read docs before adding metadata routes, image config, server actions, route handlers, proxy, caching, or Next config changes.

## Bootstrap

If starting inside an empty project folder, run:

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --agents-md
```

If creating from the parent directory, run:

```bash
npx create-next-app@latest my-project --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --agents-md
```

Then pin the main framework versions:

```bash
npm install next@16.2.4 react@19.2.4 react-dom@19.2.4
```

Install core UI/dev packages:

```bash
npm install class-variance-authority clsx lucide-react next-themes radix-ui react-hook-form @hookform/resolvers sonner tailwind-merge tailwindcss-animate tw-animate-css embla-carousel-react use-debounce
```

Install or confirm dev packages:

```bash
npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next tailwindcss postcss autoprefixer
```

Only install domain-specific packages when the app actually needs them:

```bash
# Optional examples, do not install by default
npm install axios jwt-decode @mapbox/search-js-react @paystack/inline-js
```

## package.json Scripts

Use these scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit --pretty false"
  }
}
```

## shadcn/ui Setup

Initialize shadcn/ui after Tailwind is present:

```bash
npx shadcn@latest init
```

Use these preferences:

- Style: `radix-nova` if available, otherwise the closest current shadcn default
- TypeScript: yes
- React Server Components: yes
- Tailwind config: `tailwind.config.ts`
- Global CSS: `src/app/globals.css`
- CSS variables: yes
- Base color: neutral
- Icon library: lucide
- Import aliases:
  - components: `@/components`
  - ui: `@/components/ui`
  - utils: `@/lib/utils`
  - lib: `@/lib`
  - hooks: `@/hooks`

Add common primitives early so feature work can start without UI setup friction:

```bash
npx shadcn@latest add button input label textarea select checkbox radio-group dropdown-menu dialog sheet popover tooltip tabs accordion alert-dialog card badge avatar separator skeleton table form scroll-area progress carousel sonner
```

## Base Files

Create `src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Use a typed `next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
```

Do not add `assetPrefix`, API rewrites, image domains, or environment-specific config until the project actually needs them.

## Tailwind Conventions

Keep Tailwind configured with:

- `darkMode: ['class']`
- content paths for `src/app`, `src/components`, and `src/pages`
- CSS-variable color tokens
- `tailwindcss-animate` plugin
- `fontFamily.body` and `fontFamily.headline` using `var(--font-urbanist)`

Use this structure in `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['var(--font-urbanist)', 'sans-serif'],
        headline: ['var(--font-urbanist)', 'sans-serif'],
        display: ['Georgia', 'serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
```

## Global CSS

Keep `src/app/globals.css` small and token-based at the start:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 140 50% 45%;
    --primary-foreground: 140 25% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 210 40% 9.8%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 142 35% 28%;
    --accent-foreground: 142 45% 18%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 140 50% 45%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 140 50% 45%;
    --primary-foreground: 140 25% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 140 50% 45%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
```

## Font Setup

Use `next/font/google` in `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Urbanist } from 'next/font/google';
import './globals.css';

const urbanist = Urbanist({
  subsets: ['latin'],
  variable: '--font-urbanist',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'New App',
    template: '%s | New App',
  },
  description: 'A modern Next.js application.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${urbanist.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

Add `ThemeProvider` and `Toaster` later only when the UI actually uses theme switching or toast messages.

## Project Structure

Start with this structure:

```txt
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
    ui/
    shared/
  hooks/
  lib/
    utils.ts
  types/
```

Use route groups when the app naturally has different layout zones:

```txt
src/app/(marketing)/
src/app/(app)/
```

Do not create route groups before there is a real layout difference.

## Coding Conventions

- Prefer Server Components by default.
- Add `'use client'` only to components that need state, effects, browser APIs, event handlers, or client-only libraries.
- Keep data fetching close to the server page/layout that needs it.
- Use Server Actions or Route Handlers only when there is a clear reason.
- Keep `page.tsx` files mostly orchestration: fetch data, handle redirects/not-found, render composed sections.
- Put reusable UI in `src/components/shared`.
- Put primitive shadcn components in `src/components/ui`.
- Put generic utilities in `src/lib`.
- Use `cn()` for className composition.
- Use `lucide-react` icons in icon buttons and controls.
- Make forms with `react-hook-form` and `@hookform/resolvers` when validation is needed.
- Use `sonner` for toast notifications when the product needs transient feedback.
- Avoid premature global state. Start with props, server data, URL state, and local component state.
- Keep components small enough to scan, but avoid splitting files just to create noise.

## UI Conventions

- Build the real app screen first, not a marketing placeholder, unless the requested product is specifically a landing page.
- Use shadcn primitives for dialogs, sheets, popovers, dropdowns, select menus, tabs, forms, and tables.
- Use buttons with icons for common actions when an icon is obvious.
- Keep cards for repeated items, modals, and framed tools. Do not put cards inside cards.
- Do not use large hero typography inside dense app panels.
- Use stable dimensions for toolbars, grids, boards, counters, and thumbnail strips to prevent layout shifts.
- Make responsive states intentionally, especially mobile width, text wrapping, dialogs, sheets, and tables.
- Avoid one-note palettes. Start neutral, then add one or two brand colors.
- Do not add decorative gradient blobs or generic filler decoration.

## Data And SEO Conventions

When the app needs SEO:

- Use `generateMetadata` for route-specific titles/descriptions.
- Add `src/app/sitemap.ts` and `src/app/robots.ts` only when real routes exist.
- Use accurate `lastModified` values in sitemaps, or omit them until real update dates exist.
- Use canonical URLs when there are multiple paths to similar content.
- Add structured data only for content types that truly match the page.

When the app needs data fetching:

- Create typed service functions in `src/lib/services`.
- Keep request helpers small and explicit.
- Do not introduce backend URLs or auth assumptions during generic setup.
- Add loading, error, and empty states for user-facing async screens.

## Quality Checks

After setup, run:

```bash
npm run lint
npm run typecheck
npm run build
```

Do not start a dev or production server unless explicitly asked.

## Done Means

The setup is complete when:

- The app uses Next.js App Router with `src/`
- TypeScript strict mode is enabled
- Tailwind classes compile
- shadcn/ui components can be added and imported through `@/components/ui`
- `cn()` exists at `@/lib/utils`
- Urbanist is wired through `next/font/google`
- Lint, typecheck, and build scripts exist
- No unrelated business logic, env vars, domains, APIs, payments, maps, auth, or deployment files were added
