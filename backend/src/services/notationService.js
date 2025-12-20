/**
 * Notation Evaluation Service
 * Compares student's transposition with reference answer
 */

const { DOMParser } = require('@xmldom/xmldom');
const JSZip = require('jszip');

/**
 * Convert note to MIDI number
 */
function noteToMIDI(step, octave, alter = 0) {
  const stepToSemitone = {
    'C': 0,
    'D': 2,
    'E': 4,
    'F': 5,
    'G': 7,
    'A': 9,
    'B': 11
  };
  
  const baseMIDI = 12 + (octave * 12) + stepToSemitone[step.toUpperCase()] + alter;
  return baseMIDI;
}

/**
 * Extract MusicXML from MXL (ZIP) file
 */
async function extractMusicXMLFromMXL(mxlData) {
  try {
    // Check if it's a ZIP file (MXL format)
    if (typeof mxlData === 'string') {
      // If it's a string, check if it starts with ZIP signature (PK = 0x50 0x4B)
      // Don't trim binary data as it can corrupt it
      if (mxlData.length > 2 && mxlData.charCodeAt(0) === 0x50 && mxlData.charCodeAt(1) === 0x4B) {
        // Convert string to Buffer - handle binary string correctly
        // The string comes from ArrayBuffer conversion, so each char is a byte
        const buffer = Buffer.from(mxlData, 'binary');
        const zip = await JSZip.loadAsync(buffer);
        
        // MXL files contain score.xml or score.mxl
        // First check for container.xml to find the main file
        let scoreFile = null;
        if (zip.files['META-INF/container.xml']) {
          const containerXML = await zip.files['META-INF/container.xml'].async('string');
          const containerParser = new DOMParser();
          const containerDoc = containerParser.parseFromString(containerXML, 'text/xml');
          const rootFileEl = containerDoc.getElementsByTagName('rootfile')[0];
          if (rootFileEl) {
            const fullPath = rootFileEl.getAttribute('full-path');
            if (fullPath && zip.files[fullPath]) {
              scoreFile = zip.files[fullPath];
            }
          }
        }
        
        // If no container.xml, try common names
        if (!scoreFile) {
          if (zip.files['score.xml']) {
            scoreFile = zip.files['score.xml'];
          } else if (zip.files['score.mxl']) {
            // Nested MXL, extract recursively
            const nestedMxl = await zip.files['score.mxl'].async('nodebuffer');
            return await extractMusicXMLFromMXL(nestedMxl);
          } else {
            // Find first .xml file
            for (const filename in zip.files) {
              if (filename.endsWith('.xml') && !filename.includes('META-INF')) {
                scoreFile = zip.files[filename];
                break;
              }
            }
          }
        }
        
        if (scoreFile) {
          const xmlContent = await scoreFile.async('string');
          return xmlContent;
        } else {
          console.error('No score.xml found in MXL file');
          return null;
        }
      }
    } else if (Buffer.isBuffer(mxlData)) {
      // It's already a Buffer
      const zip = await JSZip.loadAsync(mxlData);
      
      // Same extraction logic
      let scoreFile = null;
      if (zip.files['META-INF/container.xml']) {
        const containerXML = await zip.files['META-INF/container.xml'].async('string');
        const containerParser = new DOMParser();
        const containerDoc = containerParser.parseFromString(containerXML, 'text/xml');
        const rootFileEl = containerDoc.getElementsByTagName('rootfile')[0];
        if (rootFileEl) {
          const fullPath = rootFileEl.getAttribute('full-path');
          if (fullPath && zip.files[fullPath]) {
            scoreFile = zip.files[fullPath];
          }
        }
      }
      
      if (!scoreFile) {
        if (zip.files['score.xml']) {
          scoreFile = zip.files['score.xml'];
        } else {
          for (const filename in zip.files) {
            if (filename.endsWith('.xml') && !filename.includes('META-INF')) {
              scoreFile = zip.files[filename];
              break;
            }
          }
        }
      }
      
      if (scoreFile) {
        const xmlContent = await scoreFile.async('string');
        return xmlContent;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting MusicXML from MXL:', error);
    return null;
  }
}

/**
 * Parse MusicXML and extract notes
 */
async function parseMusicXML(musicXML) {
  try {
    if (!musicXML) {
      console.error('Invalid MusicXML input: null or undefined');
      return [];
    }
    
    // Handle Buffer input (from file uploads)
    let xmlString = musicXML;
    if (Buffer.isBuffer(musicXML)) {
      // Check if it's a ZIP file
      if (musicXML[0] === 0x50 && musicXML[1] === 0x4B) { // PK signature
        xmlString = await extractMusicXMLFromMXL(musicXML);
        if (!xmlString) {
          return [];
        }
      } else {
        xmlString = musicXML.toString('utf-8');
      }
    } else if (typeof musicXML !== 'string') {
      console.error('Invalid MusicXML input type:', typeof musicXML);
      return [];
    }
    
    // Check if it's a ZIP file (MXL) as string first (before trimming)
    // ZIP files start with "PK" (0x50 0x4B)
    // Check before trimming to avoid corrupting binary data
    if (xmlString.length > 2 && xmlString.charCodeAt(0) === 0x50 && xmlString.charCodeAt(1) === 0x4B) {
      console.log('Detected MXL (ZIP) format, extracting...');
      xmlString = await extractMusicXMLFromMXL(xmlString);
      if (!xmlString) {
        return [];
      }
      // Re-trim after extraction since extracted XML is text
      xmlString = xmlString.trim();
    } else {
      // Check if it's a PDF (common mistake) - safe to trim for text files
      const trimmed = xmlString.trim();
      if (trimmed.startsWith('%PDF')) {
        console.error('Input is a PDF file, not MusicXML. Cannot parse PDF files.');
        return [];
      }
      xmlString = trimmed;
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError && parserError.length > 0) {
      const errorText = parserError[0].textContent || 'Unknown parsing error';
      console.error('MusicXML parsing error:', errorText);
      console.error('First 500 chars of XML:', musicXML.substring(0, 500));
      return [];
    }
    
    // Parse MusicXML structure properly: part -> measure -> note
    // First, try to find the first part
    const getElementByLocalName = (parent, tagName) => {
      const elements = parent.getElementsByTagName(tagName);
      if (elements && elements.length > 0) return elements[0];
      // Try with namespace
      const allElements = Array.from(parent.getElementsByTagName('*')).filter(el => {
        const localName = el.localName || el.nodeName.split(':').pop();
        return localName === tagName;
      });
      return allElements[0] || null;
    };
    
    const getElementsByLocalName = (parent, tagName) => {
      const elements = Array.from(parent.getElementsByTagName(tagName));
      // Also try with namespace
      const allElements = Array.from(parent.getElementsByTagName('*')).filter(el => {
        const localName = el.localName || el.nodeName.split(':').pop();
        return localName === tagName;
      });
      // Combine and remove duplicates
      const combined = [...elements, ...allElements];
      const unique = Array.from(new Set(combined));
      return unique;
    };
    
    // Find part (handle both with and without namespaces)
    let part = xmlDoc.getElementsByTagName('part')[0];
    if (!part) {
      const scorePartwise = xmlDoc.getElementsByTagName('score-partwise')[0];
      if (scorePartwise) {
        part = scorePartwise.getElementsByTagName('part')[0];
      }
    }
    if (!part) {
      // Try with namespace
      const allElements = xmlDoc.getElementsByTagName('*');
      const parts = Array.from(allElements).filter(el => {
        const localName = el.localName || el.nodeName.split(':').pop();
        return localName === 'part';
      });
      part = parts[0] || xmlDoc; // Fallback to root if no part found
    }
    
    // Get divisions and transpose/octave-shift from first measure's attributes
    const firstMeasure = getElementByLocalName(part, 'measure');
    let divisions = 4; // default
    let transposeOctaves = 0; // Track octave transposition from <transpose> element
    let currentOctaveShift = 0; // Track octave shift from <octave-shift> elements
    
    if (firstMeasure) {
      const attributes = getElementByLocalName(firstMeasure, 'attributes');
      if (attributes) {
        const divisionsEl = getElementByLocalName(attributes, 'divisions');
        if (divisionsEl) {
          divisions = parseInt(divisionsEl.textContent || '4', 10);
        }
        
        // Parse transpose element (affects octave of notes)
        const transposeEl = getElementByLocalName(attributes, 'transpose');
        if (transposeEl) {
          const octaveChangeEl = getElementByLocalName(transposeEl, 'octave-change');
          if (octaveChangeEl) {
            transposeOctaves = parseInt(octaveChangeEl.textContent || '0', 10);
            console.log('Found transpose octave-change:', transposeOctaves);
          }
        }
      }
      
      // Check score-part for transpose info
      const partId = part.getAttribute('id');
      if (partId) {
        const scorePartwise = xmlDoc.getElementsByTagName('score-partwise')[0];
        if (scorePartwise) {
          const partList = getElementByLocalName(scorePartwise, 'part-list');
          if (partList) {
            const scoreParts = Array.from(partList.getElementsByTagName('*')).filter(el => {
              const localName = el.localName || el.nodeName.split(':').pop();
              return localName === 'score-part' && el.getAttribute('id') === partId;
            });
            if (scoreParts.length > 0) {
              const scorePart = scoreParts[0];
              const transposeEl = getElementByLocalName(scorePart, 'transpose');
              if (transposeEl) {
                const octaveChangeEl = getElementByLocalName(transposeEl, 'octave-change');
                if (octaveChangeEl) {
                  const scorePartTranspose = parseInt(octaveChangeEl.textContent || '0', 10);
                  transposeOctaves += scorePartTranspose;
                  console.log('Found score-part transpose:', scorePartTranspose, 'Total:', transposeOctaves);
                }
              }
            }
          }
        }
      }
      
      // Track octave shifts (8va, 8vb, etc.) from direction elements
      const measuresForShift = getElementsByLocalName(part, 'measure');
      measuresForShift.forEach(measure => {
        const directions = getElementsByLocalName(measure, 'direction');
        directions.forEach(dirEl => {
          const octaveShiftEl = getElementByLocalName(dirEl, 'octave-shift');
          if (octaveShiftEl) {
            const type = octaveShiftEl.getAttribute('type') || '';
            const size = parseInt(octaveShiftEl.getAttribute('size') || '0', 10);
            if (type === 'up') {
              currentOctaveShift = size || 1; // Typically 1 for 8va
              console.log('Found octave-shift up:', currentOctaveShift);
            } else if (type === 'down') {
              currentOctaveShift = -(size || 1); // Typically -1 for 8vb
              console.log('Found octave-shift down:', currentOctaveShift);
            } else if (type === 'stop') {
              currentOctaveShift = 0;
              console.log('Found octave-shift stop');
            }
          }
        });
      });
    }
    
    // Extract notes from all measures in order
    const measures = getElementsByLocalName(part, 'measure');
    const noteElements = [];
    
    measures.forEach((measure) => {
      const notes = getElementsByLocalName(measure, 'note');
      notes.forEach(note => noteElements.push(note));
    });
    
    console.log('Found', noteElements.length, 'notes across', measures.length, 'measures');
    
    if (noteElements.length === 0) {
      console.error('No <note> elements found in MusicXML');
      console.error('XML structure check:');
      console.error('- Has score-partwise:', xmlDoc.getElementsByTagName('score-partwise').length > 0);
      console.error('- Has part:', getElementsByLocalName(xmlDoc, 'part').length > 0);
      console.error('- Has measure:', measures.length);
      console.error('First 1000 chars of XML:', musicXML.substring(0, 1000));
      return [];
    }
    
    const notes = [];
    let currentPosition = 0;
    
    console.log('Using divisions:', divisions);
    console.log('Transpose octaves:', transposeOctaves);
    console.log('Current octave shift:', currentOctaveShift);
    
    for (let i = 0; i < noteElements.length; i++) {
      const noteEl = noteElements[i];
      
      // Check for octave-shift in notations (less common, but possible)
      let notationsEl = getElementByLocalName(noteEl, 'notations');
      if (notationsEl) {
        const octaveShiftEl = getElementByLocalName(notationsEl, 'octave-shift');
        if (octaveShiftEl) {
          const type = octaveShiftEl.getAttribute('type') || '';
          const size = parseInt(octaveShiftEl.getAttribute('size') || '0', 10);
          if (type === 'up') {
            currentOctaveShift = size || 1;
          } else if (type === 'down') {
            currentOctaveShift = -(size || 1);
          } else if (type === 'stop') {
            currentOctaveShift = 0;
          }
        }
      }
      
      // Get pitch element (handle namespace)
      let pitchEl = noteEl.getElementsByTagName('pitch')[0];
      if (!pitchEl) {
        // Try with namespace
        const pitchElements = Array.from(noteEl.getElementsByTagName('*')).filter(el => {
          const localName = el.localName || el.nodeName.split(':').pop();
          return localName === 'pitch';
        });
        pitchEl = pitchElements[0];
      }
      
      if (!pitchEl) {
        // Check if it's a rest
        const restEl = noteEl.getElementsByTagName('rest')[0];
        if (!restEl) {
          // Try with namespace
          const restElements = Array.from(noteEl.getElementsByTagName('*')).filter(el => {
            const localName = el.localName || el.nodeName.split(':').pop();
            return localName === 'rest';
          });
          if (restElements.length === 0) {
            console.warn('Note element without pitch or rest, skipping');
            continue; // Skip notes without pitch or rest
          }
        }
        continue; // Skip rests for now
      }
      
      const stepEl = getElementByLocalName(pitchEl, 'step');
      const octaveEl = getElementByLocalName(pitchEl, 'octave');
      const alterEl = getElementByLocalName(pitchEl, 'alter');
      const durationEl = getElementByLocalName(noteEl, 'duration');
      const typeEl = getElementByLocalName(noteEl, 'type');
      
      const step = stepEl ? (stepEl.textContent || '').trim() : '';
      let octave = octaveEl ? parseInt(octaveEl.textContent || '4', 10) : 4;
      const alter = alterEl ? parseInt(alterEl.textContent || '0', 10) : 0;
      const duration = durationEl ? parseInt(durationEl.textContent || '4', 10) : 4;
      const type = typeEl ? (typeEl.textContent || 'quarter').trim() : 'quarter';
      
      // Apply transpose octave adjustment from attributes
      if (transposeOctaves !== 0) {
        octave += transposeOctaves;
      }
      
      // Apply octave shift if present (8va, 8vb, etc.)
      if (currentOctaveShift !== 0) {
        octave += currentOctaveShift;
      }
      
      if (!step) {
        console.warn('Note without step, skipping:', noteEl);
        continue;
      }
      
      // Extract tie information (ligadura de unión)
      let tieStart = false;
      let tieEnd = false;
      const tieElements = getElementsByLocalName(noteEl, 'tie');
      for (let j = 0; j < tieElements.length; j++) {
        const tieType = tieElements[j].getAttribute('type');
        if (tieType === 'start') tieStart = true;
        if (tieType === 'stop') tieEnd = true;
      }
      
      // Also check in notations/tied (reuse notationsEl if already found)
      if (!notationsEl) {
        notationsEl = getElementByLocalName(noteEl, 'notations');
      }
      if (notationsEl) {
        const tiedElements = getElementsByLocalName(notationsEl, 'tied');
        for (let j = 0; j < tiedElements.length; j++) {
          const tiedType = tiedElements[j].getAttribute('type');
          if (tiedType === 'start') tieStart = true;
          if (tiedType === 'stop') tieEnd = true;
        }
      }
      
      // Extract slur information (ligadura de expresión)
      let slurStart = false;
      let slurEnd = false;
      let slurNumber = null;
      if (notationsEl) {
        const slurElements = getElementsByLocalName(notationsEl, 'slur');
        for (let j = 0; j < slurElements.length; j++) {
          const slurType = slurElements[j].getAttribute('type');
          const slurNum = slurElements[j].getAttribute('number') || '1';
          if (slurType === 'start') {
            slurStart = true;
            slurNumber = slurNum;
          }
          if (slurType === 'stop') {
            slurEnd = true;
            slurNumber = slurNum;
          }
        }
      }
      
      // Extract articulation information
      let articulation = null;
      if (notationsEl) {
        const articulationsEl = getElementByLocalName(notationsEl, 'articulations');
        if (articulationsEl) {
          // Check for different articulation types (in order of precedence if multiple)
          if (getElementByLocalName(articulationsEl, 'staccatissimo')) {
            articulation = 'staccatissimo';
          } else if (getElementByLocalName(articulationsEl, 'staccato')) {
            articulation = 'staccato';
          } else if (getElementByLocalName(articulationsEl, 'strong-accent') || getElementByLocalName(articulationsEl, 'marcato')) {
            articulation = 'marcato';
          } else if (getElementByLocalName(articulationsEl, 'accent')) {
            articulation = 'accent';
          } else if (getElementByLocalName(articulationsEl, 'tenuto')) {
            articulation = 'tenuto';
          }
          
          // Log parsed articulation for debugging
          if (articulation && i < 5) {
            console.log(`Parsed articulation for note ${i + 1}:`, {
              step,
              octave,
              articulation,
              position: currentPosition
            });
          }
        }
      }
      
      const note = {
        step,
        octave,
        alter,
        duration,
        type,
        position: currentPosition,
        tieStart,
        tieEnd,
        slurStart,
        slurEnd,
        slurNumber,
        articulation
      };
      
      notes.push(note);
      
      // Update position (duration is in divisions, convert to beats)
      currentPosition += duration / divisions;
    }
    
    console.log('Successfully parsed', notes.length, 'notes');
    return notes;
  } catch (error) {
    console.error('Error parsing MusicXML:', error);
    console.error('Error stack:', error.stack);
    return [];
  }
}

/**
 * Apply transposition to notes
 */
function transposeNotes(notes, semitones) {
  return notes.map(note => {
    const currentMIDI = noteToMIDI(note.step, note.octave, note.alter || 0);
    const transposedMIDI = currentMIDI + semitones;
    
    // Convert MIDI back to note
    const octave = Math.floor((transposedMIDI - 12) / 12);
    const semitoneInOctave = ((transposedMIDI - 12) % 12 + 12) % 12;
    
    const semitoneToStep = {
      0: { step: 'C', alter: 0 },
      1: { step: 'C', alter: 1 },
      2: { step: 'D', alter: 0 },
      3: { step: 'D', alter: 1 },
      4: { step: 'E', alter: 0 },
      5: { step: 'F', alter: 0 },
      6: { step: 'F', alter: 1 },
      7: { step: 'G', alter: 0 },
      8: { step: 'G', alter: 1 },
      9: { step: 'A', alter: 0 },
      10: { step: 'A', alter: 1 },
      11: { step: 'B', alter: 0 }
    };
    
    const { step, alter } = semitoneToStep[semitoneInOctave] || { step: 'C', alter: 0 };
    
    return {
      ...note,
      step,
      octave,
      alter
    };
  });
}

/**
 * Normalize note type to a standard format for comparison
 */
function normalizeNoteType(type) {
  if (!type) return 'quarter';
  const normalized = type.toLowerCase().trim();
  // Map common variations
  const typeMap = {
    'whole': 'whole',
    'w': 'whole',
    'half': 'half',
    'h': 'half',
    'quarter': 'quarter',
    'q': 'quarter',
    'eighth': 'eighth',
    '8': 'eighth',
    '8th': 'eighth',
    'sixteenth': 'sixteenth',
    '16': 'sixteenth',
    '16th': 'sixteenth'
  };
  return typeMap[normalized] || normalized;
}

/**
 * Compare two notes (including ligaduras)
 */
function compareNotes(expected, actual, tolerance = 0.1) {
  // Compare pitch (MIDI number)
  const expectedMIDI = noteToMIDI(expected.step, expected.octave, expected.alter || 0);
  const actualMIDI = noteToMIDI(actual.step, actual.octave, actual.alter || 0);
  
  if (Math.abs(expectedMIDI - actualMIDI) > 0) {
    return { match: false, reason: 'pitch' };
  }
  
  // Compare duration by type (more reliable than numeric duration values)
  // Different MusicXML files may use different divisions, so comparing types is better
  const expectedType = normalizeNoteType(expected.type);
  const actualType = normalizeNoteType(actual.type);
  
  if (expectedType !== actualType) {
    // If types don't match, fall back to numeric comparison with tolerance
    // But this should rarely happen if types are properly set
    const durationDiff = Math.abs(expected.duration - actual.duration);
    if (durationDiff > tolerance) {
      return { match: false, reason: 'duration' };
    }
  }
  
  // Compare ties (ligaduras de unión)
  const expectedTieStart = expected.tieStart || false;
  const expectedTieEnd = expected.tieEnd || false;
  const actualTieStart = actual.tieStart || false;
  const actualTieEnd = actual.tieEnd || false;
  
  if (expectedTieStart !== actualTieStart || expectedTieEnd !== actualTieEnd) {
    return { match: false, reason: 'tie' };
  }
  
  // Compare slurs (ligaduras de expresión)
  // Note: We check if slur exists, not necessarily the exact number
  const expectedHasSlur = expected.slurStart || expected.slurEnd;
  const actualHasSlur = actual.slurStart || actual.slurEnd;
  
  if (expectedHasSlur !== actualHasSlur) {
    return { match: false, reason: 'slur' };
  }
  
  // If both have slurs, check if start/end match
  if (expectedHasSlur && actualHasSlur) {
    if (expected.slurStart !== actual.slurStart || expected.slurEnd !== actual.slurEnd) {
      return { match: false, reason: 'slur' };
    }
  }
  
  // Compare articulations
  const expectedArticulation = expected.articulation || null;
  const actualArticulation = actual.articulation || null;
  
  if (expectedArticulation !== actualArticulation) {
    console.log('Articulation mismatch:', {
      expected: expectedArticulation,
      actual: actualArticulation,
      position: expected.position || actual.position
    });
    return { match: false, reason: 'articulation' };
  }
  
  // Log if both have articulations and they match
  if (expectedArticulation && actualArticulation && expectedArticulation === actualArticulation) {
    console.log('Articulation match:', {
      articulation: expectedArticulation,
      position: expected.position || actual.position
    });
  }
  
  return { match: true };
}

/**
 * Align notes by temporal position
 */
function alignNotes(expected, actual, tolerance = 0.25) {
  const comparisons = [];
  const usedActualIndices = new Set();
  
  // Match expected notes with actual notes
  expected.forEach((expNote) => {
    // Find closest actual note within tolerance
    let bestMatch = null;
    
    actual.forEach((actNote, index) => {
      if (usedActualIndices.has(index)) return;
      
      const distance = Math.abs(expNote.position - actNote.position);
      if (distance <= tolerance) {
        if (!bestMatch || distance < bestMatch.distance) {
          bestMatch = { index, note: actNote, distance };
        }
      }
    });
    
      if (bestMatch) {
      usedActualIndices.add(bestMatch.index);
      const comparison = compareNotes(expNote, bestMatch.note);
      const isCorrect = comparison.match;
      const expectedMIDI = noteToMIDI(expNote.step, expNote.octave, expNote.alter || 0);
      const actualMIDI = noteToMIDI(bestMatch.note.step, bestMatch.note.octave, bestMatch.note.alter || 0);
      
      // Debug logging for comparison
      if (!isCorrect) {
        const expectedType = normalizeNoteType(expNote.type);
        const actualType = normalizeNoteType(bestMatch.note.type);
        console.log('Note comparison failed:', {
          reason: comparison.reason,
          position: expNote.position,
          expected: { 
            step: expNote.step, octave: expNote.octave, alter: expNote.alter, 
            type: expNote.type, normalizedType: expectedType, duration: expNote.duration, 
            MIDI: expectedMIDI,
            tieStart: expNote.tieStart, tieEnd: expNote.tieEnd,
            slurStart: expNote.slurStart, slurEnd: expNote.slurEnd,
            articulation: expNote.articulation
          },
          actual: { 
            step: bestMatch.note.step, octave: bestMatch.note.octave, alter: bestMatch.note.alter, 
            type: bestMatch.note.type, normalizedType: actualType, duration: bestMatch.note.duration, 
            MIDI: actualMIDI,
            tieStart: bestMatch.note.tieStart, tieEnd: bestMatch.note.tieEnd,
            slurStart: bestMatch.note.slurStart, slurEnd: bestMatch.note.slurEnd,
            articulation: bestMatch.note.articulation
          },
          MIDIMatch: expectedMIDI === actualMIDI,
          typeMatch: expectedType === actualType
        });
      }
      
      const errorType = comparison.reason || (isCorrect ? null : 'unknown');
      
      comparisons.push({
        position: expNote.position,
        expected: expNote,
        actual: bestMatch.note,
        isCorrect,
        errorType,
        expectedMIDI,
        actualMIDI
      });
    } else {
      // Missing note
      comparisons.push({
        position: expNote.position,
        expected: expNote,
        actual: null,
        isCorrect: false,
        errorType: 'missing',
        expectedMIDI: noteToMIDI(expNote.step, expNote.octave, expNote.alter || 0)
      });
    }
  });
  
  // Find extra notes (actual notes not matched)
  actual.forEach((actNote, index) => {
    if (!usedActualIndices.has(index)) {
      comparisons.push({
        position: actNote.position,
        expected: null,
        actual: actNote,
        isCorrect: false,
        errorType: 'extra',
        actualMIDI: noteToMIDI(actNote.step, actNote.octave, actNote.alter || 0)
      });
    }
  });
  
  // Sort by position
  comparisons.sort((a, b) => a.position - b.position);
  
  return comparisons;
}

/**
 * Main evaluation function
 */
async function evaluateTransposition(referenceMusicXML, studentMusicXML, transpositionSemitones) {
  // Parse both MusicXML files (now async)
  const referenceNotes = await parseMusicXML(referenceMusicXML);
  const studentNotes = await parseMusicXML(studentMusicXML);
  
  console.log('Evaluation Debug:', {
    referenceNotesCount: referenceNotes.length,
    studentNotesCount: studentNotes.length,
    transpositionSemitones,
    referenceNotesSample: referenceNotes.slice(0, 2),
    studentNotesSample: studentNotes.slice(0, 2)
  });
  
  if (referenceNotes.length === 0) {
    console.error('No reference notes found! Reference MusicXML length:', referenceMusicXML?.length);
    return {
      score: 0,
      totalNotes: 0,
      correctNotes: 0,
      incorrectNotes: 0,
      missingNotes: 0,
      extraNotes: 0,
      details: [],
      percentage: 0,
      error: 'No notes found in reference MusicXML'
    };
  }
  
  if (studentNotes.length === 0) {
    console.error('No student notes found! Student MusicXML length:', studentMusicXML?.length);
    return {
      score: 0,
      totalNotes: referenceNotes.length,
      correctNotes: 0,
      incorrectNotes: 0,
      missingNotes: referenceNotes.length,
      extraNotes: 0,
      details: [],
      percentage: 0,
      error: 'No notes found in student MusicXML'
    };
  }
  
  // Apply transposition to reference
  const transposedReference = transposeNotes(referenceNotes, transpositionSemitones);
  
  console.log('After transposition:', {
    originalFirstNote: referenceNotes[0],
    transposedFirstNote: transposedReference[0],
    studentFirstNote: studentNotes[0]
  });
  
  // Align and compare notes
  const comparisons = alignNotes(transposedReference, studentNotes);
  
  console.log('Comparison results:', {
    totalComparisons: comparisons.length,
    correct: comparisons.filter(c => c.isCorrect).length,
    incorrect: comparisons.filter(c => !c.isCorrect && c.expected && c.actual).length,
    missing: comparisons.filter(c => c.errorType === 'missing').length,
    extra: comparisons.filter(c => c.errorType === 'extra').length
  });
  
  // Calculate statistics
  const correctNotes = comparisons.filter(c => c.isCorrect).length;
  const incorrectNotes = comparisons.filter(c => !c.isCorrect && c.expected && c.actual).length;
  const missingNotes = comparisons.filter(c => c.errorType === 'missing').length;
  const extraNotes = comparisons.filter(c => c.errorType === 'extra').length;
  const totalNotes = transposedReference.length;
  
  // Calculate score (correct notes / total notes)
  const score = totalNotes > 0 ? (correctNotes / totalNotes) * 100 : 0;
  
  return {
    score: Math.round(score),
    totalNotes,
    correctNotes,
    incorrectNotes,
    missingNotes,
    extraNotes,
    details: comparisons,
    percentage: Math.round(score)
  };
}

module.exports = {
  evaluateTransposition
};



