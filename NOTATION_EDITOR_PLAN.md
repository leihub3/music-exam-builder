# Plan: Editor de Partituras con Evaluación Automática

## 🎯 Objetivo
Crear un editor de partituras integrado donde los estudiantes puedan escribir transposiciones directamente en el navegador, con capacidad de evaluación automática comparando notas correctas vs incorrectas.

## ✅ Viabilidad: ALTA

### Tecnologías Disponibles
- ✅ **VexFlow 4.2.3** - Ya instalado, perfecto para renderizar y editar partituras
- ✅ **MusicXML** - Formato estándar para intercambio de datos musicales
- ✅ **JavaScript/TypeScript** - Para lógica de comparación
- ✅ **Backend Node.js** - Para procesamiento de evaluación

## 📋 Plan de Implementación

### FASE 1: Editor de Partituras Básico (2-3 semanas)

#### 1.1 Componente de Editor con VexFlow
- **Archivo**: `frontend/src/components/notation/NotationEditor.tsx`
- **Funcionalidades**:
  - Renderizar partitura original (desde MusicXML o PDF)
  - Editor interactivo para agregar/editar notas
  - Herramientas: agregar nota, eliminar nota, cambiar duración, alteraciones
  - Visualización en tiempo real
  - Guardar como MusicXML

#### 1.2 Librerías Necesarias
```json
{
  "vexflow": "^4.2.3", // Ya instalado ✅
  "musicxml-interfaces": "^0.11.0", // Para parsear MusicXML
  "tonejs/midi": "^2.0.28", // Para análisis musical
  "opensheetmusicdisplay": "^1.8.0" // Alternativa para mostrar MusicXML
}
```

#### 1.3 Características del Editor
- **Interfaz de usuario**:
  - Canvas con VexFlow para renderizado
  - Toolbar con herramientas (notas, silencios, alteraciones)
  - Selector de duración (redonda, blanca, negra, etc.)
  - Selector de altura (do, re, mi, etc.)
  - Botones: Agregar, Eliminar, Deshacer, Rehacer
  - Vista previa en tiempo real

- **Funcionalidades básicas**:
  - Click en pentagrama para agregar nota
  - Drag & drop para mover notas
  - Click en nota para seleccionar/eliminar
  - Teclado MIDI virtual (opcional)
  - Zoom in/out

### FASE 2: Integración con Sistema de Transposición (1 semana)

#### 2.1 Cargar Partitura Original
- Parsear MusicXML de la pregunta de transposición
- Mostrar en modo "solo lectura" arriba
- Mostrar editor abajo para la respuesta del estudiante

#### 2.2 Aplicar Transposición Automática (Opcional)
- Botón "Aplicar transposición automática" para pre-llenar
- El estudiante puede corregir después
- Útil para verificar que entendió la transposición

### FASE 3: Evaluación Automática (2-3 semanas)

#### 3.1 Comparación de MusicXML
**Estrategia de Evaluación**:

1. **Parsear ambas partituras** (original transpuesta vs respuesta del estudiante)
2. **Normalizar datos**:
   - Convertir a formato común (MIDI numbers)
   - Aplicar transposición esperada a la original
   - Comparar nota por nota

3. **Métricas de evaluación**:
   - **Notas correctas**: Altura (pitch) correcta
   - **Notas incorrectas**: Altura incorrecta
   - **Ritmo correcto**: Duraciones correctas
   - **Alteraciones correctas**: Sostenidos/bemoles correctos
   - **Opcional**: Tolerancia para enharmónicos (Do# = Reb)

#### 3.2 Algoritmo de Comparación

```typescript
interface NoteComparison {
  expectedNote: {
    pitch: number; // MIDI number
    duration: number; // beats
    octave: number;
    accidental: string | null;
  };
  actualNote: {
    pitch: number;
    duration: number;
    octave: number;
    accidental: string | null;
  };
  isCorrect: boolean;
  errorType?: 'pitch' | 'duration' | 'accidental' | 'missing' | 'extra';
}

function compareNotation(
  referenceMusicXML: string, 
  studentMusicXML: string,
  transposition: number // semitones
): NoteComparison[] {
  // 1. Parsear ambos MusicXML
  // 2. Aplicar transposición a la referencia
  // 3. Alinear notas por posición temporal
  // 4. Comparar nota por nota
  // 5. Retornar array de comparaciones
}
```

#### 3.3 Backend para Evaluación
- **Endpoint**: `POST /api/questions/evaluate-transposition`
- **Input**: 
  - `questionId`: ID de la pregunta
  - `studentMusicXML`: Partitura del estudiante
- **Output**:
  ```json
  {
    "score": 85,
    "totalNotes": 20,
    "correctNotes": 17,
    "incorrectNotes": 3,
    "details": [
      {
        "position": 0.5,
        "expected": "C4",
        "actual": "C4",
        "correct": true
      },
      {
        "position": 1.0,
        "expected": "D4",
        "actual": "E4",
        "correct": false,
        "error": "pitch"
      }
    ]
  }
  ```

### FASE 4: Interfaz de Resultados (1 semana)

#### 4.1 Visualización de Errores
- Mostrar partitura con colores:
  - 🟢 Verde: Notas correctas
  - 🔴 Rojo: Notas incorrectas
  - 🟡 Amarillo: Notas faltantes/extra
- Tooltips mostrando qué se esperaba vs qué escribió
- Estadísticas: "17/20 notas correctas (85%)"

#### 4.2 Feedback Detallado
- Lista de errores específicos
- Sugerencias de corrección
- Opción de re-intentar

## 🛠️ Stack Tecnológico Recomendado

### Frontend
- **VexFlow 4.2.3** - Editor y renderizado de partituras ✅
- **musicxml-interfaces** - Parsear MusicXML
- **React** - Componentes interactivos ✅
- **Canvas API** - Renderizado de VexFlow

### Backend (Opcional para evaluación avanzada)
- **music21 (Python)** - Análisis musical avanzado (requiere microservicio)
- **musicxml** (Node.js) - Parsear MusicXML en Node
- **tonejs/midi** - Análisis de notas

### Alternativa: Todo en Frontend
- Evaluación básica puede hacerse 100% en JavaScript
- Comparación de MIDI numbers
- Sin necesidad de backend adicional

## 📊 Niveles de Evaluación

### Nivel 1: Básico (Fácil de implementar)
- ✅ Comparar alturas de notas (pitch)
- ✅ Contar notas correctas vs incorrectas
- ✅ Porcentaje de aciertos

### Nivel 2: Intermedio
- ✅ Comparar duraciones (ritmo)
- ✅ Detectar notas faltantes/extra
- ✅ Tolerancia para enharmónicos

### Nivel 3: Avanzado (Requiere más trabajo)
- ✅ Análisis de intervalos
- ✅ Análisis armónico
- ✅ Detección de errores de escritura (clave, armadura)

## 🎨 Diseño de UI

```
┌─────────────────────────────────────────┐
│  Partitura Original (Solo Lectura)      │
│  [Mostrar MusicXML original]            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Editor de Transposición                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Nota    │ │ Duración│ │ Alter.  │  │
│  │ [Do]    │ │ [Negra] │ │ [♯] [♭] │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│                                         │
│  [Canvas con VexFlow - Click para      │
│   agregar notas, drag para mover]      │
│                                         │
│  [Deshacer] [Rehacer] [Limpiar]        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  [Botón: Evaluar Transposición]        │
└─────────────────────────────────────────┘
```

## 🚀 Implementación Paso a Paso

### Paso 1: Crear componente básico de editor
```typescript
// frontend/src/components/notation/NotationEditor.tsx
- Usar VexFlow para renderizar pentagrama
- Agregar notas con click
- Guardar como MusicXML
```

### Paso 2: Integrar con pregunta de transposición
```typescript
// Modificar TranspositionAnswer.tsx
- Cargar partitura original
- Mostrar editor abajo
- Guardar respuesta como MusicXML
```

### Paso 3: Crear función de evaluación
```typescript
// frontend/src/lib/notation/evaluator.ts
- Comparar MusicXML
- Calcular score
- Generar feedback
```

### Paso 4: Mostrar resultados
```typescript
// Componente de resultados
- Visualizar errores en partitura
- Mostrar estadísticas
- Permitir corrección
```

## ⚠️ Consideraciones

### Ventajas
- ✅ Evaluación automática rápida
- ✅ Feedback inmediato para estudiantes
- ✅ Reduce carga de trabajo del profesor
- ✅ Objetivo y consistente

### Desafíos
- ⚠️ MusicXML puede ser complejo de parsear
- ⚠️ Alineación temporal de notas (sincronización)
- ⚠️ Tolerancia para diferentes formas de escribir lo mismo
- ⚠️ Errores de escritura vs errores de transposición

### Soluciones
- Usar librerías probadas (musicxml-interfaces)
- Normalizar antes de comparar
- Permitir evaluación manual como fallback
- Opción de "evaluación asistida" (sugiere errores, profesor confirma)

## 📦 Dependencias a Agregar

```bash
cd frontend
npm install musicxml-interfaces @tonejs/midi
# Opcional para análisis avanzado:
npm install musicxml-js
```

## 🎯 Resultado Esperado

1. **Estudiante ve partitura original**
2. **Escribe transposición en editor visual**
3. **Sistema evalúa automáticamente**:
   - "17/20 notas correctas (85%)"
   - Muestra errores en rojo
   - Indica qué se esperaba
4. **Profesor puede revisar y ajustar** si es necesario

## 🔄 Próximos Pasos

1. ✅ Crear componente básico de editor con VexFlow
2. ✅ Integrar con pregunta de transposición
3. ✅ Implementar guardado como MusicXML
4. ✅ Crear función de comparación básica
5. ✅ Agregar visualización de resultados
6. ✅ Mejorar algoritmo de evaluación

¿Quieres que empecemos con la Fase 1 (Editor básico)?



