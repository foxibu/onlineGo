// src/components/game/MobileGameBar.tsx
'use client';

import { useState } from 'react';
import { TimerState, Color, ScoringState, TerritoryEstimate, KatagoResult } from '@/lib/go/types';
import { formatTime } from '@/lib/timer/timerLogic';
import ScoringOverlay from './ScoringOverlay';
import TerritoryPanel from './TerritoryPanel';
import Chat from './Chat';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface MobileGameBarProps {
  myTimer: TimerState;
  myColor: Color | null;
  myName: string;
  isMyTurn: boolean;
  isScoring: boolean;
  isFinished: boolean;
  isSubmitting: boolean;
  moveCount: number;
  gameResult: string | null;
  showTerritory: boolean;
  territoryEstimate: TerritoryEstimate | null;
  katagoResult: KatagoResult | null;
  isAnalyzing: boolean;
  komi: number;
  scoring: ScoringState | null;
  myScoreConfirmed: boolean;
  undoPending: boolean;
  roomId: string;
  nickname: string;
  onPass: () => void;
  onResign: () => void;
  onUndo: () => void;
  onConfirmScore: () => void;
  onRequestScoring: () => void;
  onToggleTerritory: () => void;
  onCancelScoring: () => void;
}

export default function MobileGameBar({
  myTimer,
  myColor,
  myName,
  isMyTurn,
  isScoring,
  isFinished,
  isSubmitting,
  moveCount,
  gameResult,
  showTerritory,
  territoryEstimate,
  katagoResult,
  isAnalyzing,
  komi,
  scoring,
  myScoreConfirmed,
  undoPending,
  roomId,
  nickname,
  onPass,
  onResign,
  onUndo,
  onConfirmScore,
  onRequestScoring,
  onToggleTerritory,
  onCancelScoring,
}: MobileGameBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [showScoringModal, setShowScoringModal] = useState(false);

  const isLowTime = myTimer.isInByoyomi || myTimer.mainTimeRemaining < 60;

  if (isFinished) return null;

  return (
    <>
      {/* ── 하단 고정 바 ──────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-go-s1 border-t border-white/7 flex-shrink-0">
        {/* 내 타이머 */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={`w-3 h-3 rounded-full flex-shrink-0 ${
              myColor === 'black'
                ? 'bg-[#1a1a1a] border border-white/20'
                : 'bg-[#f0ebe0] border border-white/40'
            }`}
          />
          <span className={`text-sm font-medium truncate transition-colors flex-1 min-w-0 ${isMyTurn ? 'text-go-t1' : 'text-go-t2'}`}>
            {myName}
          </span>
          <span
            className={`font-mono font-bold text-base tabular-nums transition-colors flex-shrink-0 ${
              isLowTime ? 'text-go-red' : isMyTurn ? 'text-go-gold' : 'text-go-t3'
            }`}
          >
            {formatTime(myTimer)}
          </span>
          {isMyTurn && !isScoring && (
            <span className="text-[10px] text-go-gold bg-go-gold/10 border border-go-gold/25 px-1.5 py-0.5 rounded-full flex-shrink-0">
              내 차례
            </span>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 flex-shrink-0">
          {isScoring ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={onConfirmScore}
                disabled={myScoreConfirmed}
              >
                {myScoreConfirmed ? '✓ 대기 중' : '계가 확인'}
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelScoring}>
                계속
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={onPass}
                disabled={!isMyTurn || isSubmitting}
              >
                {isSubmitting ? '···' : '패스'}
              </Button>
              <button
                onClick={() => setDrawerOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-go-s2 text-go-t2 border border-white/10 hover:bg-go-s3 hover:text-go-t1 transition-all"
                aria-label="더보기"
              >
                ⋯
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 드로어 오버레이 ───────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── 드로어 ───────────────────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-go-s0 rounded-t-2xl border-t border-white/10 transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-go-s3" />
        </div>

        <div className="px-4 pb-8 space-y-3 max-h-[72vh] overflow-y-auto">
          {/* 수 카운트 */}
          <div className="text-xs text-go-t3 text-center font-mono pt-1">
            {moveCount}수
            {gameResult && (
              <span className="ml-2 text-go-t1 font-semibold">{gameResult}</span>
            )}
          </div>

          {/* 계가 오버레이 */}
          {isScoring && scoring && (
            <ScoringOverlay
              scoring={scoring}
              komi={komi}
              blackConfirmed={scoring.blackConfirmed}
              whiteConfirmed={scoring.whiteConfirmed}
              myColor={myColor}
            />
          )}

          {/* 형세판단 패널 */}
          {showTerritory && territoryEstimate && !isScoring && (
            <TerritoryPanel
              moveCount={moveCount}
              territoryEstimate={territoryEstimate}
              katagoResult={katagoResult}
              isAnalyzing={isAnalyzing}
            />
          )}

          {/* 컨트롤 그리드 */}
          {!isScoring && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                onClick={onUndo}
                disabled={undoPending || isSubmitting}
                className="w-full"
              >
                {undoPending ? '대기 중' : '무르기'}
              </Button>
              <button
                onClick={onToggleTerritory}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  showTerritory
                    ? 'bg-go-gold/15 text-go-gold border border-go-gold/30'
                    : 'bg-transparent text-go-t3 border border-white/7 hover:bg-go-s1 hover:text-go-t2'
                }`}
              >
                형세판단
              </button>
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  setShowScoringModal(true);
                }}
                className="px-3 py-2 rounded-lg text-sm font-medium text-go-t3 border border-white/7 hover:bg-go-s1 hover:text-go-t2 transition-all duration-150"
              >
                계가 신청
              </button>
              <Button
                variant="danger"
                onClick={() => {
                  setDrawerOpen(false);
                  setShowResignModal(true);
                }}
                className="w-full"
              >
                기권
              </Button>
            </div>
          )}

          {/* 채팅 */}
          <Chat roomId={roomId} nickname={nickname} hideToggle />
        </div>
      </div>

      {/* ── 모달 ─────────────────────────────────────── */}
      <Modal
        open={showResignModal}
        onClose={() => setShowResignModal(false)}
        title="기권하시겠습니까?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowResignModal(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowResignModal(false);
                onResign();
              }}
            >
              기권
            </Button>
          </>
        }
      >
        <p>정말로 이 대국을 기권하시겠습니까?</p>
      </Modal>

      <Modal
        open={showScoringModal}
        onClose={() => setShowScoringModal(false)}
        title="계가 신청"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowScoringModal(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                setShowScoringModal(false);
                onRequestScoring();
              }}
            >
              신청
            </Button>
          </>
        }
      >
        <p>상대방에게 계가(집 세기)를 요청합니다. 상대방이 수락하면 계가 단계로 이동합니다.</p>
      </Modal>
    </>
  );
}
