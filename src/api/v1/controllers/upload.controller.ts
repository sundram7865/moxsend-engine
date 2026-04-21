import type { Request, Response, NextFunction } from 'express';
import { handleUpload } from '@/modules/outreach/outreach.service';

export async function uploadCSV(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      const err = Object.assign(new Error('No CSV file attached. Send the file as multipart form-data with key "file".'), {
        code: 'NO_FILE',
      });
      return next(err);
    }

    const result = await handleUpload(req.file.buffer);

    res.status(202).json(result.response);
  } catch (err) {
    next(err);
  }
}