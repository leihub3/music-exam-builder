'use client'

import Vex from 'vexflow'

const { Renderer, Stave, StaveNote } = Vex.Flow

interface RhythmSymbolDisplayProps {
  rhythm: 'whole' | 'half' | 'quarter' | 'eighth' | 'dotted-half' | 'dotted-quarter';
  size?: number; // Size in pixels (height of stave)
}

/**
 * Component to display a single rhythm symbol (note head only, no pitch)
 */
export function RhythmSymbolDisplay({ rhythm, size = 40 }: RhythmSymbolDisplayProps) {
  // Map rhythm values to VexFlow duration codes
  const rhythmToVexFlow: Record<string, { duration: string; dot?: boolean }> = {
    'whole': { duration: 'w' },
    'dotted-half': { duration: 'h', dot: true },
    'half': { duration: 'h' },
    'dotted-quarter': { duration: 'q', dot: true },
    'quarter': { duration: 'q' },
    'eighth': { duration: '8' },
  }

  // Create a container div with a ref
  const containerId = `rhythm-symbol-${rhythm}-${Math.random().toString(36).substr(2, 9)}`
  
  // Use a simple approach: render inline using a useEffect and ref
  // For simplicity, we'll use Unicode symbols as fallback and render VexFlow in a useEffect
  
  const rhythmConfig = rhythmToVexFlow[rhythm] || { duration: 'q' }
  
  // Unicode symbols for fallback display
  const unicodeSymbols: Record<string, string> = {
    'whole': '𝅝',
    'dotted-half': '𝅗𝅥',
    'half': '𝅗',
    'dotted-quarter': '𝅘𝅥',
    'quarter': '𝅘',
    'eighth': '𝅘𝅥𝅮',
  }
  
  // For now, use Unicode symbols which are simpler and work everywhere
  // In the future, we can enhance this to use VexFlow for more accurate rendering
  const displaySymbol = unicodeSymbols[rhythm] || '𝅘'
  
  return (
    <span className="inline-block text-2xl font-normal leading-none" style={{ fontSize: `${size * 0.8}px` }}>
      {displaySymbol}
      {rhythmConfig.dot && <span className="ml-0.5">.</span>}
    </span>
  )
}

