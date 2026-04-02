import { validate } from 'class-validator';
import { Content } from './content.entity';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';

function createContent(overrides: Partial<Content> = {}): Content {
  const content = new Content();
  content.organisationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  content.title = 'Welcome Banner';
  content.description = null;
  content.tags = ['welcome', 'banner'];
  content.type = ContentType.Image;
  content.originalFilename = 'banner.png';
  content.originalMimeType = 'image/png';
  content.originalSizeBytes = 1024000;
  content.transcodedSizeBytes = null;
  content.durationSeconds = null;
  content.transcodingStatus = TranscodingStatus.Pending;
  content.transcodingError = null;
  Object.assign(content, overrides);
  return content;
}

describe('Content entity validation', () => {
  it('should pass validation with valid data', async () => {
    const content = createContent();
    const errors = await validate(content);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when title is empty', async () => {
    const content = createContent({ title: '' });
    const errors = await validate(content);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('should fail validation when organisationId is empty', async () => {
    const content = createContent({ organisationId: '' });
    const errors = await validate(content);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'organisationId')).toBe(true);
  });

  it('should fail validation with invalid content type', async () => {
    const content = createContent({ type: 'audio' as ContentType });
    const errors = await validate(content);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'type')).toBe(true);
  });

  it('should fail validation with invalid transcoding status', async () => {
    const content = createContent({
      transcodingStatus: 'unknown' as TranscodingStatus,
    });
    const errors = await validate(content);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'transcodingStatus')).toBe(true);
  });

  it('should pass validation with description set', async () => {
    const content = createContent({ description: 'A welcome banner image' });
    const errors = await validate(content);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with empty tags array', async () => {
    const content = createContent({ tags: [] });
    const errors = await validate(content);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when originalFilename is empty', async () => {
    const content = createContent({ originalFilename: '' });
    const errors = await validate(content);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'originalFilename')).toBe(true);
  });

  it('should fail validation when originalMimeType is empty', async () => {
    const content = createContent({ originalMimeType: '' });
    const errors = await validate(content);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'originalMimeType')).toBe(true);
  });

  it('should fail validation when originalSizeBytes is negative', async () => {
    const content = createContent({ originalSizeBytes: -1 });
    const errors = await validate(content);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'originalSizeBytes')).toBe(true);
  });

  it('should pass validation with all transcoding status values', async () => {
    for (const status of Object.values(TranscodingStatus)) {
      const content = createContent({ transcodingStatus: status });
      const errors = await validate(content);
      expect(errors).toHaveLength(0);
    }
  });

  it('should pass validation with video type', async () => {
    const content = createContent({
      type: ContentType.Video,
      originalFilename: 'intro.mp4',
      originalMimeType: 'video/mp4',
    });
    const errors = await validate(content);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with transcodedSizeBytes set', async () => {
    const content = createContent({
      transcodedSizeBytes: 512000,
      transcodingStatus: TranscodingStatus.Completed,
    });
    const errors = await validate(content);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with transcodingError set', async () => {
    const content = createContent({
      transcodingStatus: TranscodingStatus.Failed,
      transcodingError: 'FFmpeg process exited with code 1',
    });
    const errors = await validate(content);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with durationSeconds set', async () => {
    const content = createContent({ durationSeconds: 58 });
    const errors = await validate(content);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation with durationSeconds null', async () => {
    const content = createContent({ durationSeconds: null });
    const errors = await validate(content);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation with negative durationSeconds', async () => {
    const content = createContent({ durationSeconds: -1 });
    const errors = await validate(content);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'durationSeconds')).toBe(true);
  });
});
