import React from 'react';
import clsx from 'clsx';
import type { PitchScore } from '@/types';

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
}

const getScoreColor = (score: number): { bar: string; text: string; bg: string } => {
  if (score <= 3) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/20',
    };
  }
  if (score <= 6) {
    return {
      bar: 'bg-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    };
  }
  return {
    bar: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/20',
  };
};

const ScoreBar: React.FC<ScoreBarProps> = ({ label, score, maxScore = 10 }) => {
  const safeScore = Number.isFinite(score) ? score : 0;
  const percentage = (safeScore / maxScore) * 100;
  const colors = getScoreColor(safeScore);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
        <span
          className={clsx(
            'text-xs font-bold px-1.5 py-0.5 rounded',
            colors.bg,
            colors.text
          )}
        >
          {safeScore.toFixed(1)}/{maxScore}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500 ease-out', colors.bar)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

interface ScoreDisplayProps {
  scores: PitchScore;
  compact?: boolean;
  className?: string;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  scores,
  compact = false,
  className,
}) => {
  const safeOverall = Number.isFinite(scores.overall_score) ? scores.overall_score : 0;
  const overallColor = getScoreColor(safeOverall);

  if (compact) {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <div
          className={clsx(
            'flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold',
            overallColor.bg,
            overallColor.text
          )}
        >
          {safeOverall.toFixed(1)}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-900 dark:text-white">
            Overall Score
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            out of 10
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Overall Score */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div
          className={clsx(
            'flex items-center justify-center w-14 h-14 rounded-xl text-xl font-bold',
            overallColor.bg,
            overallColor.text
          )}
        >
          {safeOverall.toFixed(1)}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Overall Score
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Composite rating out of 10
          </p>
        </div>
      </div>

      {/* Individual Scores */}
      <div className="space-y-3">
        <ScoreBar label="Persuasiveness" score={scores.persuasiveness} />
        <ScoreBar label="Clarity" score={scores.clarity} />
        <ScoreBar label="Relevance" score={scores.relevance} />
        <ScoreBar label="Personalization" score={scores.personalization} />
        <ScoreBar label="Call to Action" score={scores.call_to_action} />
      </div>

      {/* Feedback */}
      {scores.feedback && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            AI Feedback
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {scores.feedback}
          </p>
        </div>
      )}

      {/* Suggestions */}
      {scores.suggestions && scores.suggestions.length > 0 && (
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Suggestions for Improvement
          </p>
          <ul className="space-y-1.5">
            {scores.suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400"
              >
                <span className="w-1 h-1 mt-1.5 rounded-full bg-pitch-blue-500 flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay;
