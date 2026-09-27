export function PageLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={
        fullScreen
          ? "flex min-h-screen w-full items-center justify-center bg-background"
          : "flex min-h-[60vh] w-full items-center justify-center"
      }
    >
      <div className="dots-loader" role="status" aria-label="Memuat...">
        <span className="sr-only">Memuat...</span>
      </div>
    </div>
  );
}
