const supabaseAdmin = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

class StorageService {
  /**
   * Upload audio file for listening questions
   */
  async uploadAudioFile(file, questionId) {
    try {
      const fileName = `${questionId}/${uuidv4()}-${file.originalname}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('audio-files')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('audio-files')
        .getPublicUrl(fileName);

      return { 
        path: fileName, 
        url: publicUrl,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      console.error('Error uploading audio file:', error);
      throw new Error('Failed to upload audio file');
    }
  }

  /**
   * Upload notation file (PDF, MusicXML) for transposition/orchestration questions
   */
  async uploadNotationFile(file, questionId) {
    try {
      const fileName = `${questionId}/${uuidv4()}-${file.originalname}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('notation-files')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('notation-files')
        .getPublicUrl(fileName);

      return { 
        path: fileName, 
        url: publicUrl,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      console.error('Error uploading notation file:', error);
      throw new Error('Failed to upload notation file');
    }
  }

  /**
   * Upload student submission file
   */
  async uploadStudentSubmission(file, attemptId, questionId, userId) {
    try {
      const fileName = `${userId}/${attemptId}/${questionId}/${uuidv4()}-${file.originalname}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('student-submissions')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) throw error;

      return { 
        path: fileName,
        size: file.size,
        mimeType: file.mimetype
      };
    } catch (error) {
      console.error('Error uploading student submission:', error);
      throw new Error('Failed to upload student submission');
    }
  }

  /**
   * Upload institution logo or asset
   */
  async uploadInstitutionAsset(file, institutionId) {
    try {
      const fileName = `${institutionId}/${uuidv4()}-${file.originalname}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('institution-assets')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('institution-assets')
        .getPublicUrl(fileName);

      return { 
        path: fileName, 
        url: publicUrl 
      };
    } catch (error) {
      console.error('Error uploading institution asset:', error);
      throw new Error('Failed to upload institution asset');
    }
  }

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(bucket, path, expiresIn = 3600) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw new Error('Failed to create signed URL');
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket, path) {
    try {
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Delete multiple files from storage
   */
  async deleteFiles(bucket, paths) {
    try {
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .remove(paths);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting files:', error);
      throw new Error('Failed to delete files');
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(bucket, path = '') {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(path);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }
}

module.exports = new StorageService();

