import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  DataTableColumn,
  DataTableRowAction,
  DataTableRowActionEvent,
  DataTableStatusStyle
} from './data-table.types';

/**
 * Generic, dumb data table. Consumers pass strictly typed `columns`/`rows`
 * and receive `rowAction`/`rowClick` outputs — no fetching or business
 * logic lives here.
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent<T extends object> {
  @Input({ required: true }) columns: DataTableColumn<T>[] = [];
  @Input({ required: true }) rows: T[] = [];
  @Input() actions: DataTableRowAction[] = [];
  @Input() statusStyles: Record<string, DataTableStatusStyle> = {};
  @Input() emptyMessage = 'No records found.';
  /** Compact layout: tighter cell padding/font so the table fits in a smaller panel. */
  @Input() dense = false;

  @Output() readonly rowAction = new EventEmitter<DataTableRowActionEvent<T>>();
  @Output() readonly rowClick = new EventEmitter<T>();

  getCellValue(row: T, column: DataTableColumn<T>): unknown {
    // `T` is only constrained to `object` (plain interfaces like `RecentInvoice`
    // have no index signature, so they aren't assignable to `Record<string, unknown>`).
    // The cast below is safe: at runtime every object is string-keyed.
    return (row as unknown as Record<string, unknown>)[column.key];
  }

  /** Coerces a cell value to a finite number for the 'number'/'currency' pipes. */
  getNumberValue(row: T, column: DataTableColumn<T>): number {
    const value = this.getCellValue(row, column);
    const numericValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  /** Coerces a cell value to a type the 'date' pipe accepts. */
  getDateValue(row: T, column: DataTableColumn<T>): string | number | Date {
    const value = this.getCellValue(row, column);
    if (value instanceof Date || typeof value === 'string' || typeof value === 'number') {
      return value;
    }
    return '';
  }

  getStatusStyle(value: unknown): DataTableStatusStyle {
    const key = String(value ?? '');
    return this.statusStyles[key] ?? { variant: 'default', label: key };
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  onActionClick(event: MouseEvent, actionId: string, row: T): void {
    event.stopPropagation();
    this.rowAction.emit({ actionId, row });
  }

  trackByIndex(index: number): number {
    return index;
  }
}
