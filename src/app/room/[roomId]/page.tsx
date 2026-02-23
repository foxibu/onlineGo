'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Color } from '@/lib/go/types';
import { joinRoom } from '@/lib/supabase/rooms';
import { useGame } from '@/hooks/useGame';
import { usePushNotification } from '@/hooks/usePushNotification';
import GoBoard from '@/components/board/GoBoard';
import GamePanel from '@/components/game/GamePanel';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import Chat from '@/components/game/Chat';

function RoomContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;

  const [myColor, setMyColor] = useState<Color | null>(null);
  const [nickname, setNickname] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [needNickname, setNeedNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  // Prevent joinRoom from being called twice (React Strict Mode double-effect)
  const joinCalledRef = useRef(false);

  // Initialize from URL params
  useEffect(() => {
    const color = searchParams.get('color') as Color | null;
    const nameFromUrl = searchParams.get('nickname') || '';
    const action = searchParams.get('action');

    // Try URL → localStorage
    const savedNickname =
      nameFromUrl || (typeof window !== 'undefined' ? localStorage.getItem('go_nickname') || '' : '');

    setNickname(savedNickname);

    if (color) {
      setMyColor(color);
      setIsCreator(true);
    } else if (action === 'join') {
      if (savedNickname) {
        if (joinCalledRef.current) return; // already joining — skip second Strict Mode call
        joinCalledRef.current = true;
        setJoining(true);
        joinRoom(roomId, savedNickname)
          .then(({ myColor }) => {
            setMyColor(myColor);
          })
          .catch(e => {
            setJoinError(e.message);
          })
          .finally(() => setJoining(false));
      } else {
        // No nickname → ask for one
        setNeedNickname(true);
      }
    }
  }, [roomId, searchParams]);

  const handleNicknameJoin = () => {
    const name = nicknameInput.trim();
    if (!name) return;

    // Save to localStorage
    localStorage.setItem('go_nickname', name);
    setNickname(name);
    setNeedNickname(false);
    setJoining(true);

    joinRoom(roomId, name)
      .then(({ myColor }) => {
        setMyColor(myColor);
      })
      .catch(e => {
        setJoinError(e.message);
      })
      .finally(() => setJoining(false));
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/room/${roomId}?action=join`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const {
    room,
    gameState,
    isMyTurn,
    isScoring,
    isFinished,
    lastMove,
    blackTimer,
    whiteTimer,
    scoring,
    undoRequest,
    toast,
    roomLoading,
    roomError,
    handlePlace,
    handlePass,
    handleResign,
    handleUndo,
    handleUndoResponse,
    handleDeadStoneToggle,
    handleConfirmScore,
    clearToast,
    isSubmitting,
    showTerritory,
    estimatedTerritory,
    territoryEstimate,
    katagoResult,
    isAnalyzing,
    handleToggleTerritory,
    scoringRequestedBy,
    handleRequestScoring,
    handleAcceptScoring,
    handleRejectScoring,
  } = useGame({ roomId, myColor, nickname });

  usePushNotification({ roomId, myColor });

  // Show undo request modal to opponent
  const showUndoModal =
    undoRequest &&
    undoRequest.status === 'pending' &&
    undoRequest.requested_by !== myColor;

  // Nickname input screen (join link with no saved nickname)
  if (needNickname) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h2 className="text-xl font-bold text-stone-900">방에 입장하기</h2>
          <p className="text-stone-500 text-sm">닉네임을 입력하세요</p>
          <input
            type="text"
            value={nicknameInput}
            onChange={e => setNicknameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNicknameJoin()}
            placeholder="닉네임"
            maxLength={20}
            autoFocus
            className="w-full border border-stone-300 rounded-lg px-4 py-3 text-center text-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-800"
          />
          <Button onClick={handleNicknameJoin} disabled={!nicknameInput.trim()} className="w-full">
            입장
          </Button>
          <Link href="/" className="block text-stone-400 text-sm hover:underline">
            로비로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (roomLoading || joining) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-stone-500">
          {joining ? '방에 입장 중...' : '불러오는 중...'}
        </div>
      </main>
    );
  }

  if (roomError || joinError) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <div className="text-red-600 font-medium">{roomError || joinError}</div>
          <Link href="/" className="text-stone-500 text-sm hover:underline">
            로비로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (!room) return null;

  // Waiting for opponent — only show this screen to the creator
  if (room.status === 'waiting' && isCreator) {
    const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/room/${roomId}?action=join`;
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 w-full max-w-sm">
          <h2 className="text-xl font-bold text-stone-900">상대방을 기다리는 중...</h2>
          <p className="text-stone-500 text-sm">아래 링크를 상대방에게 공유하세요</p>
          <div
            className="bg-white border border-stone-200 rounded-lg p-3 text-sm text-stone-700 break-all cursor-pointer hover:bg-stone-50"
            onClick={handleCopyLink}
          >
            {joinUrl}
          </div>
          <button
            onClick={handleCopyLink}
            className={`text-sm font-medium transition-colors ${
              copied ? 'text-green-600' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {copied ? '✓ 복사됨!' : '링크 복사'}
          </button>
        </div>
      </main>
    );
  }

  const blackName = room.blackPlayer?.nickname || '흑';
  const whiteName = room.whitePlayer?.nickname || '백';

  return (
    <main className="h-screen flex flex-col lg:flex-row items-center justify-center gap-4 p-2 lg:p-4 overflow-hidden">
      {/* Mobile: top timer */}
      <div className="w-full max-w-lg lg:hidden">
        <GamePanel
          gameState={gameState}
          roomStatus={room.status}
          myColor={myColor}
          blackTimer={blackTimer}
          whiteTimer={whiteTimer}
          blackName={blackName}
          whiteName={whiteName}
          komi={room.komi}
          scoring={scoring}
          undoPending={!!undoRequest && undoRequest.requested_by === myColor}
          isSubmitting={isSubmitting}
          showTerritory={showTerritory}
          territoryEstimate={territoryEstimate}
          katagoResult={katagoResult}
          isAnalyzing={isAnalyzing}
          onPass={handlePass}
          onResign={handleResign}
          onUndo={handleUndo}
          onConfirmScore={handleConfirmScore}
          onRequestScoring={handleRequestScoring}
          onToggleTerritory={handleToggleTerritory}
        />
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center w-full max-w-lg lg:max-w-2xl">
        <GoBoard
          board={gameState.board}
          currentPlayer={gameState.currentPlayer}
          lastMove={lastMove}
          deadStones={scoring?.deadStones}
          territoryBlack={isScoring ? scoring?.territory.black : (estimatedTerritory?.black ?? [])}
          territoryWhite={isScoring ? scoring?.territory.white : (estimatedTerritory?.white ?? [])}
          isMyTurn={isMyTurn}
          isScoring={isScoring}
          showTerritory={showTerritory}
          isSubmitting={isSubmitting}
          ownership={katagoResult?.ownership ?? null}
          isAnalyzing={isAnalyzing}
          onPlace={handlePlace}
          onDeadStoneToggle={handleDeadStoneToggle}
        />
      </div>

      {/* Desktop: side panel */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:gap-3">
        <GamePanel
          gameState={gameState}
          roomStatus={room.status}
          myColor={myColor}
          blackTimer={blackTimer}
          whiteTimer={whiteTimer}
          blackName={blackName}
          whiteName={whiteName}
          komi={room.komi}
          scoring={scoring}
          undoPending={!!undoRequest && undoRequest.requested_by === myColor}
          isSubmitting={isSubmitting}
          showTerritory={showTerritory}
          territoryEstimate={territoryEstimate}
          katagoResult={katagoResult}
          isAnalyzing={isAnalyzing}
          onPass={handlePass}
          onResign={handleResign}
          onUndo={handleUndo}
          onConfirmScore={handleConfirmScore}
          onRequestScoring={handleRequestScoring}
          onToggleTerritory={handleToggleTerritory}
        />
        <Chat roomId={roomId} nickname={nickname} />
      </div>

      {/* Mobile chat button */}
      <div className="lg:hidden">
        <Chat roomId={roomId} nickname={nickname} />
      </div>

      {/* Undo request modal */}
      <Modal
        open={!!showUndoModal}
        onClose={() => handleUndoResponse(false)}
        title="무르기 요청"
        actions={
          <>
            <Button variant="ghost" onClick={() => handleUndoResponse(false)}>
              거절
            </Button>
            <Button onClick={() => handleUndoResponse(true)}>수락</Button>
          </>
        }
      >
        <p>상대방이 마지막 수를 되돌리길 요청했습니다.</p>
      </Modal>

      {/* Scoring request modal (shown to the opponent) */}
      <Modal
        open={!!(scoringRequestedBy && scoringRequestedBy !== myColor)}
        onClose={handleRejectScoring}
        title="계가 신청"
        actions={
          <>
            <Button variant="ghost" onClick={handleRejectScoring}>
              거절
            </Button>
            <Button onClick={handleAcceptScoring}>수락</Button>
          </>
        }
      >
        <p>상대방이 계가(집 세기)를 요청했습니다. 수락하시겠습니까?</p>
      </Modal>

      {/* Game result modal */}
      {isFinished && gameState.result && (
        <Modal
          open={true}
          onClose={() => {}}
          title="대국 종료"
          actions={
            <Link href="/">
              <Button>로비로 돌아가기</Button>
            </Link>
          }
        >
          <p className="text-2xl font-bold text-center">{gameState.result}</p>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
    </main>
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-stone-500">불러오는 중...</div>
        </main>
      }
    >
      <RoomContent />
    </Suspense>
  );
}
