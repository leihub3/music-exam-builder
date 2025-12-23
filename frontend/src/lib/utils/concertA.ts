/**
 * Generate Concert A (440 Hz) reference tone using Web Audio API
 */

/**
 * Generate and play Concert A (440 Hz) sine wave
 * @param duration Duration in seconds (default: 2)
 * @returns Promise that resolves when audio finishes playing
 */
export function playConcertA(duration: number = 2): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create oscillator for 440 Hz tone
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      // Configure oscillator
      oscillator.frequency.value = 440 // Concert A (A4)
      oscillator.type = 'sine'
      
      // Configure gain envelope (fade in/out)
      const now = audioContext.currentTime
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1) // Fade in over 0.1s
      gainNode.gain.setValueAtTime(0.3, now + duration - 0.2)
      gainNode.gain.linearRampToValueAtTime(0, now + duration) // Fade out over 0.2s
      
      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Start and stop
      oscillator.start(now)
      oscillator.stop(now + duration)
      
      // Resolve when finished
      oscillator.onended = () => resolve()
    } catch (error) {
      console.error('Error playing Concert A:', error)
      reject(error)
    }
  })
}

/**
 * Generate Concert A audio data URL (alternative approach using static file)
 * This can be used if we store a static MP3 file instead
 */
export function getConcertAAudioUrl(): string {
  // Option 1: Use static file if available
  // return '/audio/concert-a-440hz.mp3'
  
  // Option 2: Generate programmatically (more complex - would need AudioBuffer export)
  // For now, we'll use the playConcertA function above
  throw new Error('getConcertAAudioUrl not implemented - use playConcertA instead')
}

