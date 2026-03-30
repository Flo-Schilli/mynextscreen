import { Component, inject, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ScheduleService } from './schedule.service';
import { ScheduleEntry, CreateScheduleEntryRequest, UpdateScheduleEntryRequest } from './schedule.model';
import { ScreenService } from '../screens/screen.service';
import { Screen } from '../screens/screen.model';
import { PlaylistService } from '../playlists/playlist.service';
import { Playlist } from '../playlists/playlist.model';
import { MemberService } from '../settings/users/member.service';
import { MyMembership } from '../settings/users/member.model';
import { OrganisationService } from '../admin/organisations/organisation.service';

interface CalendarBlock {
  entry: ScheduleEntry;
  top: number;
  height: number;
  dayIndex: number;
  isRecurring: boolean;
  occurrenceStart: Date;
  occurrenceEnd: Date;
}

interface GapBlock {
  top: number;
  height: number;
  dayIndex: number;
}

interface DayTimeline {
  playlistName: string;
  colour: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
}

const HOUR_HEIGHT = 60;
const PRESET_COLOURS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
];

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">&#8592; Back</button>
          <h1>Schedules</h1>
        </div>
      </header>

      @if (loadError) {
        <p class="error">{{ loadError }}</p>
      }

      @if (loading) {
        <p class="loading-text">Loading...</p>
      }

      @if (!loading && !loadError) {
        <!-- Screen Selector -->
        <div class="toolbar">
          <div class="screen-selector">
            <label for="screenSelect">Screen:</label>
            <select
              id="screenSelect"
              [(ngModel)]="selectedScreenId"
              (ngModelChange)="onScreenChange()"
              name="screenSelect"
            >
              @for (screen of screens; track screen.id) {
                <option [value]="screen.id">{{ screen.name }}</option>
              }
            </select>
          </div>

          <div class="view-buttons">
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'day'"
              (click)="setView('day')"
            >Day</button>
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'week'"
              (click)="setView('week')"
            >Week</button>
            <button
              class="toggle-btn"
              [class.active]="viewMode === 'month'"
              (click)="setView('month')"
            >Month</button>
          </div>

          <div class="nav-buttons">
            <button class="btn btn-secondary btn-sm" (click)="navigatePrev()">&#8592;</button>
            <button class="btn btn-secondary btn-sm" (click)="navigateToday()">Today</button>
            <button class="btn btn-secondary btn-sm" (click)="navigateNext()">&#8594;</button>
            <span class="current-range">{{ currentRangeLabel }}</span>
          </div>

          <button class="btn btn-primary" (click)="openCreateModal()">+ Schedule</button>
        </div>

        <div class="calendar-layout">
          <!-- Calendar Grid -->
          <div class="calendar-container">
            @if (viewMode === 'month') {
              <!-- Month View -->
              <div class="month-grid">
                <div class="month-header-row">
                  @for (dayName of weekdayNames; track dayName) {
                    <div class="month-header-cell">{{ dayName }}</div>
                  }
                </div>
                @for (week of monthWeeks; track $index) {
                  <div class="month-week-row">
                    @for (day of week; track $index) {
                      <div
                        class="month-day-cell"
                        [class.other-month]="!day.isCurrentMonth"
                        [class.today]="day.isToday"
                        (click)="onMonthDayClick(day.date)"
                        role="button"
                        tabindex="0"
                        (keydown.enter)="onMonthDayClick(day.date)"
                      >
                        <span class="month-day-number">{{ day.dayNumber }}</span>
                        <div class="month-day-entries">
                          @for (block of day.blocks; track block.entry.id) {
                            <div
                              class="month-entry-chip"
                              [style.background]="block.entry.colour"
                              [title]="block.entry.playlist?.name || 'Playlist'"
                            >
                              @if (block.isRecurring) {
                                <span class="repeat-icon">&#8634;</span>
                              }
                              {{ block.entry.playlist?.name || 'Playlist' }}
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            } @else {
              <!-- Day / Week View -->
              <div class="time-grid" #timeGrid>
                <div class="time-grid-header">
                  <div class="time-gutter-header"></div>
                  @for (day of visibleDays; track $index) {
                    <div class="day-column-header" [class.today]="isDayToday(day)">
                      <span class="day-name">{{ formatDayHeader(day) }}</span>
                    </div>
                  }
                </div>
                <div class="time-grid-body" (click)="onTimeGridClick($event)" (keydown.enter)="$event.preventDefault()" role="grid" tabindex="0">
                  <div class="time-gutter">
                    @for (hour of hours; track hour) {
                      <div class="time-label" [style.height.px]="hourHeight">
                        {{ formatHour(hour) }}
                      </div>
                    }
                  </div>
                  <div class="day-columns">
                    @for (day of visibleDays; track $index; let dayIdx = $index) {
                      <div class="day-column" [attr.data-day-index]="dayIdx">
                        @for (hour of hours; track hour) {
                          <div class="hour-slot" [style.height.px]="hourHeight"></div>
                        }
                        <!-- Gap indicators -->
                        @for (gap of getGapsForDay(dayIdx); track $index) {
                          <div
                            class="gap-indicator"
                            [style.top.px]="gap.top"
                            [style.height.px]="gap.height"
                          >
                            <span class="gap-label">Fallback playlist</span>
                          </div>
                        }
                        <!-- Schedule blocks -->
                        @for (block of getBlocksForDay(dayIdx); track block.entry.id) {
                          <div
                            class="schedule-block"
                            [style.top.px]="block.top"
                            [style.height.px]="block.height"
                            [style.background]="block.entry.colour"
                            [class.dragging]="dragState?.entryId === block.entry.id"
                            (mousedown)="onBlockMouseDown($event, block)"
                            (click)="onBlockClick($event, block)"
                            (keydown.enter)="openEditModal(block.entry)"
                            role="button"
                            tabindex="0"
                          >
                            <div
                              class="resize-handle resize-handle-top"
                              (mousedown)="onResizeMouseDown($event, block, 'top')"
                              (keydown.enter)="$event.preventDefault()"
                              role="separator"
                              tabindex="0"
                              aria-label="Resize top"
                              aria-valuenow="0"
                            ></div>
                            <div class="block-content">
                              @if (block.isRecurring) {
                                <span class="repeat-icon">&#8634;</span>
                              }
                              <span class="block-title">{{ block.entry.playlist?.name || 'Playlist' }}</span>
                              <span class="block-time">
                                {{ formatBlockTime(block.occurrenceStart) }} - {{ formatBlockTime(block.occurrenceEnd) }}
                              </span>
                            </div>
                            <div
                              class="resize-handle resize-handle-bottom"
                              (mousedown)="onResizeMouseDown($event, block, 'bottom')"
                              (keydown.enter)="$event.preventDefault()"
                              role="separator"
                              tabindex="0"
                              aria-label="Resize bottom"
                              aria-valuenow="0"
                            ></div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Side Panel -->
          <div class="side-panel">
            <h3>{{ formatSidePanelDate(selectedDate) }}</h3>
            @if (dayTimeline.length === 0) {
              <p class="empty-text">No schedule entries for this day.</p>
            }
            @for (item of dayTimeline; track $index) {
              <div class="timeline-item">
                <div class="timeline-colour" [style.background]="item.colour"></div>
                <div class="timeline-info">
                  <span class="timeline-name">
                    {{ item.playlistName }}
                    @if (item.isRecurring) {
                      <span class="repeat-icon-sm">&#8634;</span>
                    }
                  </span>
                  <span class="timeline-time">{{ item.startTime }} - {{ item.endTime }}</span>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Toast -->
      @if (toastMessage) {
        <div class="toast" [class.toast-error]="toastType === 'error'" [class.toast-success]="toastType === 'success'">
          {{ toastMessage }}
        </div>
      }

      <!-- Create / Edit Modal -->
      @if (showModal) {
        <div
          class="modal-overlay"
          (click)="closeModal()"
          role="dialog"
          tabindex="-1"
          (keydown.escape)="closeModal()"
        >
          <div class="modal" (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()" role="document" tabindex="0">
            <h2>{{ editingEntry ? 'Edit Schedule Entry' : 'Create Schedule Entry' }}</h2>
            <form (ngSubmit)="submitModal()">
              <div class="form-group">
                <label for="modalPlaylist">Playlist</label>
                <select
                  id="modalPlaylist"
                  [(ngModel)]="modalPlaylistId"
                  name="modalPlaylist"
                  required
                >
                  <option value="" disabled>Select a playlist</option>
                  @for (p of playlists; track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="modalStartDate">Start Date</label>
                  <input
                    id="modalStartDate"
                    type="date"
                    [(ngModel)]="modalStartDate"
                    name="modalStartDate"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="modalStartTime">Start Time</label>
                  <input
                    id="modalStartTime"
                    type="time"
                    [(ngModel)]="modalStartTime"
                    name="modalStartTime"
                    required
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="modalEndDate">End Date</label>
                  <input
                    id="modalEndDate"
                    type="date"
                    [(ngModel)]="modalEndDate"
                    name="modalEndDate"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="modalEndTime">End Time</label>
                  <input
                    id="modalEndTime"
                    type="time"
                    [(ngModel)]="modalEndTime"
                    name="modalEndTime"
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="modalColourCustom">Colour</label>
                <div class="colour-picker">
                  @for (c of presetColours; track c) {
                    <button
                      type="button"
                      class="colour-swatch"
                      [style.background]="c"
                      [class.selected]="modalColour === c"
                      (click)="modalColour = c"
                      [attr.aria-label]="'Select colour ' + c"
                    >&nbsp;</button>
                  }
                  <input
                    id="modalColourCustom"
                    type="color"
                    [(ngModel)]="modalColour"
                    name="modalColourCustom"
                    class="colour-input"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="modalRecurrence">Recurrence</label>
                <select
                  id="modalRecurrence"
                  [(ngModel)]="modalRecurrence"
                  name="modalRecurrence"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="weekdays">Specific weekdays</option>
                </select>
              </div>

              @if (modalRecurrence === 'weekdays') {
                <div class="form-group">
                  <span id="weekdayLabel" class="form-label-text">Days</span>
                  <div class="weekday-checkboxes">
                    @for (wd of weekdayOptions; track wd.value) {
                      <label class="weekday-checkbox">
                        <input
                          type="checkbox"
                          [checked]="modalWeekdays.includes(wd.value)"
                          (change)="toggleWeekday(wd.value)"
                        />
                        {{ wd.label }}
                      </label>
                    }
                  </div>
                </div>
              }

              @if (modalError) {
                <p class="error">{{ modalError }}</p>
              }
              <div class="form-actions">
                @if (editingEntry) {
                  <button type="button" class="btn btn-danger" (click)="deleteEntry()">Delete</button>
                }
                <div class="form-actions-right">
                  <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                  <button type="submit" class="btn btn-primary" [disabled]="submitting">
                    {{ submitting ? 'Saving...' : (editingEntry ? 'Update' : 'Create') }}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh;
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      padding: 2rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .header-left h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    .back-btn {
      background: none;
      border: none;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
    .back-btn:hover {
      color: var(--color-text-primary);
      background: var(--color-bg-secondary);
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }
    .screen-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .screen-selector label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
    .screen-selector select,
    .form-group select {
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
    }
    .view-buttons {
      display: flex;
      gap: 0.25rem;
    }
    .toggle-btn {
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid var(--color-border);
      background: transparent;
      color: var(--color-text-secondary);
      cursor: pointer;
      font-size: 0.8125rem;
      transition: all 0.15s;
    }
    .toggle-btn:hover {
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }
    .toggle-btn.active {
      background: var(--color-accent);
      color: #fff;
      border-color: var(--color-accent);
    }
    .nav-buttons {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .current-range {
      font-size: 0.875rem;
      font-weight: 500;
      min-width: 10rem;
    }

    /* Buttons */
    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.15s;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { padding: 0.325rem 0.75rem; font-size: 0.8125rem; }
    .btn-primary { background: var(--color-accent); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--color-accent-hover); }
    .btn-secondary { background: var(--color-bg-tertiary); color: var(--color-text-primary); }
    .btn-secondary:hover:not(:disabled) { background: var(--color-border); }
    .btn-danger { background: #991b1b; color: #fecaca; }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; }

    /* Calendar Layout */
    .calendar-layout {
      display: flex;
      gap: 1rem;
    }
    .calendar-container {
      flex: 1;
      min-width: 0;
    }

    /* Time Grid (Day/Week) */
    .time-grid {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .time-grid-header {
      display: flex;
      border-bottom: 1px solid var(--color-border);
    }
    .time-gutter-header {
      width: 3.5rem;
      flex-shrink: 0;
    }
    .day-column-header {
      flex: 1;
      text-align: center;
      padding: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      border-left: 1px solid var(--color-border);
    }
    .day-column-header.today {
      color: var(--color-accent);
      font-weight: 600;
    }
    .time-grid-body {
      display: flex;
      max-height: calc(100vh - 14rem);
      overflow-y: auto;
      position: relative;
    }
    .time-gutter {
      width: 3.5rem;
      flex-shrink: 0;
    }
    .time-label {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
      text-align: right;
      padding-right: 0.5rem;
      box-sizing: border-box;
      position: relative;
      top: -0.5em;
    }
    .day-columns {
      display: flex;
      flex: 1;
    }
    .day-column {
      flex: 1;
      position: relative;
      border-left: 1px solid var(--color-border);
    }
    .hour-slot {
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
      box-sizing: border-box;
    }

    /* Schedule Blocks */
    .schedule-block {
      position: absolute;
      left: 2px;
      right: 2px;
      border-radius: 0.25rem;
      cursor: grab;
      z-index: 2;
      overflow: hidden;
      min-height: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      transition: box-shadow 0.15s;
      user-select: none;
    }
    .schedule-block:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      z-index: 3;
    }
    .schedule-block.dragging {
      opacity: 0.7;
      cursor: grabbing;
      z-index: 10;
    }
    .block-content {
      padding: 0.25rem 0.375rem;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      height: 100%;
      box-sizing: border-box;
    }
    .block-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .block-time {
      font-size: 0.625rem;
      color: rgba(255,255,255,0.85);
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }
    .repeat-icon {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.9);
      margin-right: 0.125rem;
    }
    .repeat-icon-sm {
      font-size: 0.625rem;
      color: var(--color-text-muted);
    }

    /* Resize Handles */
    .resize-handle {
      position: absolute;
      left: 0;
      right: 0;
      height: 6px;
      cursor: ns-resize;
      z-index: 5;
    }
    .resize-handle-top { top: 0; }
    .resize-handle-bottom { bottom: 0; }

    /* Gap Indicators */
    .gap-indicator {
      position: absolute;
      left: 2px;
      right: 2px;
      background: rgba(251, 191, 36, 0.08);
      border: 1px dashed rgba(251, 191, 36, 0.25);
      border-radius: 0.25rem;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .gap-label {
      font-size: 0.625rem;
      color: rgba(251, 191, 36, 0.6);
      font-style: italic;
    }

    /* Month View */
    .month-grid {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .month-header-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid var(--color-border);
    }
    .month-header-cell {
      padding: 0.5rem;
      text-align: center;
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }
    .month-week-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
    }
    .month-day-cell {
      min-height: 5rem;
      padding: 0.25rem;
      border-bottom: 1px solid var(--color-border);
      border-right: 1px solid var(--color-border);
      cursor: pointer;
      transition: background 0.15s;
    }
    .month-day-cell:nth-child(7n) { border-right: none; }
    .month-day-cell:hover { background: var(--color-bg-tertiary); }
    .month-day-cell.other-month { opacity: 0.4; }
    .month-day-cell.today .month-day-number {
      background: var(--color-accent);
      color: #fff;
      border-radius: 9999px;
      width: 1.5rem;
      height: 1.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .month-day-number {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      display: inline-block;
      margin-bottom: 0.125rem;
    }
    .month-day-entries {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .month-entry-chip {
      font-size: 0.625rem;
      color: #fff;
      padding: 0.0625rem 0.25rem;
      border-radius: 0.125rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    /* Side Panel */
    .side-panel {
      width: 16rem;
      flex-shrink: 0;
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1rem;
      max-height: calc(100vh - 14rem);
      overflow-y: auto;
    }
    .side-panel h3 {
      margin: 0 0 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .timeline-item {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border);
    }
    .timeline-item:last-child { border-bottom: none; }
    .timeline-colour {
      width: 0.25rem;
      border-radius: 0.125rem;
      flex-shrink: 0;
    }
    .timeline-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;
    }
    .timeline-name {
      font-size: 0.8125rem;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .timeline-time {
      font-size: 0.6875rem;
      color: var(--color-text-muted);
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--color-bg-secondary);
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      padding: 1.5rem;
      min-width: 28rem;
      max-width: 36rem;
    }
    .modal h2 {
      margin: 0 0 1.25rem;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--color-bg-primary);
      border: 1px solid var(--color-border);
      border-radius: 0.375rem;
      color: var(--color-text-primary);
      font-size: 0.875rem;
      box-sizing: border-box;
    }
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--color-accent);
    }
    .form-row {
      display: flex;
      gap: 0.75rem;
    }
    .form-row .form-group { flex: 1; }
    .form-label-text {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
    .form-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1.25rem;
    }
    .form-actions-right {
      display: flex;
      gap: 0.75rem;
      margin-left: auto;
    }

    /* Colour Picker */
    .colour-picker {
      display: flex;
      gap: 0.375rem;
      flex-wrap: wrap;
      align-items: center;
    }
    .colour-swatch {
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 0.25rem;
      border: 2px solid transparent;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .colour-swatch:hover { border-color: var(--color-text-muted); }
    .colour-swatch.selected { border-color: #fff; box-shadow: 0 0 0 1px var(--color-accent); }
    .colour-input {
      width: 2rem !important;
      height: 1.5rem;
      padding: 0 !important;
      border: 1px solid var(--color-border) !important;
      border-radius: 0.25rem;
      cursor: pointer;
      background: transparent !important;
    }

    /* Weekday Checkboxes */
    .weekday-checkboxes {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .weekday-checkbox {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      color: var(--color-text-primary);
      cursor: pointer;
    }
    .weekday-checkbox input[type="checkbox"] {
      width: auto;
      accent-color: var(--color-accent);
    }

    /* Toast */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 0.75rem 1.25rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      z-index: 2000;
      animation: toast-in 0.3s ease;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .toast-error {
      background: #991b1b;
      color: #fecaca;
      border: 1px solid #b91c1c;
    }
    .toast-success {
      background: #166534;
      color: #bbf7d0;
      border: 1px solid #22c55e;
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(1rem); }
      to { opacity: 1; transform: translateY(0); }
    }

    .empty-text {
      color: var(--color-text-muted);
      font-size: 0.8125rem;
    }
    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .loading-text {
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
  `,
})
export class Schedules implements OnInit, OnDestroy {
  @ViewChild('timeGrid', { static: false }) timeGridRef!: ElementRef;

  private scheduleService = inject(ScheduleService);
  private screenService = inject(ScreenService);
  private playlistService = inject(PlaylistService);
  private memberService = inject(MemberService);
  private organisationService = inject(OrganisationService);
  private router = inject(Router);

  orgId = '';
  orgTimeZone = 'UTC';
  loading = true;
  loadError = '';

  screens: Screen[] = [];
  playlists: Playlist[] = [];
  entries: ScheduleEntry[] = [];
  selectedScreenId = '';

  viewMode: 'day' | 'week' | 'month' = 'week';
  currentDate = new Date();
  selectedDate = new Date();

  hours = Array.from({ length: 24 }, (_, i) => i);
  hourHeight = HOUR_HEIGHT;
  presetColours = PRESET_COLOURS;
  weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  weekdayOptions = [
    { value: 'MO', label: 'Mon' },
    { value: 'TU', label: 'Tue' },
    { value: 'WE', label: 'Wed' },
    { value: 'TH', label: 'Thu' },
    { value: 'FR', label: 'Fri' },
    { value: 'SA', label: 'Sat' },
    { value: 'SU', label: 'Sun' },
  ];

  // Computed calendar data
  calendarBlocks: CalendarBlock[] = [];
  gapBlocks: GapBlock[] = [];
  monthWeeks: { date: Date; dayNumber: number; isCurrentMonth: boolean; isToday: boolean; blocks: CalendarBlock[] }[][] = [];
  dayTimeline: DayTimeline[] = [];

  // Modal state
  showModal = false;
  editingEntry: ScheduleEntry | null = null;
  modalPlaylistId = '';
  modalStartDate = '';
  modalStartTime = '';
  modalEndDate = '';
  modalEndTime = '';
  modalColour = PRESET_COLOURS[0];
  modalRecurrence = 'none';
  modalWeekdays: string[] = [];
  modalError = '';
  submitting = false;

  // Drag state
  dragState: { entryId: string; startY: number; originalTop: number; block: CalendarBlock } | null = null;
  resizeState: { entryId: string; edge: 'top' | 'bottom'; startY: number; block: CalendarBlock; originalTop: number; originalHeight: number } | null = null;

  // Toast
  toastMessage = '';
  toastType: 'error' | 'success' = 'error';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Bound handlers for mouse events
  private boundMouseMove = this.onMouseMove.bind(this);
  private boundMouseUp = this.onMouseUp.bind(this);

  get visibleDays(): Date[] {
    if (this.viewMode === 'day') {
      return [new Date(this.currentDate)];
    }
    // week
    const start = this.getWeekStart(this.currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  get currentRangeLabel(): string {
    const opts: Intl.DateTimeFormatOptions = { timeZone: this.orgTimeZone };
    if (this.viewMode === 'day') {
      return this.currentDate.toLocaleDateString(undefined, { ...opts, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (this.viewMode === 'week') {
      const days = this.visibleDays;
      const first = days[0];
      const last = days[6];
      const fmtStart = first.toLocaleDateString(undefined, { ...opts, month: 'short', day: 'numeric' });
      const fmtEnd = last.toLocaleDateString(undefined, { ...opts, month: 'short', day: 'numeric', year: 'numeric' });
      return `${fmtStart} - ${fmtEnd}`;
    }
    return this.currentDate.toLocaleDateString(undefined, { ...opts, month: 'long', year: 'numeric' });
  }

  ngOnInit(): void {
    this.loadCurrentOrg();
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private loadCurrentOrg(): void {
    this.memberService.getMyMemberships().subscribe({
      next: (memberships: MyMembership[]) => {
        const adminMembership = memberships.find((m) => m.role === 'org_admin');
        if (adminMembership) {
          this.orgId = adminMembership.organisationId;
        } else if (memberships.length > 0) {
          this.orgId = memberships[0].organisationId;
        } else {
          this.loadError = 'You are not a member of any organisation.';
          this.loading = false;
          return;
        }
        this.loadOrgDetails();
        this.loadScreens();
        this.loadPlaylists();
      },
      error: () => {
        this.loadError = 'Failed to load organisation context.';
        this.loading = false;
      },
    });
  }

  private loadOrgDetails(): void {
    this.organisationService.getOne(this.orgId).subscribe({
      next: (org) => {
        this.orgTimeZone = org.timeZone || 'UTC';
      },
      error: () => {
        // Fall back to UTC
      },
    });
  }

  private loadScreens(): void {
    this.screenService.getAll(this.orgId).subscribe({
      next: (screens) => {
        this.screens = screens;
        if (screens.length > 0) {
          this.selectedScreenId = screens[0].id;
          this.loadEntries();
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.loadError = 'Failed to load screens.';
        this.loading = false;
      },
    });
  }

  private loadPlaylists(): void {
    this.playlistService.getAll(this.orgId).subscribe({
      next: (playlists) => {
        this.playlists = playlists;
      },
    });
  }

  loadEntries(): void {
    if (!this.selectedScreenId) return;
    const range = this.getQueryRange();
    this.scheduleService.getByScreen(this.orgId, this.selectedScreenId, range.from, range.to).subscribe({
      next: (entries) => {
        this.entries = entries;
        this.loading = false;
        this.rebuildCalendar();
      },
      error: () => {
        this.loadError = 'Failed to load schedule entries.';
        this.loading = false;
      },
    });
  }

  private getQueryRange(): { from: string; to: string } {
    if (this.viewMode === 'day') {
      const start = new Date(this.currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    if (this.viewMode === 'week') {
      const start = this.getWeekStart(this.currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    // month: fetch wider range
    const start = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    start.setDate(start.getDate() - 7);
    const end = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 7);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  private rebuildCalendar(): void {
    if (this.viewMode === 'month') {
      this.buildMonthView();
    } else {
      this.buildTimeGridBlocks();
    }
    this.buildDayTimeline();
  }

  private buildTimeGridBlocks(): void {
    const days = this.visibleDays;
    this.calendarBlocks = [];
    this.gapBlocks = [];

    for (let dayIdx = 0; dayIdx < days.length; dayIdx++) {
      const dayStart = new Date(days[dayIdx]);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayBlocks: CalendarBlock[] = [];

      for (const entry of this.entries) {
        const occurrences = this.getEntryOccurrencesOnDay(entry, dayStart);
        for (const occ of occurrences) {
          const clippedStart = occ.start < dayStart ? dayStart : occ.start;
          const clippedEnd = occ.end > dayEnd ? dayEnd : occ.end;

          const startMinutes = clippedStart.getHours() * 60 + clippedStart.getMinutes();
          const endMinutes = clippedEnd.getHours() * 60 + clippedEnd.getMinutes();
          const top = (startMinutes / 60) * this.hourHeight;
          const height = Math.max(((endMinutes - startMinutes) / 60) * this.hourHeight, 20);

          const block: CalendarBlock = {
            entry,
            top,
            height,
            dayIndex: dayIdx,
            isRecurring: !!entry.rrule,
            occurrenceStart: clippedStart,
            occurrenceEnd: clippedEnd,
          };
          dayBlocks.push(block);
          this.calendarBlocks.push(block);
        }
      }

      // Build gaps
      const sorted = [...dayBlocks].sort((a, b) => a.top - b.top);
      let lastEnd = 0;
      const dayHeight = 24 * this.hourHeight;
      for (const block of sorted) {
        if (block.top > lastEnd + 5) {
          this.gapBlocks.push({ top: lastEnd, height: block.top - lastEnd, dayIndex: dayIdx });
        }
        lastEnd = Math.max(lastEnd, block.top + block.height);
      }
      if (lastEnd < dayHeight - 5) {
        this.gapBlocks.push({ top: lastEnd, height: dayHeight - lastEnd, dayIndex: dayIdx });
      }
    }
  }

  private buildMonthView(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);

    // Find Monday of the first week
    const start = new Date(firstOfMonth);
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diff);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.monthWeeks = [];
    const current = new Date(start);

    for (let w = 0; w < 6; w++) {
      const week: { date: Date; dayNumber: number; isCurrentMonth: boolean; isToday: boolean; blocks: CalendarBlock[] }[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(current);
        const dayStart = new Date(cellDate);
        dayStart.setHours(0, 0, 0, 0);

        const blocks: CalendarBlock[] = [];
        for (const entry of this.entries) {
          const occurrences = this.getEntryOccurrencesOnDay(entry, dayStart);
          for (const occ of occurrences) {
            blocks.push({
              entry,
              top: 0,
              height: 0,
              dayIndex: d,
              isRecurring: !!entry.rrule,
              occurrenceStart: occ.start,
              occurrenceEnd: occ.end,
            });
          }
        }

        week.push({
          date: cellDate,
          dayNumber: cellDate.getDate(),
          isCurrentMonth: cellDate.getMonth() === month,
          isToday: cellDate.getTime() === today.getTime(),
          blocks,
        });
        current.setDate(current.getDate() + 1);
      }
      this.monthWeeks.push(week);
      // Stop if we've passed the month
      if (current.getMonth() !== month && current.getDate() > 7) break;
    }
  }

  private buildDayTimeline(): void {
    const dayStart = new Date(this.selectedDate);
    dayStart.setHours(0, 0, 0, 0);

    const items: DayTimeline[] = [];
    for (const entry of this.entries) {
      const occurrences = this.getEntryOccurrencesOnDay(entry, dayStart);
      for (const occ of occurrences) {
        items.push({
          playlistName: entry.playlist?.name || 'Playlist',
          colour: entry.colour,
          startTime: this.formatTimeInTz(occ.start),
          endTime: this.formatTimeInTz(occ.end),
          isRecurring: !!entry.rrule,
        });
      }
    }
    items.sort((a, b) => a.startTime.localeCompare(b.startTime));
    this.dayTimeline = items;
  }

  private getEntryOccurrencesOnDay(entry: ScheduleEntry, dayStart: Date): { start: Date; end: Date }[] {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const entryStart = new Date(entry.startTime);
    const entryEnd = new Date(entry.endTime);
    const duration = entryEnd.getTime() - entryStart.getTime();

    if (!entry.rrule) {
      // Non-recurring: check if it overlaps this day
      if (entryStart < dayEnd && entryEnd > dayStart) {
        return [{ start: entryStart, end: entryEnd }];
      }
      return [];
    }

    // For recurring entries, parse the RRULE to compute occurrences
    // Simple client-side expansion for display purposes
    const occurrences: { start: Date; end: Date }[] = [];
    const rule = this.parseSimpleRrule(entry.rrule);
    if (!rule) {
      // Fallback: show on original date
      if (entryStart < dayEnd && entryEnd > dayStart) {
        return [{ start: entryStart, end: entryEnd }];
      }
      return [];
    }

    // Check if this day matches the recurrence pattern
    if (this.doesDayMatchRrule(dayStart, entryStart, rule)) {
      const occStart = new Date(dayStart);
      occStart.setHours(entryStart.getHours(), entryStart.getMinutes(), entryStart.getSeconds());
      const occEnd = new Date(occStart.getTime() + duration);

      // Only include if the occurrence start is on or after the original entry start date
      if (occStart >= new Date(entryStart.getFullYear(), entryStart.getMonth(), entryStart.getDate())) {
        occurrences.push({ start: occStart, end: occEnd });
      }
    }

    return occurrences;
  }

  private parseSimpleRrule(rrule: string): { freq: string; byday?: string[] } | null {
    const parts = rrule.replace('RRULE:', '').split(';');
    const map: Record<string, string> = {};
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) map[key] = value;
    }
    if (!map['FREQ']) return null;
    return {
      freq: map['FREQ'],
      byday: map['BYDAY']?.split(','),
    };
  }

  private doesDayMatchRrule(day: Date, entryStart: Date, rule: { freq: string; byday?: string[] }): boolean {
    if (rule.freq === 'DAILY') return true;

    if (rule.freq === 'WEEKLY') {
      if (rule.byday && rule.byday.length > 0) {
        const dayMap: Record<number, string> = { 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA' };
        return rule.byday.includes(dayMap[day.getDay()]);
      }
      // Weekly with no BYDAY: same weekday as original
      return day.getDay() === entryStart.getDay();
    }

    return false;
  }

  getBlocksForDay(dayIndex: number): CalendarBlock[] {
    return this.calendarBlocks.filter(b => b.dayIndex === dayIndex);
  }

  getGapsForDay(dayIndex: number): GapBlock[] {
    return this.gapBlocks.filter(g => g.dayIndex === dayIndex);
  }

  // --- Navigation ---
  setView(mode: 'day' | 'week' | 'month'): void {
    this.viewMode = mode;
    this.loadEntries();
  }

  navigatePrev(): void {
    if (this.viewMode === 'day') {
      this.currentDate = new Date(this.currentDate.getTime() - 86400000);
    } else if (this.viewMode === 'week') {
      this.currentDate = new Date(this.currentDate.getTime() - 7 * 86400000);
    } else {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    }
    this.loadEntries();
  }

  navigateNext(): void {
    if (this.viewMode === 'day') {
      this.currentDate = new Date(this.currentDate.getTime() + 86400000);
    } else if (this.viewMode === 'week') {
      this.currentDate = new Date(this.currentDate.getTime() + 7 * 86400000);
    } else {
      this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    }
    this.loadEntries();
  }

  navigateToday(): void {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.loadEntries();
  }

  onScreenChange(): void {
    this.loadEntries();
  }

  onMonthDayClick(date: Date): void {
    this.currentDate = new Date(date);
    this.selectedDate = new Date(date);
    this.setView('day');
  }

  // --- Time Grid Click (create entry) ---
  onTimeGridClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    // Only handle clicks on hour slots (not on blocks)
    if (!target.classList.contains('hour-slot')) return;

    const dayColumn = target.closest('.day-column') as HTMLElement;
    if (!dayColumn) return;
    const dayIndex = parseInt(dayColumn.getAttribute('data-day-index') || '0', 10);
    const day = this.visibleDays[dayIndex];
    if (!day) return;

    const rect = dayColumn.getBoundingClientRect();
    const y = event.clientY - rect.top + dayColumn.scrollTop;
    const hour = Math.floor(y / this.hourHeight);
    const clampedHour = Math.max(0, Math.min(23, hour));

    const startDate = new Date(day);
    startDate.setHours(clampedHour, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(clampedHour + 1);

    this.openCreateModalWithTimes(startDate, endDate);
  }

  // --- Modal ---
  openCreateModal(): void {
    const now = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    this.openCreateModalWithTimes(start, end);
  }

  private openCreateModalWithTimes(start: Date, end: Date): void {
    this.editingEntry = null;
    this.modalPlaylistId = this.playlists.length > 0 ? this.playlists[0].id : '';
    this.modalStartDate = this.toDateInputValue(start);
    this.modalStartTime = this.toTimeInputValue(start);
    this.modalEndDate = this.toDateInputValue(end);
    this.modalEndTime = this.toTimeInputValue(end);
    this.modalColour = PRESET_COLOURS[Math.floor(Math.random() * PRESET_COLOURS.length)];
    this.modalRecurrence = 'none';
    this.modalWeekdays = [];
    this.modalError = '';
    this.showModal = true;
  }

  openEditModal(entry: ScheduleEntry): void {
    this.editingEntry = entry;
    this.modalPlaylistId = entry.playlistId;
    const start = new Date(entry.startTime);
    const end = new Date(entry.endTime);
    this.modalStartDate = this.toDateInputValue(start);
    this.modalStartTime = this.toTimeInputValue(start);
    this.modalEndDate = this.toDateInputValue(end);
    this.modalEndTime = this.toTimeInputValue(end);
    this.modalColour = entry.colour;

    if (!entry.rrule) {
      this.modalRecurrence = 'none';
      this.modalWeekdays = [];
    } else {
      const rule = this.parseSimpleRrule(entry.rrule);
      if (rule?.freq === 'DAILY') {
        this.modalRecurrence = 'daily';
      } else if (rule?.freq === 'WEEKLY' && rule.byday && rule.byday.length > 0) {
        this.modalRecurrence = 'weekdays';
        this.modalWeekdays = [...rule.byday];
      } else {
        this.modalRecurrence = 'weekly';
      }
    }

    this.modalError = '';
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingEntry = null;
  }

  toggleWeekday(value: string): void {
    const idx = this.modalWeekdays.indexOf(value);
    if (idx >= 0) {
      this.modalWeekdays.splice(idx, 1);
    } else {
      this.modalWeekdays.push(value);
    }
  }

  submitModal(): void {
    const startStr = `${this.modalStartDate}T${this.modalStartTime}:00`;
    const endStr = `${this.modalEndDate}T${this.modalEndTime}:00`;
    const start = new Date(startStr);
    const end = new Date(endStr);

    if (end <= start) {
      this.modalError = 'End time must be after start time.';
      return;
    }
    if (!this.modalPlaylistId) {
      this.modalError = 'Please select a playlist.';
      return;
    }

    const rrule = this.buildRrule();

    this.submitting = true;
    this.modalError = '';

    if (this.editingEntry) {
      const dto: UpdateScheduleEntryRequest = {
        playlistId: this.modalPlaylistId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        rrule: rrule || null,
        colour: this.modalColour,
      };
      this.scheduleService.update(this.orgId, this.editingEntry.id, dto).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.loadEntries();
          this.showToast('Schedule entry updated.', 'success');
        },
        error: (err) => {
          this.submitting = false;
          if (err.status === 409) {
            this.modalError = 'This time slot overlaps with an existing entry.';
            this.showToast('Overlap detected. Entry was not saved.', 'error');
          } else {
            this.modalError = err.error?.message || 'Failed to update entry.';
          }
        },
      });
    } else {
      const dto: CreateScheduleEntryRequest = {
        screenId: this.selectedScreenId,
        playlistId: this.modalPlaylistId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        rrule: rrule || undefined,
        colour: this.modalColour,
      };
      this.scheduleService.create(this.orgId, dto).subscribe({
        next: () => {
          this.submitting = false;
          this.closeModal();
          this.loadEntries();
          this.showToast('Schedule entry created.', 'success');
        },
        error: (err) => {
          this.submitting = false;
          if (err.status === 409) {
            this.modalError = 'This time slot overlaps with an existing entry.';
            this.showToast('Overlap detected. Entry was not saved.', 'error');
          } else {
            this.modalError = err.error?.message || 'Failed to create entry.';
          }
        },
      });
    }
  }

  deleteEntry(): void {
    if (!this.editingEntry) return;
    this.submitting = true;
    this.scheduleService.delete(this.orgId, this.editingEntry.id).subscribe({
      next: () => {
        this.submitting = false;
        this.closeModal();
        this.loadEntries();
        this.showToast('Schedule entry deleted.', 'success');
      },
      error: (err) => {
        this.submitting = false;
        this.modalError = err.error?.message || 'Failed to delete entry.';
      },
    });
  }

  private buildRrule(): string | undefined {
    if (this.modalRecurrence === 'none') return undefined;
    if (this.modalRecurrence === 'daily') return 'FREQ=DAILY';
    if (this.modalRecurrence === 'weekly') return 'FREQ=WEEKLY';
    if (this.modalRecurrence === 'weekdays' && this.modalWeekdays.length > 0) {
      return `FREQ=WEEKLY;BYDAY=${this.modalWeekdays.join(',')}`;
    }
    return undefined;
  }

  // --- Drag & Drop ---
  onBlockMouseDown(event: MouseEvent, block: CalendarBlock): void {
    // Ignore if it was a resize handle
    if ((event.target as HTMLElement).classList.contains('resize-handle')) return;
    event.preventDefault();
    event.stopPropagation();

    this.dragState = {
      entryId: block.entry.id,
      startY: event.clientY,
      originalTop: block.top,
      block,
    };
  }

  onResizeMouseDown(event: MouseEvent, block: CalendarBlock, edge: 'top' | 'bottom'): void {
    event.preventDefault();
    event.stopPropagation();

    this.resizeState = {
      entryId: block.entry.id,
      edge,
      startY: event.clientY,
      block,
      originalTop: block.top,
      originalHeight: block.height,
    };
  }

  onBlockClick(event: MouseEvent, block: CalendarBlock): void {
    // Only open edit if not dragging
    if (this.dragState || this.resizeState) return;
    event.stopPropagation();
    this.selectedDate = new Date(block.occurrenceStart);
    this.buildDayTimeline();
    this.openEditModal(block.entry);
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.dragState) {
      const dy = event.clientY - this.dragState.startY;
      const newTop = Math.max(0, this.dragState.originalTop + dy);
      this.dragState.block.top = newTop;
    }

    if (this.resizeState) {
      const dy = event.clientY - this.resizeState.startY;
      if (this.resizeState.edge === 'bottom') {
        const newHeight = Math.max(20, this.resizeState.originalHeight + dy);
        this.resizeState.block.height = newHeight;
      } else {
        const newTop = Math.max(0, this.resizeState.originalTop + dy);
        const newHeight = this.resizeState.originalHeight - (newTop - this.resizeState.originalTop);
        if (newHeight >= 20) {
          this.resizeState.block.top = newTop;
          this.resizeState.block.height = newHeight;
        }
      }
    }
  }

  private onMouseUp(): void {
    if (this.dragState) {
      const block = this.dragState.block;
      const moved = Math.abs(block.top - this.dragState.originalTop);
      if (moved > 5) {
        this.commitDragOrResize(block);
      }
      this.dragState = null;
    }

    if (this.resizeState) {
      const block = this.resizeState.block;
      const changed = Math.abs(block.height - this.resizeState.originalHeight) > 5 ||
                       Math.abs(block.top - this.resizeState.originalTop) > 5;
      if (changed) {
        this.commitDragOrResize(block);
      }
      this.resizeState = null;
    }
  }

  private commitDragOrResize(block: CalendarBlock): void {
    // Convert pixel position back to time
    const dayDate = this.visibleDays[block.dayIndex];
    if (!dayDate) return;

    const startMinutes = (block.top / this.hourHeight) * 60;
    const endMinutes = ((block.top + block.height) / this.hourHeight) * 60;

    const newStart = new Date(dayDate);
    newStart.setHours(0, 0, 0, 0);
    newStart.setMinutes(startMinutes);

    const newEnd = new Date(dayDate);
    newEnd.setHours(0, 0, 0, 0);
    newEnd.setMinutes(endMinutes);

    const dto: UpdateScheduleEntryRequest = {
      startTime: newStart.toISOString(),
      endTime: newEnd.toISOString(),
    };

    this.scheduleService.update(this.orgId, block.entry.id, dto).subscribe({
      next: () => {
        this.loadEntries();
        this.showToast('Entry moved.', 'success');
      },
      error: (err) => {
        if (err.status === 409) {
          this.showToast('Overlap detected. Move was reverted.', 'error');
        } else {
          this.showToast('Failed to move entry.', 'error');
        }
        this.loadEntries(); // Revert visual
      },
    });
  }

  // --- Toast ---
  showToast(message: string, type: 'error' | 'success'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage = '';
    }, 4000);
  }

  // --- Formatting helpers ---
  formatHour(hour: number): string {
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  formatDayHeader(day: Date): string {
    return day.toLocaleDateString(undefined, {
      timeZone: this.orgTimeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  formatBlockTime(date: Date): string {
    return date.toLocaleTimeString(undefined, {
      timeZone: this.orgTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  formatTimeInTz(date: Date): string {
    return date.toLocaleTimeString(undefined, {
      timeZone: this.orgTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  formatSidePanelDate(date: Date): string {
    return date.toLocaleDateString(undefined, {
      timeZone: this.orgTimeZone,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  isDayToday(day: Date): boolean {
    const today = new Date();
    return day.getFullYear() === today.getFullYear() &&
      day.getMonth() === today.getMonth() &&
      day.getDate() === today.getDate();
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as first day
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private toDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toTimeInputValue(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
