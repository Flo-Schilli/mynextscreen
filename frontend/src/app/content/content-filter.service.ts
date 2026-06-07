import { Injectable } from '@angular/core';
import { Content } from './content.model';

/**
 * Pure content list helpers: deriving the available tag set and applying the
 * type/tag filters. Extracted verbatim from the content-library component to
 * keep the filtering logic unit-testable.
 */
@Injectable({ providedIn: 'root' })
export class ContentFilterService {
  /** Sorted, de-duplicated set of every tag present across the given content. */
  extractTags(contents: readonly Content[]): string[] {
    const tagSet = new Set<string>();
    contents.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }

  /**
   * Filters content by optional type and by tags (an item matches if it carries
   * at least one of the selected tags). Returns a new array; the input is not
   * mutated.
   */
  filterContents(
    contents: readonly Content[],
    type: string | undefined,
    tags: readonly string[],
  ): Content[] {
    let filtered = contents.slice();
    if (type) {
      filtered = filtered.filter((c) => c.type === type);
    }
    if (tags.length > 0) {
      filtered = filtered.filter((c) => tags.some((t) => c.tags.includes(t)));
    }
    return filtered;
  }
}
