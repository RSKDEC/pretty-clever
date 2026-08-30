import { GameClient } from "@/components/GameClient";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <GameClient initialCode={code.toUpperCase()} />;
}
