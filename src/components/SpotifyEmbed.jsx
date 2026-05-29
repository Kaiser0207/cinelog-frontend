export default function SpotifyEmbed({ trackId }) {
  if (!trackId) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-border-subtle">
      <iframe
        src={`https://open.spotify.com/embed/track/${trackId}?theme=0`}
        width="100%"
        height="80"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ borderRadius: '12px' }}
        title="Spotify Player"
      />
    </div>
  );
}
