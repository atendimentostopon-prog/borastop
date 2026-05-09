export function getAvatarColor(nickname: string): string {
  const colors = ["bg-rose-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500"];
  const sum = nickname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[sum % colors.length];
}

export function getAvatarInitial(nickname: string): string {
  if (!nickname) return '?';
  return nickname.charAt(0).toUpperCase();
}
