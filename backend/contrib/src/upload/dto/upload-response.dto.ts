/**
 * DTO for file upload response
 */
export class UploadResponseDto {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  url: string;

  constructor(filename: string, path: string, size: number, mimetype: string) {
    this.filename = filename;
    this.path = path;
    this.size = size;
    this.mimetype = mimetype;
    this.url = `/uploads/${filename}`;
  }
}
