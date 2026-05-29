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
import Timer from '@/components/game/Timer';
import MobileGameBar from '@/components/game/MobileGameBar';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import Chat from '@/components/game/Chat';
import Spinner from '@/components/ui/Spinner';

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
    handleCancelScoring,
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
      <main className="min-h-screen bg-go-bg flex items-center justify-center p-4">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-go-t1">방에 입장하기</h2>
            <p className="text-go-t3 text-sm">닉네임을 입력하세요</p>
          </div>
          <input
            type="text"
            value={nicknameInput}
            onChange={e => setNicknameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNicknameJoin()}
            placeholder="닉네임"
            maxLength={20}
            autoFocus
            className="go-input w-full px-4 py-3 text-center text-base"
          />
          <Button onClick={handleNicknameJoin} disabled={!nicknameInput.trim()} className="w-full py-3">
            입장
          </Button>
          <Link href="/" className="block text-go-t3 text-sm hover:text-go-t2 transition-colors">
            로비로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (roomLoading || joining) {
    return (
      <main className="min-h-screen bg-go-bg flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-go-t3 text-sm">
          {joining ? '방에 입장 중···' : '불러오는 중···'}
        </p>
      </main>
    );
  }

  if (roomError || joinError) {
    return (
      <main className="min-h-screen bg-go-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="text-go-red text-sm font-medium">{roomError || joinError}</div>
          <Link href="/" className="text-go-t3 text-sm hover:text-go-t2 transition-colors">
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
    const shortUrl = `${typeof window !== 'undefined' ? window.location.host : '...'}/room/${roomId}`;

    return (
      <main className="min-h-screen bg-go-bg flex items-center justify-center p-4">
        <div className="text-center space-y-6 w-full max-w-sm">
          {/* 대기 애니메이션 */}
          <div className="space-y-3">
            <div
              className="text-5xl text-go-gold opacity-80 select-none"
              style={{ fontFamily: 'serif' }}
            >
              碁
            </div>
            <h2 className="text-base font-semibold text-go-t1">상대방을 기다리는 중</h2>
            {/* Pulsing dots */}
            <div className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-go-gold/50 animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </div>

          {/* 링크 단축 표시 */}
          <div className="go-card p-3 text-xs text-go-t3 font-mono break-all select-all">
            {shortUrl}
          </div>

          {/* 복사 버튼 */}
          <Button
            variant="secondary"
            onClick={handleCopyLink}
            className="w-full"
          >
            {copied ? '✓ 복사됨!' : '초대 링크 복사'}
          </Button>

          <p className="text-[11px] text-go-t3">링크를 상대방에게 공유하세요</p>
        </div>
      </main>
    );
  }

  const blackName = room.blackPlayer?.nickname || '흑';
  const whiteName = room.whitePlayer?.nickname || '백';
  const topColor: Color = myColor === 'black' ? 'white' : 'black';
  const bottomColor: Color = myColor === 'black' ? 'black' : 'white';

  return (
    <main className="h-screen bg-go-bg overflow-hidden">

      {/* ── 모바일 레이아웃 ──────────────────────────── */}
      <div className="lg:hidden flex flex-col h-full">
        {/* 상대 타이머 (상단) */}
        <div className="flex-shrink-0">
          <Timer
            timer={topColor === 'black' ? blackTimer : whiteTimer}
            isActive={gameState.currentPlayer === topColor && !isScoring && !isFinished}
            playerName={topColor === 'black' ? blackName : whiteName}
            color={topColor}
            captures={gameState.captures[topColor]}
          />
        </div>

        {/* 바둑판 */}
        <div className="flex-1 flex items-center justify-center min-h-0 px-1 py-1">
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

        {/* 하단 바 + 드로어 */}
        <MobileGameBar
          myTimer={bottomColor === 'black' ? blackTimer : whiteTimer}
          myColor={myColor}
          myName={bottomColor === 'black' ? blackName : whiteName}
          isMyTurn={isMyTurn}
          isScoring={isScoring}
          isFinished={isFinished}
          isSubmitting={isSubmitting}
          moveCount={gameState.moveCount}
          gameResult={gameState.result ?? null}
          showTerritory={showTerritory}
          territoryEstimate={territoryEstimate}
          katagoResult={katagoResult}
          isAnalyzing={isAnalyzing}
          komi={room.komi}
          scoring={scoring}
          myScoreConfirmed={
            isScoring && scoring
              ? myColor === 'black' ? scoring.blackConfirmed : scoring.whiteConfirmed
              : false
          }
          undoPending={!!undoRequest && undoRequest.requested_by === myColor}
          roomId={roomId}
          nickname={nickname}
          onPass={handlePass}
          onResign={handleResign}
          onUndo={handleUndo}
          onConfirmScore={handleConfirmScore}
          onRequestScoring={handleRequestScoring}
          onToggleTerritory={handleToggleTerritory}
          onCancelScoring={handleCancelScoring}
        />
      </div>

      {/* ── 데스크탑 레이아웃 ────────────────────────── */}
      <div className="hidden lg:flex h-full items-center justify-center gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex items-center justify-center max-w-2xl min-h-0">
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
        <div className="flex flex-col w-72 gap-3 overflow-y-auto max-h-full">
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
            onCancelScoring={handleCancelScoring}
          />
          <Chat roomId={roomId} nickname={nickname} />
        </div>
      </div>

      {/* ── 모달 / 토스트 (공통) ─────────────────────── */}
      <Modal
        open={!!showUndoModal}
        onClose={() => handleUndoResponse(false)}
        title="무르기 요청"
        actions={
          <>
            <Button variant="ghost" onClick={() => handleUndoResponse(false)}>거절</Button>
            <Button onClick={() => handleUndoResponse(true)}>수락</Button>
          </>
        }
      >
        <p>상대방이 마지막 수를 되돌리길 요청했습니다.</p>
      </Modal>

      <Modal
        open={!!(scoringRequestedBy && scoringRequestedBy !== myColor)}
        onClose={handleRejectScoring}
        title="계가 신청"
        actions={
          <>
            <Button variant="ghost" onClick={handleRejectScoring}>거절</Button>
            <Button onClick={handleAcceptScoring}>수락</Button>
          </>
        }
      >
        <p>상대방이 계가(집 세기)를 요청했습니다. 수락하시겠습니까?</p>
      </Modal>

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
          <p className="text-xl font-semibold text-center text-go-t1 py-2">{gameState.result}</p>
        </Modal>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
    </main>
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-go-bg flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-go-t3 text-sm">불러오는 중···</p>
        </main>
      }
    >
      <RoomContent />
    </Suspense>
  );
}
