/**
 * ModeSwitch Component
 * Toggle control for switching between Manual and Auto segmentation modes
 */

import React from 'react'
import type { SegmentationMode } from '../../types/segmentation'
import './ModeSwitch.css'

export interface ModeSwitchProps {
  /** Current segmentation mode */
  mode: SegmentationMode
  /** Whether the switch should be visible */
  visible: boolean
  /** Callback when mode changes */
  onChange: (mode: SegmentationMode) => void
  /** Whether the switch is disabled */
  disabled?: boolean
  /** CSS class name for styling */
  className?: string
}

/**
 * Mode Switch Component
 * Provides a toggle switch for Manual/Auto segmentation modes
 * Only visible when in repeat mode
 */
export const ModeSwitch: React.FC<ModeSwitchProps> = ({
  mode,
  visible,
  onChange,
  disabled = false,
  className = '',
}) => {
  if (!visible) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMode: SegmentationMode = e.target.checked ? 'auto' : 'manual'
    onChange(newMode)
  }

  return (
    <div className={`mode-switch ${className}`}>
      <label className="mode-switch-label">
        <input
          type="checkbox"
          checked={mode === 'auto'}
          onChange={handleChange}
          disabled={disabled}
          className="mode-switch-input"
          aria-label="Toggle between Manual and Auto segmentation modes"
          title={`Switch to ${mode === 'auto' ? 'Manual' : 'Auto'} mode`}
        />
        <span className="mode-switch-slider"></span>
        <span className="mode-switch-text">
          {mode === 'manual' ? 'Manual' : 'Auto'}
        </span>
      </label>
    </div>
  )
}
