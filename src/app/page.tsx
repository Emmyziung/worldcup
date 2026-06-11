import Image from "next/image";
import Link from "next/link";
import { Anton } from "next/font/google";

import { ThemeToggle } from "@/components/shared/theme-toggle";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

type FloatProps = {
  src: string;
  alt: string;
  className: string;
  rotate: string;
};

function FloatingPhoto({ src, alt, className, rotate }: FloatProps) {
  return (
    <div
      className={`pointer-events-none absolute hidden overflow-hidden rounded-2xl border border-border bg-card shadow-(--photo-shadow) ring-1 ring-border lg:block ${className}`}
      style={{ transform: rotate }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 18rem, 0px"
        className="object-cover"
      />
    </div>
  );
}

export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-background text-foreground transition-colors duration-300">
      <ThemeToggle />

      <FloatingPhoto
        src="/assets/trophy.jpg"
        alt="The FIFA World Cup trophy"
        className="left-[4%] top-[12%] z-20 h-56 w-44"
        rotate="rotate(-8deg)"
      />
       <FloatingPhoto
        src="/assets/action.jpg"
        alt="World Cup match action"
        className="right-[4%] top-[10%] h-52 w-64"
        rotate="rotate(7deg)"
      />
      <FloatingPhoto
        src="/assets/messi.jpg"
        alt="Lionel Messi at the World Cup"
        className="bottom-[10%] left-[7%] z-20 h-60 w-48"
        rotate="rotate(6deg)"
      />
      {/* <FloatingPhoto
        src="/assets/stadium.jpg"
        alt="USA World Cup host stadium"
        className="left-[2%] top-[42%] z-10 h-40 w-52"
        rotate="rotate(3deg)"
      /> */}
      <FloatingPhoto
        src="/assets/messi2.jpg"
        alt="Argentina celebrate at the World Cup"
        className="bottom-[12%] right-[6%] h-60 w-48"
        rotate="rotate(-7deg)"
      />
   

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden lg:hidden">
        <Image
          src="/assets/image_Pippit_202606101419 (2).png"
          alt="World Cup players"
          width={2000}
          height={857}
          priority
          sizes="100vw"
          className="absolute bottom-0 left-1/2 h-40 w-auto max-w-none -translate-x-1/2 object-contain"
        />
      </div>

      <section className="relative z-10 mx-auto flex h-full w-full max-w-[70rem] flex-col items-center justify-center px-5 pb-36 text-center sm:px-6 lg:pb-0">
        <p
          aria-label="World Cup 2026 USA"
          className="mb-6 max-w-[calc(100vw-2rem)] overflow-hidden whitespace-nowrap rounded-full border-2 border-(--hero-pill-border) bg-(--hero-pill-background) px-4 py-1.5 text-[clamp(0.58rem,1.95vw,0.82rem)] font-extrabold text-foreground shadow-(--hero-pill-highlight) sm:mb-7 sm:px-8 sm:text-[clamp(0.72rem,1.15vw,0.92rem)] lg:mb-8"
        >
          W O R L D&nbsp;&nbsp; C U P&nbsp;&nbsp; 2 0 2 6&nbsp; ·&nbsp; U S A
        </p>

        <h1 className={`${anton.className} text-[clamp(2.6rem,9.8vw,3.8rem)] font-black uppercase leading-[0.92] tracking-tight sm:text-[clamp(3.45rem,7.6vw,5rem)] md:text-[clamp(4.15rem,6.8vw,5.9rem)] lg:text-[clamp(4.75rem,5.8vw,6.75rem)]`}>
          <span className="block whitespace-nowrap">Your World Cup</span>
          <span className="mt-2 block text-mauve sm:mt-3 ">
            Your Story
          </span>
        </h1>

        <p className="mt-7 text-[clamp(0.92rem,2.85vw,1.2rem)] font-medium text-muted-foreground sm:mt-9 sm:text-[clamp(1.05rem,1.85vw,1.45rem)] lg:text-[clamp(1.12rem,1.35vw,1.6rem)]">
          Make your picks and share with the world.
        </p>

        <div className="relative mt-8 sm:mt-11 lg:mt-12">
          <Link
            href="/picks"
            className="relative z-10 inline-flex h-15 min-w-[min(17.5rem,calc(100vw-4rem))] items-center justify-center overflow-hidden rounded-full bg-(--button-surface) px-7 text-[clamp(0.95rem,3.4vw,1.15rem)] font-extrabold text-mauve-foreground transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mauve/45 sm:h-18 sm:min-w-[16.5rem] sm:text-lg lg:h-18 lg:min-w-72 lg:text-xl"
          >
            <span className="relative">Make your picks</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
