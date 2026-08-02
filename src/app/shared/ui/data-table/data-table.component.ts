import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SimpleDataTableColumn as DataTableColumn, TableActionConfig } from '../../models/common.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { formatInrCurrency } from '../../../utils/currency.utils';

export interface RowActionEvent<T> {
  readonly actionId: string;
  readonly row: T;
}

/**
 * Generic, reusable data table for any row shape.
 *
 * IMPORTANT (see /memories/angular-patterns.md): `T` is constrained with
 * `T extends object` (NOT `Record<string, unknown>`) so plain app DTOs
 * (Book, Party, Sale, ...) remain assignable. Every `@Input` that involves
 * `T` uses it directly (`rows: T[]`) so Angular's template type-checker can
 * infer `T` correctly; column keys are plain `string`, never `keyof T`.
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.css']
})
export class DataTableComponent<T extends object> {
  @Input({ required: true }) rows: T[] = [];
  @Input({ required: true }) columns: ReadonlyArray<DataTableColumn> = [];
  @Input() actions: ReadonlyArray<TableActionConfig> = [];
  @Input() emptyMessage = 'No records found.';
  @Input() isActionVisible?: (row: T, actionId: string) => boolean;
  @Input() rowKey?: (row: T) => string | number;

  @Output() rowAction = new EventEmitter<RowActionEvent<T>>();

  trackByRow = (index: number, row: T): string | number => {
    return this.rowKey ? this.rowKey(row) : index;
  };

  getCellValue(row: T, key: string): unknown {
    return (row as unknown as Record<string, unknown>)[key];
  }

  getFormattedValue(row: T, column: DataTableColumn): string {
    const rawValue = this.getCellValue(row, column.key);
    if (column.formatter) {
      return column.formatter(rawValue);
    }
    if (column.type === 'currency') {
      return formatInrCurrency(typeof rawValue === 'number' ? rawValue : Number(rawValue));
    }
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return '—';
    }
    return String(rawValue);
  }

  getStatusValue(row: T, column: DataTableColumn): string {
    const rawValue = this.getCellValue(row, column.key);
    return rawValue === null || rawValue === undefined ? '' : String(rawValue);
  }

  isVisible(row: T, actionId: string): boolean {
    return this.isActionVisible ? this.isActionVisible(row, actionId) : true;
  }

  onActionClick(row: T, actionId: string): void {
    this.rowAction.emit({ actionId, row });
  }
}
