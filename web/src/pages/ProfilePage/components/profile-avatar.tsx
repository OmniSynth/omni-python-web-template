import { avatarHue, avatarLabel } from "@/lib/avatar";

export function ProfileAvatar({
  displayName,
  username,
  avatarUrl,
}: {
  displayName: string;
  username: string;
  avatarUrl: string;
}) {
  const label = avatarLabel(displayName, username);
  const hue = avatarHue(displayName || username || "user");
  if (avatarUrl.trim()) {
    return <img src={avatarUrl.trim()} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-border" />;
  }
  return (
    <div
      className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-medium text-white ring-2 ring-border"
      style={{ backgroundColor: `hsl(${hue} 45% 42%)` }}
    >
      {label}
    </div>
  );
}
