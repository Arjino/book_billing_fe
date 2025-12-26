import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderBy',
  standalone: true
})
export class OrderByPipe implements PipeTransform {
  transform<T>(array: T[] | null, field: keyof T, ascending: boolean = true): T[] {
    if (!array || !Array.isArray(array) || array.length <= 1) {
      return array || [];
    }

    const sorted = [...array].sort((a, b) => {
      const valueA = a[field];
      const valueB = b[field];

      if (valueA === null || valueA === undefined) return 1;
      if (valueB === null || valueB === undefined) return -1;

      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return ascending ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return ascending ? valueA - valueB : valueB - valueA;
      }

      return 0;
    });

    return sorted;
  }
}
