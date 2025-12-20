const { evaluateTransposition } = require('../services/notationService');

class NotationController {
  /**
   * Evaluate transposition answer
   * POST /api/notation/evaluate-transposition
   */
  async evaluateTransposition(req, res) {
    try {
      const { questionId, studentMusicXML, referenceMusicXML, transpositionSemitones } = req.body;

      if (!questionId || !studentMusicXML) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: questionId and studentMusicXML'
        });
      }

      // If referenceMusicXML is not provided, fetch from question
      let referenceXML = referenceMusicXML;
      if (!referenceXML) {
        // TODO: Fetch reference answer from question if not provided
        // For now, require it in the request
        return res.status(400).json({
          success: false,
          error: 'referenceMusicXML is required'
        });
      }

      const transposition = transpositionSemitones || 0;

      // Evaluate the transposition
      const result = await evaluateTransposition(
        referenceXML,
        studentMusicXML,
        transposition
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error evaluating transposition:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new NotationController();



