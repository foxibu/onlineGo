'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface GameControlsProps {
  isMyTurn: boolean;
  isScoring: boolean;
  isFinished: boolean;
  isSubmitting: boolean;
  myColor: string | null;
  showTerritory: boolean;
  myScoreConfirmed?: boolean;
  onPass: () => void;
  onResign: () => void;
  onUndo: () => void;
  onConfirmScore: () => void;
  onRequestScoring: () => void;
  onToggleTerritory: () => void;
  onCancelScoring: () => void;
  undoPending: boolean;
}

export default function GameControls({
  isMyTurn,
  isScoring,
  isFinished,
  isSubmitting,
  showTerritory,
  myScoreConfirmed = false,
  onPass,
  onResign,
  onUndo,
  onConfirmScore,
  onRequestScoring,
  onToggleTerritory,
  onCancelScoring,
  undoPending,
}: GameControlsProps) {
  const [showResignModal, setShowResignModal] = useState(false);
  const [showScoringModal, setShowScoringModal] = useState(false);

  if (isFinished) return null;

  if (isScoring) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="primary" onClick={onConfirmScore} disabled={myScoreConfirmed} className="w-full">
          {myScoreConfirmed ? '✓ 확인 완료 — 상대 대기 중' : '계가 확인'}
        </Button>
        <Button variant="ghost" onClick={onCancelScoring} className="w-full text-xs">
          계속 두기
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={onPass}
          disabled={!isMyTurn || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? '···' : '패스'}
        </Button>
        <Button
          variant="ghost"
          onClick={onUndo}
          disabled={undoPending || isSubmitting}
          className="flex-1"
        >
          {undoPending ? '대기 중' : '무르기'}
        </Button>
        <Button
          variant="danger"
          onClick={() => setShowResignModal(true)}
          disabled={isSubmitting}
          className="flex-1"
        >
          기권
        </Button>
      </div>

      <div className="flex gap-2">
        {/* Territory toggle — amber tint when active */}
        <button
          onClick={onToggleTerritory}
          className={`
            flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
            ${showTerritory
              ? 'bg-go-gold/15 text-go-gold border border-go-gold/30'
              : 'bg-transparent text-go-t3 border border-white/7 hover:bg-go-s1 hover:text-go-t2'}
          `}
        >
          형세판단
        </button>
        <button
          onClick={() => setShowScoringModal(true)}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-go-t3 border border-white/7 hover:bg-go-s1 hover:text-go-t2 transition-all duration-150"
        >
          계가 신청
        </button>
      </div>

      <Modal
        open={showResignModal}
        onClose={() => setShowResignModal(false)}
        title="기권하시겠습니까?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowResignModal(false)}>취소</Button>
            <Button variant="danger" onClick={() => { setShowResignModal(false); onResign(); }}>기권</Button>
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
            <Button variant="ghost" onClick={() => setShowScoringModal(false)}>취소</Button>
            <Button onClick={() => { setShowScoringModal(false); onRequestScoring(); }}>신청</Button>
          </>
        }
      >
        <p>상대방에게 계가(집 세기)를 요청합니다. 상대방이 수락하면 계가 단계로 이동합니다.</p>
      </Modal>
    </>
  );
}
