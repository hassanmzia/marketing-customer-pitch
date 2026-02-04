import React from 'react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'w-5 h-5 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  label,
}) => {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={clsx(
          'rounded-full border-gray-200 dark:border-gray-700 border-t-pitch-blue-500 animate-spin',
          sizeMap[size]
        )}
      />
      {label && (
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          {label}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
