import { Organisation } from '../organisation/organisation.entity';
import { ContentType } from './content-type.enum';
import { TranscodingStatus } from './transcoding-status.enum';
export declare class Content {
    id: string;
    organisationId: string;
    organisation: Organisation;
    title: string;
    description: string | null;
    tags: string[];
    type: ContentType;
    originalFilename: string;
    originalMimeType: string;
    originalSizeBytes: number;
    transcodedSizeBytes: number | null;
    transcodingStatus: TranscodingStatus;
    transcodingError: string | null;
    createdAt: Date;
    updatedAt: Date;
}
