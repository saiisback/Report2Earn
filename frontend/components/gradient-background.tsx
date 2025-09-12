export function GradientBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      <video
        src="/bgg2.mp4" 
        className="w-full h-full object-cover pointer-events-none"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
    </div>
  );
}
