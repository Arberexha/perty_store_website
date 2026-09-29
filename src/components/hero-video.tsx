export default function HeroVideo() {
  return <div className="pc-hero-media" aria-hidden="true">
    <video className="pc-hero-video" autoPlay muted loop playsInline preload="metadata" tabIndex={-1}>
      <source src="/videos/screen-printing-hero.mp4" type="video/mp4" media="(prefers-reduced-motion: no-preference)" />
    </video>
  </div>;
}
