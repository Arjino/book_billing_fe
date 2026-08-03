import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchableSelectOption<T = any> {
  value: T;
  label: string;
  sublabel?: string;
}

/**
 * Typeable/searchable dropdown that behaves like a plain <select> for
 * [(ngModel)] binding purposes (bind directly to a value of any type —
 * object, id, or string) but lets the user filter options by typing.
 * Replaces the plain <select> fields across the purchase/sale forms.
 */
@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ]
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() options: SearchableSelectOption[] = [];
  @Input() placeholder = 'Search...';
  @Input() emptyMessage = 'No matches found';
  @Input() compareWith: (a: any, b: any) => boolean = (a, b) => a === b;
  @Output() selected = new EventEmitter<SearchableSelectOption | null>();

  disabled = false;
  open = false;
  query = '';
  activeIndex = -1;
  value: any = null;

  private onChangeFn: (value: any) => void = () => {};
  private onTouchedFn: () => void = () => {};

  get filteredOptions(): SearchableSelectOption[] {
    const term = this.query.trim().toLowerCase();
    if (!term) return this.options;
    return this.options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        (option.sublabel || '').toLowerCase().includes(term)
    );
  }

  get selectedOption(): SearchableSelectOption | undefined {
    return this.options.find((option) => this.compareWith(option.value, this.value));
  }

  get displayValue(): string {
    return this.open ? this.query : (this.selectedOption?.label ?? '');
  }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onFocus(): void {
    if (this.disabled) return;
    this.open = true;
    this.query = '';
    this.activeIndex = -1;
  }

  onBlur(): void {
    // Delay closing so a mousedown on an option (which fires before blur's
    // click would) can still register as a selection.
    setTimeout(() => {
      this.open = false;
      this.onTouchedFn();
    }, 150);
  }

  onInput(rawValue: string): void {
    this.query = rawValue;
    this.open = true;
    this.activeIndex = -1;
  }

  selectOption(option: SearchableSelectOption): void {
    this.value = option.value;
    this.onChangeFn(this.value);
    this.selected.emit(option);
    this.query = '';
    this.open = false;
  }

  clearSelection(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.value = null;
    this.query = '';
    this.onChangeFn(null);
    this.selected.emit(null);
  }

  onKeydown(event: KeyboardEvent): void {
    const opts = this.filteredOptions;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open = true;
      this.activeIndex = Math.min(this.activeIndex + 1, opts.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
    } else if (event.key === 'Enter') {
      if (this.open && this.activeIndex >= 0 && opts[this.activeIndex]) {
        event.preventDefault();
        this.selectOption(opts[this.activeIndex]);
      }
    } else if (event.key === 'Escape') {
      this.open = false;
    }
  }
}
