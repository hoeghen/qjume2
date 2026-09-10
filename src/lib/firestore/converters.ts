import type {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Customer, Queue, Shop, Station, Ticket } from '../../types/index.js';

/**
 * Firestore hands back `DocumentData`; these converters are the one place that
 * assertion is made, so components never cast. They do not validate — schema
 * enforcement lives in the security rules and Cloud Functions.
 */
function converterFor<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (value: T) => value as DocumentData,
    fromFirestore: (snapshot: QueryDocumentSnapshot) => snapshot.data() as T,
  };
}

export const shopConverter = converterFor<Shop>();
export const queueConverter = converterFor<Queue>();
export const ticketConverter = converterFor<Ticket>();
export const stationConverter = converterFor<Station>();
export const customerConverter = converterFor<Customer>();
