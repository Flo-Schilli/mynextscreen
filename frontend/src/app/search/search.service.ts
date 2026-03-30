import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SearchResults } from './search.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private http = inject(HttpClient);

  search(query: string): Observable<SearchResults> {
    return this.http.get<SearchResults>('/api/search', {
      params: { q: query },
    });
  }
}
