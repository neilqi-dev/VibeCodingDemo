/**
 * AnalysisLoadingIndicator Component
 * Shows loading state during audio segmentation analysis
 */

import React from 'react'
import { ClipLoader } from "react-spinners";
import './AnalysisLoadingIndicator.css'

export interface AnalysisLoadingIndicatorProps {
  /** Whether to show the loading indicator */
  visible: boolean
  /** Loading progress percentage (0-100) */
  progress?: number
  /** Loading message text */
  message?: string
  /** Whether analysis is in progress */
  isAnalyzing?: boolean
  /** CSS class name for styling */
  className?: string
}

/**
 * Analysis Loading Indicator Component
 * Shows visual feedback while audio segmentation analysis is running
 */
export const AnalysisLoadingIndicator: React.FC<AnalysisLoadingIndicatorProps> = ({
  visible,
  progress,
  message = 'Analyzing audio segments...',
  isAnalyzing = true,
  className = '',
}) => {
  console.log('AnalysisLoadingIndicator: visible =', visible, 'message =', message)

  if (!visible) return null

  return (
    <div className={`analysis-loading-indicator ${className}`}>
      <div className="loading-content">
        <div className="loading-spinner">
          <ClipLoader size={40} color="#007bff" />
        </div>

        <div className="loading-text">
          <p className="loading-message">{message}</p>

          {progress !== undefined && (
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              ></div>
            </div>
          )}

          {progress !== undefined && (
            <p className="progress-text">{Math.round(progress)}%</p>
          )}
        </div>
      </div>

      {isAnalyzing && <div className="analysis-overlay"></div>}
    </div>
  )
}
