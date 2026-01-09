import { useActivePlayer } from "../../state/ActivePlayerContext";
import "./ActivePlayerBadge.css";

export default function ActivePlayerBadge() {
  const { player } = useActivePlayer();

  if (!player) {
    return null;
  }

  return (
    <div className="active-player">
      <span className="active-player__label">Active player</span>
      <span className="active-player__name">{player.matchedMemberName}</span>
      <span className="active-player__tag">{player.playerTag}</span>
    </div>
  );
}
