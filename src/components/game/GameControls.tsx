'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

interface GameControlsProps {
  isMyTurn: boolean;
  isScoring: boolean;
  isFinished: boolean;
  onPass: () => void;
  onResign: () => void;
  onUndo: () => void;
  onConfirmScore: () => void;
  undoPending: boolean;
}

export default function GameControls({
  isMyTurn,
  isScoring,
  isFinished,
  onPass,
  onResign,
  onUndo,
  onConfirmScore,
  undoPending,
}: GameControlsProps) {
  const [showResignModal, setShowResignModal] = useState(false);

  if (isFinished) return null;

  if (isScoring) {
    return (
      <div className="flex gap-2">
        <Button variant="primary" onClick={onConfirmScore} className="flex-1">
          Confirm Score
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
          disabled={!isMyTurn}
          className="flex-1"
        >
          Pass
        </Button>
        <Button
          variant="ghost"
          onClick={onUndo}
          disabled={undoPending}
          className="flex-1"
        >
          {undoPending ? 'Waiting...' : 'Undo'}
        </Button>
        <Button
          variant="danger"
          onClick={() => setShowResignModal(true)}
          className="flex-1"
        >
          Resign
        </Button>
      </div>

      <Modal
        open={showResignModal}
        onClose={() => setShowResignModal(false)}
        title="Resign?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setShowResignModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowResignModal(false);
                onResign();
              }}
            >
              Resign
            </Button>
          </>
        }
      >
        <p>Are you sure you want to resign this game?</p>
      </Modal>
    </>
  );
}
