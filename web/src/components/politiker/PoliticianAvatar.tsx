import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Politician } from "@/types";

interface PoliticianAvatarProps {
  politician: Pick<Politician, "firstName" | "lastName" | "imageUrl">;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function PoliticianAvatar({
  politician,
  size = "default",
  className,
}: PoliticianAvatarProps) {
  const initials = `${politician.firstName[0]}${politician.lastName[0]}`;

  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={politician.imageUrl} alt={`${politician.firstName} ${politician.lastName}`} />
      <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
    </Avatar>
  );
}
