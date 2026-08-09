import { Book } from '../shared/models/book.model';
import { Party } from '../shared/models/party.model';

type BookKeyFields = Pick<Book, 'title' | 'publisher'>;
type PartyKeyFields = Pick<Party, 'name' | 'phone' | 'type'>;

const normalize = (value: string | null | undefined): string => (value || '').trim().toLowerCase();

/** Books are duplicates when Title and Publisher match, regardless of case/whitespace. */
export function isDuplicateBook(a: BookKeyFields, b: BookKeyFields): boolean {
  return normalize(a.title) === normalize(b.title) && normalize(a.publisher) === normalize(b.publisher);
}

/** Parties are duplicates when Name, Mobile Number, and Type all match. */
export function isDuplicateParty(a: PartyKeyFields, b: PartyKeyFields): boolean {
  return (
    normalize(a.name) === normalize(b.name) &&
    normalize(a.phone) === normalize(b.phone) &&
    normalize(a.type) === normalize(b.type)
  );
}

export function findDuplicateBook(book: BookKeyFields, existing: ReadonlyArray<BookKeyFields>): boolean {
  return existing.some((b) => isDuplicateBook(book, b));
}

export function findDuplicateParty(party: PartyKeyFields, existing: ReadonlyArray<PartyKeyFields>): boolean {
  return existing.some((p) => isDuplicateParty(party, p));
}

/**
 * Splits a batch of new books (e.g. a bulk import file) into unique vs duplicate rows.
 * Checks against already-saved books AND against earlier rows in the same batch, so
 * repeated rows within one file are also caught.
 */
export function partitionDuplicateBooks(
  newBooks: ReadonlyArray<Book>,
  existingBooks: ReadonlyArray<BookKeyFields>
): { unique: Book[]; duplicates: Book[] } {
  const unique: Book[] = [];
  const duplicates: Book[] = [];
  const seen: BookKeyFields[] = [...existingBooks];

  for (const book of newBooks) {
    if (findDuplicateBook(book, seen)) {
      duplicates.push(book);
    } else {
      unique.push(book);
      seen.push(book);
    }
  }

  return { unique, duplicates };
}

/**
 * Splits a batch of new parties (e.g. a bulk import file) into unique vs duplicate rows.
 * Checks against already-saved parties AND against earlier rows in the same batch.
 */
export function partitionDuplicateParties(
  newParties: ReadonlyArray<Party>,
  existingParties: ReadonlyArray<PartyKeyFields>
): { unique: Party[]; duplicates: Party[] } {
  const unique: Party[] = [];
  const duplicates: Party[] = [];
  const seen: PartyKeyFields[] = [...existingParties];

  for (const party of newParties) {
    if (findDuplicateParty(party, seen)) {
      duplicates.push(party);
    } else {
      unique.push(party);
      seen.push(party);
    }
  }

  return { unique, duplicates };
}
